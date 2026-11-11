#!/usr/bin/env python3
"""Check WordWise card files pasted from ChatGPT / Gemini / Claude, and merge good cards.

Usage:
  python3 validate.py drafts/de/de-wl3-007.gemini.jsonl            # check only
  python3 validate.py drafts/de/*.reviewed.jsonl --merge content/   # check, then merge valid cards
  python3 validate.py FILE --fix-prompt                             # print a "fix these cards" message to paste back

The input may be the raw reply: code fences and blank lines are ignored.
Merging writes content/<lang>.jsonl, one card per id (newer files replace older cards).
Only the Python standard library is needed.
"""
import argparse
import json
import re
import sys
from pathlib import Path

LANGS = {"en", "de", "fr"}
POS = {"noun", "verb", "adjective", "adverb", "preposition", "conjunction",
       "pronoun", "interjection", "phrase"}
CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}
BRIDGE_TYPES = {"cognate", "false_friend", "shared_root", "literal"}
MNEMONIC_TYPES = {"sound", "image", "story", "bridge", "morphology"}
REQUIRED = ["id", "lang", "lemma", "pos", "wl", "cefr", "themes", "syllables", "ipa",
            "grammar", "senses", "etymology", "family", "synonyms", "antonyms",
            "collocations", "bridges", "mnemonics", "watch_out", "distractors",
            "cloze", "image_prompt", "flags"]
OPTIONAL = {"review", "source", "emoji", "_errors"}
DE_ARTICLE = {"m": "der", "f": "die", "n": "das"}
CASES = ["nom", "acc", "dat", "gen"]
TARGET = re.compile(r"\[\[([^\[\]]+)\]\]")


def words(text):
    return len(re.findall(r"[\w'’-]+", text or ""))


