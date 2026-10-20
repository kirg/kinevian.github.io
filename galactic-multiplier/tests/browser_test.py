"""Run with Playwright against the real HTML; speech services are mocked."""
import functools
import base64
import os
import re
import socket
from pathlib import Path
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
STUB = """
window.__recognitions = [];
window.SpeechRecognition = class {
  constructor() { window.__recognitions.push(this); }
  start() { this.onstart?.(); }
  stop() { this.onend?.(); }
  abort() { this.onend?.(); }
};
"""

class Handler(SimpleHTTPRequestHandler):
    offline = False
    def do_GET(self):
        if self.offline:
            # Drop the server connection to exercise worker network failures in
            # both engines without depending on emulated offline navigation.
            self.close_connection = True
            try:
                self.connection.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self.connection.close()
            return
        super().do_GET()
    def log_message(self, *_): pass

class BrowserChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.pw = sync_playwright().start()
        cls.browser = getattr(cls.pw, os.environ.get("BROWSER", "chromium")).launch()
        cls.url = "http://127.0.0.1:" + str(cls.server.server_port) + "/galactic-multiplier/"

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width":390,"height":664}, user_agent=UA, has_touch=True)
        self.context.add_init_script(STUB)
        self.page = self.context.new_page()
        self.errors = []
        self.external = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("request", lambda request: self.external.append(request.url) if not request.url.startswith("http://127.0.0.1") else None)
        self.page.goto(self.url)
        self.page.locator("#numGrid button").first.wait_for()
        self.page.evaluate("document.fonts.ready")
        self.page.locator("#soundToggle").uncheck()

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.external, [])
        self.context.close()

    def assert_no_overflow(self):
        self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))

    def capture_preview(self, name):
        directory = Path(os.environ.get("SCREENSHOT_DIR", "/tmp/galactic-screenshots"))
        directory.mkdir(parents=True, exist_ok=True)
        engine = os.environ.get("BROWSER", "chromium")
        preview = self.page.screenshot(type="jpeg", quality=45, full_page=False)
        (directory / (engine + "-" + name + ".jpg")).write_bytes(preview)
        # Optional log previews are useful when an artifact downloader is unavailable.
        if os.environ.get("CAPTURE_PREVIEWS") == "1" and name in {"title-en", "question-reduced", "answer-small"}:
            print("VISUAL_PREVIEW:" + engine + "-" + name + ":" + base64.b64encode(preview).decode(), flush=True)

    def assert_in_viewport(self, selector):
        box = self.page.locator(selector).bounding_box()
        self.assertIsNotNone(box, selector)
        viewport = self.page.viewport_size
        self.assertGreaterEqual(box["y"], -1, selector)
        self.assertLessEqual(box["y"] + box["height"], viewport["height"] + 1, selector)
        self.assertGreaterEqual(box["x"], -1, selector)
        self.assertLessEqual(box["x"] + box["width"], viewport["width"] + 1, selector)

    def test_question_visible_without_animation(self):
        for mode in ["reduced", "paused"]:
            with self.subTest(mode=mode):
                self.page.emulate_media(reduced_motion="reduce" if mode == "reduced" else "no-preference")
                if mode == "paused":
                    self.page.add_style_tag(content=".pop-in {animation-play-state:paused !important;animation-duration:1000s !important}")
                self.page.evaluate("startGame()")
                self.page.wait_for_timeout(150)
                self.capture_preview("question-" + mode)
                for selector in ["#num1", "#num2"]:
                    appearance = self.page.locator(selector).evaluate("""el => ({
                        text:el.textContent, opacity:Number(getComputedStyle(el).opacity),
                        visibility:getComputedStyle(el).visibility
                    })""")
                    self.assertRegex(appearance["text"], r"^\d+$")
                    self.assertEqual(appearance["opacity"], 1, selector + " must not depend on animation to become visible")
                    self.assertEqual(appearance["visibility"], "visible")
                self.page.evaluate("quitGame()")

    def test_title_has_readable_fill(self):
        for language in ["en", "de"]:
            with self.subTest(language=language):
                if language == "de":
                    self.page.locator("#langBtn").click()
                self.capture_preview("title-" + language)
                style = self.page.locator("#appTitle").evaluate("""el => {
                    const s=getComputedStyle(el);
                    return {color:s.getPropertyValue('-webkit-text-fill-color') || s.color, shadow:s.textShadow};
                }""")
                channels = [float(n) for n in re.findall(r"[\d.]+", style["color"])]
                self.assertGreaterEqual(channels[3] if len(channels) == 4 else 1, .99, "Title needs solid letter fill")
                def luminance(rgb):
                    values = [v / 255 for v in rgb[:3]]
                    values = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
                    return sum(a * b for a, b in zip(values, [.2126, .7152, .0722]))
                self.assertGreaterEqual((luminance(channels) + .05) / (luminance([15,23,42]) + .05), 4.5)
                shadow_pixels = [float(n) for n in re.findall(r"(-?[\d.]+)px", style["shadow"])]
                self.assertLessEqual(max(shadow_pixels, default=0), 8, "Glow must not overwhelm letter edges")

    def test_answer_stays_visible_when_submitting_from_keypad(self):
        self.page.clock.install()
        for width, height in [(320,568), (390,664), (844,390)]:
            with self.subTest(width=width,height=height):
                self.page.set_viewport_size({"width":width,"height":height})
                self.page.evaluate("state.practiceNums=[12]; startGame(); state.lastQuestionKey=null; Math.random=()=>.999; nextQuestion()")
                self.assertEqual(self.page.evaluate("state.currentQ.ans"), 144)
                for digit in [1,4,4]:
                    self.page.locator('#keypad button[onclick="addKey(' + str(digit) + ')"]').tap()
                self.page.locator('#keypad button[onclick="checkAnswer(true)"]').tap()
                if width == 320:
                    self.capture_preview("answer-small")
                self.assertEqual(self.page.locator("#userAnswerDisplay").inner_text(), "144")
                self.assertEqual(self.page.locator("#scoreDisplay").inner_text(), "10")
                self.assert_in_viewport("#questionBox")
                self.assert_in_viewport("#userAnswerDisplay")
                answer = self.page.locator("#userAnswerDisplay").bounding_box()
                keypad = self.page.locator("#keypad").bounding_box()
                if height > width:
                    self.assertLessEqual(answer["y"] + answer["height"], keypad["y"])
                self.page.evaluate("quitGame()")

    def test_mobile_layout_and_touch(self):
        directory = Path(os.environ.get("SCREENSHOT_DIR", "/tmp/galactic-screenshots"))
        directory.mkdir(parents=True, exist_ok=True)
        for width,height in [(320,568),(375,667),(390,664),(393,852),(430,932),(844,390),(1280,800)]:
            with self.subTest(width=width,height=height):
                self.page.set_viewport_size({"width":width,"height":height})
                self.page.locator("#langBtn").click()
                self.assert_no_overflow()
                title = self.page.locator("#appTitle").bounding_box()
                language = self.page.locator("#langBtn").bounding_box()
                self.assertGreaterEqual(title["y"],language["y"]+language["height"])
                self.page.evaluate("startGame()")
                self.assert_no_overflow()
                self.assertEqual(self.page.evaluate("getComputedStyle(document.body).overflowY"),"auto")
                self.assertEqual(self.page.locator("#keypad").evaluate("el => getComputedStyle(el).position"),"relative")
                answer = self.page.locator("#userAnswerDisplay").bounding_box()
                keypad = self.page.locator("#keypad").bounding_box()
                if height > width:
                    self.assertLessEqual(answer["y"]+answer["height"],keypad["y"])
                for button in self.page.locator("#keypad .key-btn").all():
                    self.assertGreaterEqual(button.bounding_box()["height"],44)
                self.page.locator('#keypad button[onclick="addKey(1)"]').tap()
                self.assertEqual(self.page.locator("#userAnswerDisplay").inner_text(),"1")
                self.page.screenshot(path=str(directory/(os.environ.get("BROWSER","chromium")+"-"+str(width)+"x"+str(height)+".png")),full_page=True)
                self.page.evaluate("quitGame()")

    def test_duplicate_submission_and_restart(self):
        self.page.clock.install()
        self.page.evaluate("startGame(); checkAnswer(true)")
        self.assertEqual(self.page.evaluate("state.questionsCount"),0)
        self.page.evaluate("checkAnswer(false,state.currentQ.ans); checkAnswer(false,state.currentQ.ans)")
        self.assertEqual(self.page.locator("#scoreDisplay").inner_text(),"10")
        self.assertTrue(self.page.locator('#keypad button[onclick="checkAnswer(true)"]').is_disabled())
        self.page.evaluate("quitGame(); startGame()")
        question = self.page.evaluate("state.questionId")
        self.page.clock.run_for(3000)
        self.assertEqual(self.page.evaluate("state.questionId"),question)
        self.assertEqual(self.page.locator("#scoreDisplay").inner_text(),"0")

    def test_division_and_count(self):
        self.page.clock.install()
        self.page.evaluate("setMode('test'); setTestType('count'); setOperation('divide'); startGame()")
        for i in range(20):
            self.assertEqual(self.page.locator("#statusValue").inner_text(),str(i+1)+"/20")
            self.assertTrue(self.page.evaluate("state.currentQ.displayN1/state.currentQ.displayN2===state.currentQ.ans"))
            self.page.evaluate("checkAnswer(false,state.currentQ.ans)")
            self.page.clock.run_for(1600)
        self.assertTrue(self.page.locator("#gameOverScreen").is_visible())
        self.assertEqual(self.page.locator("#finalAccuracy").inner_text(),"100%")
        self.assertEqual(self.page.locator("#finalScore").inner_text(),"580")
        self.assertFalse(self.page.locator("#keypad").is_visible())

    def test_pause_and_timer(self):
        self.page.clock.install()
        self.page.evaluate("setMode('test'); startGame()")
        self.page.clock.run_for(10000)
        self.page.evaluate("pauseGame()")
        self.assertEqual(self.page.locator("#statusValue").inner_text(),"50s")
        self.page.clock.run_for(70000)
        self.assertTrue(self.page.locator("#pauseScreen").is_visible())
        self.page.locator("#btnResume").click()
        self.page.clock.run_for(50100)
        self.assertTrue(self.page.locator("#gameOverScreen").is_visible())

    def test_storage_and_language(self):
        self.page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
        self.page.reload()
        self.page.locator("#langBtn").click()
        self.page.evaluate("startGame(); state.score=200; endGame()")
        self.assertTrue(self.page.locator("#gameOverScreen").is_visible())
        self.assertIn("gespeichert",self.page.locator("#resultStorageNotice").inner_text())
        self.assertIn("Raketenpilot",self.page.locator("#rankTitle").inner_text())

    def test_microphone_denial(self):
        self.page.evaluate("startGame(); state.usingKeypad=false; cancelSpeech(); micRequestStart('user')")
        self.page.evaluate("window.__recognitions.at(-1).onerror({error:'not-allowed'})")
        self.assertTrue(self.page.locator("#keypad").is_visible())
        self.assertFalse(self.page.evaluate("state.micIntent"))

    def test_offline_shell(self):
        self.page.evaluate("navigator.serviceWorker.ready")
        self.page.wait_for_function("navigator.serviceWorker.controller !== null")
        Handler.offline = True
        try:
            self.page.goto(self.url+"?offline=1",wait_until="domcontentloaded")
            self.page.wait_for_function("typeof startGame==='function'")
            self.page.evaluate("startGame(); addKey(1)")
            self.assertEqual(self.page.locator("#userAnswerDisplay").inner_text(),"1")
        finally:
            Handler.offline = False

if __name__ == "__main__":
    unittest.main()
