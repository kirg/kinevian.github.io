const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./harness.cjs');

test('strict spoken numbers accept complete EN/DE answers and reject altered digits', () => {
    const app = setup();
    for (const [text, n] of [['twenty-four', 24], ['one hundred and forty-four',144], ['12.',12]]) assert.equal(app.run('parseSpokenNumber(' + JSON.stringify(text) + ')'), n);
    for (const text of ['-12','12.0','1 2','12abc','six or eight','hundertapples']) assert.equal(app.run('parseSpokenNumber(' + JSON.stringify(text) + ')'), null);
    app.run("state.language='de-DE'");
    for (const [text,n] of [['zwölf',12],['vierundzwanzig',24],['einhundertvierundvierzig',144]]) assert.equal(app.run('parseSpokenNumber(' + JSON.stringify(text) + ')'), n);
});
test('keypad works without synthesis or recognition, including blank submit and backspace', () => {
    const app = setup({noSynthesis:true});
    app.run('startGame(); checkAnswer(true)');
    assert.equal(app.state.questionsCount,0);
    assert.equal(app.state.usingKeypad,true);
    app.run('addKey(1); addKey(2); addKey(3); addKey(4); backspaceKey()');
    assert.equal(app.state.keypadInput,'12');
});
test('a question scores once and editing is locked during feedback', () => {
    const app = setup();
    app.run('startGame(); checkAnswer(false,state.currentQ.ans); checkAnswer(false,state.currentQ.ans); addKey(9)');
    assert.equal(app.state.score,10);
    assert.equal(app.state.questionsCount,1);
    assert.equal(app.state.keypadInput,'');
    app.advance(1500);
    assert.equal(app.state.answerLocked,false);
});
test('abort and restart discard timers and speech from the previous game', () => {
    const app = setup();
    app.run('startGame(); checkAnswer(false,state.currentQ.ans); quitGame(); startGame()');
    const id=app.state.questionId;
    app.advance(3000);
    assert.equal(app.state.questionId,id);
    assert.equal(app.state.score,0);
    assert.equal(app.state.questionsCount,0);
});
test('count mission records 20 division attempts and exact accuracy', () => {
    const app = setup();
    app.run("setMode('test'); setTestType('count'); setOperation('divide'); startGame()");
    for (let i=0;i<20;i++) {
        const q=app.state.currentQ;
        assert.equal(q.displayN1/q.displayN2,q.ans);
        assert.equal(app.el('statusValue').innerText,(i+1)+'/20');
        app.run(i%2 ? 'checkAnswer(false,999)' : 'checkAnswer(false,state.currentQ.ans)');
        app.advance(2000);
    }
    assert.equal(app.state.isPlaying,false);
    assert.equal(app.state.questionsCount,20);
    assert.equal(app.el('finalAccuracy').innerText,'50%');
    assert.equal(app.el('finalScore').innerText,'100');
});
test('timer pauses and resumes the remaining active time', () => {
    const app = setup();
    app.run("setMode('test'); startGame()");
    app.advance(10000);
    app.run('pauseGame()');
    assert.equal(app.state.remainingMs,50000);
    app.advance(70000);
    assert.equal(app.state.isPlaying,true);
    app.run('resumeGame()');
    app.advance(50000);
    assert.equal(app.state.isPlaying,false);
    assert.equal(app.el('statusValue').innerText,'0s');
});
test('late timed answers cannot score before the next timer callback', () => {
    const app=setup();
    app.run("setMode('test'); startGame(); state.timerEndAt=-1; checkAnswer(false,state.currentQ.ans)");
    assert.equal(app.state.score,0);
    assert.equal(app.state.isPlaying,false);
});
test('background pause during feedback resumes exactly one new question', () => {
    const app=setup();
    app.run('startGame(); checkAnswer(false,state.currentQ.ans)');
    const id=app.state.questionId;
    app.document.visibilityState='hidden';
    app.document.dispatchEvent({type:'visibilitychange'});
    assert.equal(app.state.paused,true);
    app.advance(3000);
    app.document.visibilityState='visible';
    app.run('resumeGame()');
    assert.equal(app.state.questionId,id+1);
    app.advance(3000);
    assert.equal(app.state.questionId,id+1);
});
test('practice finish retains old badges and awards the exact threshold', () => {
    const app=setup({storage:{galactic_badges:'["pilot"]'}});
    app.run('startGame(); state.score=500; state.questionsCount=1; state.correctCount=1; endGame()');
    assert.deepEqual(app.state.badges,['pilot','commander']);
    assert.equal(app.el('finalAccuracy').innerText,'100%');
    assert.equal(app.storage.get('galactic_badges'),'["pilot","commander"]');
});
test('bad or unavailable saved data does not prevent awarding badges', () => {
    for (const options of [{storage:{galactic_badges:'null'}},{storage:{galactic_badges:'{"pilot":true}'}},{storage:{galactic_badges:'invalid'}},{storageDenied:true}]) {
        const app=setup(options);
        app.run('startGame(); state.score=200; endGame()');
        assert.deepEqual(app.state.badges,['pilot']);
        if(options.storageDenied) assert.match(app.el('resultStorageNotice').textContent,/cannot be saved/);
    }
});
test('single target keeps factors 11/12 and cannot repeat the previous fact', () => {
    const app=setup();
    app.run('state.practiceNums=[2]; startGame(); Math.random=()=>.999; nextQuestion()');
    assert.equal(app.state.currentQ.rawN2,12);
    app.run('nextQuestion()');
    assert.equal(app.state.currentQ.rawN2,11);
});
test('late recognizer callbacks are ignored after restart and keypad switch', () => {
    const app=setup({voice:true});
    app.run("startGame(); state.usingKeypad=false; state.sound=false; cancelSpeech(); micRequestStart('user')");
    const rec=app.requests.at(-1);
    const callback=rec.onresult;
    const result=[{transcript:String(app.state.currentQ.ans)}]; result.isFinal=true;
    app.run('quitGame(); startGame()');
    callback({resultIndex:0,results:[result]});
    assert.equal(app.state.score,0);
    app.run("state.usingKeypad=false; cancelSpeech(); micRequestStart('user'); openKeypad()");
    app.requests.at(-1).onresult({resultIndex:0,results:[result]});
    assert.equal(app.state.score,0);
});
test('microphone permission denial falls back without restart storms', () => {
    const app=setup({voice:true});
    app.run("startGame(); state.usingKeypad=false; cancelSpeech(); micRequestStart('user')");
    const rec=app.requests.at(-1);
    rec.error('not-allowed');
    assert.equal(app.state.usingKeypad,true);
    assert.equal(app.state.micIntent,false);
    const count=app.requests.length;
    app.advance(10000);
    assert.equal(app.requests.length,count);
});
test('settings and German labels persist alongside existing badges', () => {
    const app=setup();
    app.run("toggleLanguage(); setMode('test'); setOperation('divide')");
    assert.equal(app.el('lblTwenty').innerText,'20 Fragen');
    const reloaded=setup({storage:Object.fromEntries(app.storage)});
    assert.equal(reloaded.state.language,'de-DE');
    assert.equal(reloaded.state.operation,'divide');
    assert.equal(reloaded.state.mode,'test');
});