def check_card(c, seen):
    """Return (errors, warnings) for one card."""
    e, w = [], []
    for k in REQUIRED:
        if k not in c:
            e.append(f"missing field '{k}'")
    for k in c:
        if k not in REQUIRED and k not in OPTIONAL:
            w.append(f"unknown field '{k}'")
    if e:
        return e, w

    lang, pos, lemma, wl = c["lang"], c["pos"], c["lemma"], c["wl"]
    others = sorted(LANGS - {lang})
    if lang not in LANGS:
        e.append(f"lang must be one of {sorted(LANGS)}")
    if pos not in POS:
        e.append(f"pos '{pos}' not allowed")
    if not isinstance(wl, int) or not 1 <= wl <= 12:
        e.append("wl must be an integer 1-12")
        wl = 12
    if c["cefr"] not in CEFR:
        e.append("cefr must be A1-C2")
    want_id = f"{lang}:{str(lemma).lower().replace(' ', '_')}:{pos}"
    if c["id"] != want_id:
        e.append(f"id should be '{want_id}'")
    if c["id"] in seen:
        e.append("duplicate id in this file")
    seen.add(c["id"])
    if lang == "de" and pos == "noun" and lemma[:1] != lemma[:1].upper():
        e.append("German noun lemma must be capitalised")
    if re.match(r"^(der|die|das|le|la|les|l'|the|a|an)\s", str(lemma), re.I):
        e.append("lemma must not include the article")
    if not str(c["ipa"]).startswith(("/", "[")):
        w.append("ipa should be in /slashes/")

    # senses
    senses = c["senses"]
    if not isinstance(senses, list) or not senses:
        e.append("senses must be a non-empty list")
        senses = []
    if len(senses) > (2 if wl <= 4 else 3):
        e.append(f"too many senses for WL{wl}")
    lem = str(lemma).lower()
    for i, s in enumerate(senses, 1):
        p = f"sense {i}: "
        for k in ("kid_def", "adult_def", "translations", "examples"):
            if k not in s:
                e.append(p + f"missing '{k}'")
        if any(k not in s for k in ("kid_def", "adult_def", "translations", "examples")):
            continue
        if words(s["kid_def"]) > 15:
            e.append(p + f"kid_def has {words(s['kid_def'])} words (max 15)")
        if lem and re.search(r"\b" + re.escape(lem), str(s["kid_def"]).lower()):
            w.append(p + "kid_def seems to use the word itself")
        if words(s["adult_def"]) > 30:
            w.append(p + "adult_def longer than 30 words")
        tr = s["translations"] or {}
        for o in others:
            if not tr.get(o):
                e.append(p + f"missing translation '{o}'")
        ex = s["examples"] or []
        need = (3, 3) if i == 1 else (1, 2)
        if not need[0] <= len(ex) <= need[1]:
            e.append(p + f"needs {need[0]}-{need[1]} examples, has {len(ex)}")
        for j, x in enumerate(ex, 1):
            q = p + f"example {j}: "
            text = x.get("text", "")
            if len(TARGET.findall(text)) != 1:
                e.append(q + "mark the target word with [[ ]] exactly once")
            limit = 12 if wl <= 4 else 20
            if words(TARGET.sub(r"\1", text)) > limit:
                w.append(q + f"longer than {limit} words")
            if x.get("audience") not in ("kid", "adult"):
                e.append(q + "audience must be kid or adult")
            xt = x.get("translations") or {}
            for o in others:
                if not xt.get(o):
                    e.append(q + f"missing translation '{o}'")

    # grammar
    g = c["grammar"] if isinstance(c["grammar"], dict) else {}
    if lang == "de" and pos == "noun":
        gen = g.get("gender")
        if gen not in DE_ARTICLE:
            e.append("de noun: grammar.gender must be m, f or n")
        elif g.get("article") != DE_ARTICLE[gen]:
            e.append(f"de noun: article should be '{DE_ARTICLE[gen]}' for gender {gen}")
        cases = g.get("cases") or {}
        for k in CASES:
            if k not in cases or not isinstance(cases[k], dict) or "sg" not in cases[k] or "pl" not in cases[k]:
                e.append(f"de noun: grammar.cases.{k} needs sg and pl (null if none)")
        if gen in DE_ARTICLE and cases.get("nom", {}).get("sg") and not str(cases["nom"]["sg"]).startswith(DE_ARTICLE[gen] + " "):
            e.append("de noun: cases.nom.sg should start with its article")
    elif lang == "de" and pos == "verb":
        for k in ("present_3sg", "preterite_3sg", "participle", "auxiliary", "present"):
            if not g.get(k):
                e.append(f"de verb: grammar.{k} missing")
        if g.get("auxiliary") not in (None, "haben", "sein"):
            e.append("de verb: auxiliary must be haben or sein")
    elif lang == "de" and pos == "preposition":
        if g.get("case") not in ("acc", "dat", "gen", "two-way"):
            e.append("de preposition: grammar.case must be acc, dat, gen or two-way")
    elif lang == "fr" and pos == "noun":
        if g.get("gender") not in ("m", "f"):
            e.append("fr noun: grammar.gender must be m or f")
        if g.get("article") not in ("le", "la", "l'"):
            e.append("fr noun: grammar.article must be le, la or l'")
    elif lang == "fr" and pos == "verb":
        if g.get("auxiliary") not in ("avoir", "être"):
            e.append("fr verb: auxiliary must be avoir or être")
    elif lang == "en" and pos == "verb":
        for k in ("past", "past_participle"):
            if not g.get(k):
                e.append(f"en verb: grammar.{k} missing")

    # etymology
    et = c["etymology"] or {}
    if et.get("confidence") not in ("high", "medium", "low"):
        e.append("etymology.confidence must be high, medium or low")
    if et.get("confidence") == "low" and "check:etymology" not in c["flags"]:
        w.append("low-confidence etymology without a check:etymology flag")

    # bridges
    for b in c["bridges"] or []:
        if b.get("lang") not in others:
            e.append(f"bridge to '{b.get('lang')}' must be to {others}")
        if b.get("type") not in BRIDGE_TYPES:
            e.append(f"bridge type '{b.get('type')}' not allowed")
        if b.get("type") in ("false_friend", "literal") and not b.get("note"):
            e.append(f"{b.get('type')} bridge '{b.get('word')}' needs a note")

    # mnemonics
    m = c["mnemonics"] or []
    if sorted(x.get("audience") for x in m) != ["adult", "kid"]:
        e.append("mnemonics needs exactly one kid and one adult tip")
    for x in m:
        if x.get("type") not in MNEMONIC_TYPES:
            e.append(f"mnemonic type '{x.get('type')}' not allowed")

    # tests
    d = c["distractors"] or {}
    for k in ("meanings", "words"):
        if len(d.get(k) or []) != 3:
            e.append(f"distractors.{k} needs exactly 3")
    syn = {str(s.get("word", "")).lower() for s in c["synonyms"] or []}
    for x in d.get("words") or []:
        if str(x).lower() in syn or str(x).lower() == lem:
            e.append(f"distractor '{x}' is the word or a synonym")
    cl = c["cloze"] or []
    if len(cl) != 2:
        e.append("cloze needs exactly 2")
    for x in cl:
        if "___" not in str(x.get("sentence", "")) or not x.get("answer"):
            e.append("cloze sentence needs ___ and an answer")

    r = c.get("review")
    if r is not None and r.get("verdict") not in ("ok", "fixed", "reject"):
        e.append("review.verdict must be ok, fixed or reject")
    return e, w