test('iPhone voice switch starts inside the tap and cancels question speech', () => {
    const app = setup({voice:true});
    app.run('startGame()');
    assert.equal(app.speech.length, 1, 'first question is spoken within Start, without a timer');
    assert.equal(app.state.speaking, true);
    app.run('toggleKeypad()');
    assert.equal(app.state.speaking, false);
    assert.equal(app.requests.at(-1).starts, 1);
    assert.equal(app.state.micState, 'listening');
    app.requests.at(-1).result(String(app.state.currentQ.ans));
    assert.equal(app.state.score, 10);
});

test('iPhone does not reopen recognition from silence or speech callbacks', () => {
    const app = setup({voice:true});
    app.run('startGame(); toggleKeypad()');
    const rec = app.requests.at(-1);
    rec.onend();
    app.advance(10000);
    assert.equal(rec.starts, 1);
    assert.equal(app.state.micIntent, false);
    assert.equal(app.state.micState, 'off');
    app.el('micBtn').click();
    assert.equal(rec.starts, 2, 'a new tap can start again');
    app.run('nextQuestion()');
    app.advance(10000);
    assert.equal(rec.starts, 2);
});

test('desktop silence restarts remain bounded', () => {
    const app = setup({voice:true, userAgent:'Chrome'});
    app.run('state.sound=false; startGame(); toggleKeypad()');
    const rec = app.requests.at(-1);
    for (let i=0; i<4; i++) { rec.onend(); app.advance(250); }
    assert.equal(rec.starts, 3);
    assert.equal(app.state.micIntent, false);
});