def read_cards(path):
    cards, errors = [], []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("```"):
            continue
        try:
            cards.append((n, json.loads(line)))
        except json.JSONDecodeError as ex:
            errors.append((n, f"not valid JSON ({ex.msg} at column {ex.colno})"))
    return cards, errors


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("--merge", metavar="DIR", help="merge valid cards into DIR/<lang>.jsonl")
    ap.add_argument("--fix-prompt", action="store_true", help="print a message to paste back to the model")
    ap.add_argument("--strict", action="store_true", help="treat warnings as errors")
    a = ap.parse_args()

    good, total, bad_lines = [], 0, []
    for f in a.files:
        cards, parse_errors = read_cards(f)
        for n, msg in parse_errors:
            print(f"{f}:{n}: ERROR {msg}")
            bad_lines.append(f"line {n}: {msg}")
        seen = set()
        for n, c in cards:
            total += 1
            cid = c.get("id", f"line {n}")
            errs, warns = check_card(c, seen)
            if a.strict:
                errs, warns = errs + warns, []
            for x in errs:
                print(f"{f}:{n}: ERROR {cid}: {x}")
            for x in warns:
                print(f"{f}:{n}: warn  {cid}: {x}")
            rejected = (c.get("review") or {}).get("verdict") == "reject"
            if rejected:
                print(f"{f}:{n}: note  {cid}: rejected by reviewer: {c['review'].get('issues')}")
            if errs:
                bad_lines.append(f"{cid}: " + "; ".join(errs))
            elif not rejected:
                c.setdefault("source", Path(f).name)
                good.append(c)
    print(f"\n{len(good)} of {total} cards valid" + (f", {len(bad_lines)} with errors" if bad_lines else ""))

    if a.fix_prompt and bad_lines:
        print("\n--- paste this back into the chat ---")
        print("Fix these cards and resend only them, same jsonl format:")
        print("\n".join(bad_lines))

    if a.merge and good:
        out = Path(a.merge)
        out.mkdir(parents=True, exist_ok=True)
        by_lang = {}
        for c in good:
            by_lang.setdefault(c["lang"], []).append(c)
        for lang, cs in by_lang.items():
            p = out / f"{lang}.jsonl"
            existing = {}
            if p.exists():
                for line in p.read_text(encoding="utf-8").splitlines():
                    if line.strip():
                        x = json.loads(line)
                        existing[x["id"]] = x
            for c in cs:
                existing[c["id"]] = c
            p.write_text("".join(json.dumps(existing[k], ensure_ascii=False) + "\n"
                                 for k in sorted(existing)), encoding="utf-8")
            print(f"merged {len(cs)} cards into {p} ({len(existing)} total)")
    sys.exit(1 if bad_lines else 0)


if __name__ == "__main__":
    main()