test('thrown recognition starts never display a false listening state', () => {
    for (const startError of ['NotAllowedError', 'SecurityError', 'InvalidStateError']) {
        const app = setup({voice:true, startError});
        app.run('startGame(); toggleKeypad()');
        assert.equal(app.state.usingKeypad, true);
        assert.equal(app.state.micIntent, false);
        assert.notEqual(app.state.micState, 'listening');
        app.run('addKey(1)');
        assert.equal(app.state.keypadInput, '1');
    }
});

test('a recognizer that never starts returns to a usable keypad', () => {
    const app = setup({voice:true, delayedStart:true});
    app.run('startGame(); toggleKeypad()');
    const rec = app.requests.at(-1);
    assert.equal(app.state.micState, 'starting');
    app.advance(10000);
    assert.equal(app.state.usingKeypad, true);
    assert.equal(app.state.micIntent, false);
    rec.onstart();
    rec.result(String(app.state.currentQ.ans));
    assert.equal(app.state.score, 0, 'late callbacks after fallback cannot submit');
});

test('iPhone tap while recognition is stopping does not wait for a lost onend', () => {
    const app = setup({voice:true, missingStopEnd:true});
    app.run('startGame(); toggleKeypad()');
    const old = app.requests.at(-1);
    app.el('micBtn').click();
    assert.equal(app.state.micState, 'stopping');
    app.el('micBtn').click();
    assert.notEqual(app.requests.at(-1), old);
    assert.equal(app.state.micState, 'listening');
});

test('resuming a mission reactivates an interrupted iPhone AudioContext', () => {
    const app = setup();
    app.run("window.AudioContext=class {constructor(){this.state='running';this.resumes=0} resume(){this.resumes++;this.state='running';return Promise.resolve()}}; startGame(); pauseGame(); audioCtx.state='interrupted'; resumeGame()");
    assert.equal(app.run('audioCtx.resumes'), 1);
});

test('speech fallback cancels stalled synthesis and releases the utterance', () => {
    const app = setup({voice:true});
    let cancels = 0;
    app.window.speechSynthesis.cancel = () => cancels++;
    app.run('startGame()');
    assert.equal(app.run('state.activeUtterance.text'), app.state.currentQ.speech);
    const before = cancels;
    app.advance(10000);
    assert.ok(cancels > before);
    assert.equal(app.state.activeUtterance, null);
    assert.equal(app.state.speaking, false);
});

test('an installed app update waits until the active mission returns to base', () => {
    const app = setup({serviceWorker:true, controlled:true});
    app.run('startGame()');
    app.serviceWorker.dispatchEvent({type:'controllerchange'});
    assert.equal(app.window.reloads, 0);
    app.run('quitGame()');
    assert.equal(app.window.reloads, 1);
});

test('first installation does not reload but an idle update does', () => {
    const app = setup({serviceWorker:true});
    app.serviceWorker.dispatchEvent({type:'controllerchange'});
    assert.equal(app.window.reloads, 0);
    app.serviceWorker.dispatchEvent({type:'controllerchange'});
    assert.equal(app.window.reloads, 1);
});

