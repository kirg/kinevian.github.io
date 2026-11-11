#!/usr/bin/env python3
"""Build WordWise cards from free open data, so AI only writes the small kid-friendly parts.

Data (download with fetch.sh, see README.md):
  data/kaikki-en.jsonl, kaikki-de.jsonl, kaikki-fr.jsonl   Wiktionary extracts (CC BY-SA)
  data/tatoeba/{eng,deu,fra}_sentences.tsv, links.csv      example sentences (CC BY)
  data/openmoji.json (optional)                             emoji for concrete nouns (CC BY-SA)

Steps:
  1. python3 build.py wordlist --lang de --count 1500            -> lists/de.csv   (edit it: keep=y/n, wl, theme)
  2. python3 build.py cards --lang de                             -> partial/de.jsonl (facts, examples, grammar)
  3. python3 build.py ai-requests --lang de --model MODEL         -> ai/de.requests.jsonl (Batch API)
     python3 build.py ai-chat --lang de                           -> ai/de.chat-001.txt … (paste into ChatGPT/Gemini/Claude)
  4. python3 send_batch.py ai/de.requests.jsonl                   -> ai/de.results.jsonl
     (or paste each chat reply into ai/de.chat-001.reply.json …)
  5. python3 build.py merge --lang de                             -> cards/de.jsonl  (then ../tools/validate.py)

Only the Python standard library is needed, plus `pip install wordfreq` for step 1.
"""
import argparse
import csv
import difflib
import glob
import json
import random
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "tools"))
from validate import check_card  # noqa: E402

LANGS = ["en", "de", "fr"]
TATOEBA = {"en": "eng", "de": "deu", "fr": "fra"}
POS_MAP = {"noun": "noun", "verb": "verb", "adj": "adjective", "adv": "adverb", "prep": "preposition",
           "conj": "conjunction", "pron": "pronoun", "intj": "interjection", "phrase": "phrase"}
KEEP_POS_DEFAULT = {"noun", "verb", "adjective", "adverb", "preposition"}
BAD_SENSE_TAGS = {"obsolete", "archaic", "rare", "vulgar", "slang", "dated", "offensive", "derogatory",
                  "form-of", "historical", "dialectal", "colloquial", "nonstandard", "misspelling"}
DE_ART = {"m": "der", "f": "die", "n": "das"}
DE_CASE_ART = {"m": {"nom": "der", "acc": "den", "dat": "dem", "gen": "des"},
               "f": {"nom": "die", "acc": "die", "dat": "der", "gen": "der"},
               "n": {"nom": "das", "acc": "das", "dat": "dem", "gen": "des"},
               "pl": {"nom": "die", "acc": "die", "dat": "den", "gen": "der"}}
CASE_TAGS = {"nom": "nominative", "acc": "accusative", "dat": "dative", "gen": "genitive"}
ARTICLE_WORDS = {"der", "die", "das", "den", "dem", "des", "le", "la", "les", "l'", "the"}
DE_SEP_PREFIXES = ("ab", "an", "auf", "aus", "bei", "ein", "fest", "fort", "her", "hin", "los", "mit",
                   "nach", "vor", "weg", "zu", "zurück", "zusammen")
SKIP_FORM_TAGS = {"auxiliary", "table-tags", "inflection-template", "class", "romanization", "diminutive", "abbreviation"}
WORD_RE = re.compile(r"[\w'’-]+", re.UNICODE)


# ---------- helpers ----------
def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def write_jsonl(path, rows):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def plain(s):
    """Lower-case, no accents/umlauts, for similarity checks."""
    s = s.lower().replace("ß", "ss")
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def tags_of(x):
    return set(x.get("tags") or [])


def card_id(lang, lemma, pos):
    return f"{lang}:{lemma.lower().replace(' ', '_')}:{pos}"


def fr_article(word, gender):
    if word[:1].lower() in "aeiouéèêàâîïôûœh":
        return "l'"
    return "le" if gender == "m" else "la"


def with_article(lang, word, gender):
    if lang == "de" and gender in DE_ART:
        return f"{DE_ART[gender]} {word}"
    if lang == "fr" and gender in ("m", "f"):
        a = fr_article(word, gender)
        return f"{a}{word}" if a == "l'" else f"{a} {word}"
    return word


def strip_article(form):
    parts = form.split()
    while len(parts) > 1 and parts[0].lower() in ARTICLE_WORDS:
        parts = parts[1:]
    return " ".join(parts)


def gender_of(entry, lang):
    words = {"masculine": "m", "feminine": "f", "neuter": "n"}
    for s in entry.get("senses") or []:
        for t in tags_of(s):
            if t in words:
                return words[t]
    for t in tags_of(entry):
        if t in words:
            return words[t]
    for h in entry.get("head_templates") or []:
        g = str((h.get("args") or {}).get("g") or (h.get("args") or {}).get("1") or "")[:1]
        if g in ("m", "f", "n") and (lang == "de" or g != "n"):
            return g
        m = re.search(r"^\S+\s+(m|f|n)\b", h.get("expansion") or "")
        if m:
            return m.group(1)
    return None


def find_form(entry, need, avoid=()):
    for f in entry.get("forms") or []:
        t = tags_of(f)
        if set(need) <= t and not (t & set(avoid)):
            form = strip_article(f.get("form", "").strip())
            if form and form != "-" and not form.startswith("("):
                return form
    return None


def good_senses(entry, limit):
    out = []
    for s in entry.get("senses") or []:
        if tags_of(s) & BAD_SENSE_TAGS or s.get("form_of") or s.get("alt_of"):
            continue
        g = (s.get("glosses") or [None])[-1]
        if g and g not in out:
            out.append(g)
        if len(out) >= limit:
            break
    return out


def syllables_of(entry, lemma):
    for h in entry.get("hyphenations") or []:
        parts = h.get("parts") if isinstance(h, dict) else None
        if parts:
            return parts
    h = entry.get("hyphenation")
    if isinstance(h, list) and h:
        return h
    return [lemma]


def ipa_of(entry):
    for s in entry.get("sounds") or []:
        if s.get("ipa"):
            return s["ipa"]
    return None


# ---------- grammar ----------
def grammar(lang, pos, entry, lemma):
    g = {}
    if lang == "de" and pos == "noun":
        gen = gender_of(entry, "de") or "m"
        plural = find_form(entry, ["nominative", "plural"]) or find_form(entry, ["plural"], ["genitive", "dative"])
        gen_sg = find_form(entry, ["genitive", "singular"]) or find_form(entry, ["genitive"], ["plural"]) or lemma
        cases = {}
        for k, tag in CASE_TAGS.items():
            sg = find_form(entry, [tag, "singular"]) or (gen_sg if k == "gen" else lemma)
            pl = find_form(entry, [tag, "plural"]) or (None if not plural else (plural + "n" if k == "dat" and not plural.endswith(("n", "s")) else plural))
            cases[k] = {"sg": f"{DE_CASE_ART[gen][k]} {sg}",
                        "pl": f"{DE_CASE_ART['pl'][k]} {pl}" if pl else None}
        g = {"gender": gen, "article": DE_ART[gen], "plural": plural, "genitive_sg": gen_sg,
             "n_declension": bool(gen_sg and gen_sg.endswith("en") and not lemma.endswith("en")), "cases": cases}
    elif lang == "de" and pos == "verb":
        third = find_form(entry, ["present", "singular", "third-person"], ["subjunctive-i", "subjunctive-ii"])
        aux = find_form(entry, ["auxiliary"])
        persons = {"ich": ["first-person", "singular"], "du": ["second-person", "singular"],
                   "er": ["third-person", "singular"], "wir": ["first-person", "plural"],
                   "ihr": ["second-person", "plural"], "sie": ["third-person", "plural"]}
        present = {p: find_form(entry, ["present", "indicative"] + t) or find_form(entry, ["present"] + t, ["subjunctive-i"])
                   for p, t in persons.items()}
        sense_tags = set().union(*[tags_of(s) for s in entry.get("senses") or []] or [set()])
        case = "dat" if "with-dative" in sense_tags else "gen" if "with-genitive" in sense_tags else (
            "acc" if "transitive" in sense_tags or "with-accusative" in sense_tags else None)
        sep = None
        if third and " " in third:
            sep = third.split()[-1] if third.split()[-1] in DE_SEP_PREFIXES else None
        g = {"present_3sg": third, "preterite_3sg": find_form(entry, ["past"], ["participle", "subjunctive-ii"]),
             "participle": find_form(entry, ["participle", "past"]),
             "auxiliary": aux if aux in ("haben", "sein") else "haben",
             "separable_prefix": sep, "reflexive": "reflexive" in sense_tags, "governs_case": case,
             "present": present}
    elif lang == "de" and pos == "adjective":
        g = {"comparative": find_form(entry, ["comparative"]), "superlative": find_form(entry, ["superlative"])}
    elif lang == "de" and pos == "preposition":
        sense_tags = set().union(*[tags_of(s) for s in entry.get("senses") or []] or [set()])
        has = [c for c, t in (("acc", "with-accusative"), ("dat", "with-dative"), ("gen", "with-genitive")) if t in sense_tags]
        g = {"case": "two-way" if set(has) >= {"acc", "dat"} else (has[0] if has else "dat")}
    elif lang == "fr" and pos == "noun":
        gen = gender_of(entry, "fr") or "m"
        g = {"gender": gen if gen in ("m", "f") else "m", "article": fr_article(lemma, gen),
             "plural": find_form(entry, ["plural"]) or lemma + "s", "h_aspire": False}
    elif lang == "fr" and pos == "verb":
        persons = {"je": ["first-person", "singular"], "tu": ["second-person", "singular"],
                   "il": ["third-person", "singular"], "nous": ["first-person", "plural"],
                   "vous": ["second-person", "plural"], "ils": ["third-person", "plural"]}
        present = {p: find_form(entry, ["present", "indicative"] + t) for p, t in persons.items()}
        aux = find_form(entry, ["auxiliary"])
        group = "1" if lemma.endswith("er") and lemma != "aller" else "2" if lemma.endswith("ir") and (present.get("nous") or "").endswith("issons") else "3"
        g = {"group": group, "auxiliary": aux if aux in ("avoir", "être") else "avoir",
             "participle": find_form(entry, ["participle", "past"]), "reflexive": lemma.startswith(("se ", "s'")),
             "present": present}
    elif lang == "fr" and pos == "adjective":
        g = {"masc_sg": lemma, "fem_sg": find_form(entry, ["feminine", "singular"]) or find_form(entry, ["feminine"], ["plural"]),
             "masc_pl": find_form(entry, ["masculine", "plural"]) or find_form(entry, ["plural"], ["feminine"]),
             "fem_pl": find_form(entry, ["feminine", "plural"]), "before_vowel": find_form(entry, ["before-vowel"])}
    elif lang == "en" and pos == "noun":
        sense_tags = set().union(*[tags_of(s) for s in entry.get("senses") or []] or [set()])
        g = {"plural": find_form(entry, ["plural"]), "countable": "uncountable" not in sense_tags or "countable" in sense_tags}
    elif lang == "en" and pos == "verb":
        g = {"third_person": find_form(entry, ["present", "singular", "third-person"]),
             "past": find_form(entry, ["past"], ["participle"]), "past_participle": find_form(entry, ["participle", "past"])}
    elif lang == "en" and pos == "adjective":
        g = {"comparative": find_form(entry, ["comparative"]) or f"more {lemma}",
             "superlative": find_form(entry, ["superlative"]) or f"most {lemma}"}
    return g


# ---------- step 1: word list ----------
def cmd_wordlist(a):
    try:
        from wordfreq import top_n_list, zipf_frequency
    except ImportError:
        sys.exit("Install wordfreq first:  pip install wordfreq")
    top = top_n_list(a.lang, a.top)
    wanted = set(top)
    index = {}  # lower form -> list of (word, pos, lemma_or_None)
    for e in read_jsonl(Path(a.data) / f"kaikki-{a.lang}.jsonl"):
        w = e.get("word", "")
        if w.lower() not in wanted:
            continue
        pos = POS_MAP.get(e.get("pos"))
        if not pos:
            continue
        lemma = None
        for s in e.get("senses") or []:
            fo = s.get("form_of") or s.get("alt_of")
            if fo:
                lemma = fo[0].get("word")
                break
        index.setdefault(w.lower(), []).append((w, pos, lemma))
    keep_pos = set(a.pos.split(",")) if a.pos else KEEP_POS_DEFAULT
    seen, rows = set(), []
    for tok in top:
        cands = index.get(tok) or []
        heads = [c for c in cands if c[2] is None and c[1] in keep_pos]
        if heads:
            # German nouns are capitalised: prefer the casing that exists as a headword
            w, pos, _ = sorted(heads, key=lambda c: (c[1] != "noun") if a.lang == "de" else 0)[0]
        else:
            forms = [c for c in cands if c[2] and c[1] in keep_pos]
            if not forms:
                continue
            w, pos = forms[0][2], forms[0][1]
        key = (w, pos)
        if key in seen:
            continue
        seen.add(key)
        rows.append((w, pos, round(zipf_frequency(w, a.lang), 2)))
    rows = rows[a.skip_basic:]
    out = Path(a.out or f"lists/{a.lang}.csv")
    out.parent.mkdir(parents=True, exist_ok=True)
    bands = [(1000, 1, "A1"), (2000, 2, "A2"), (3500, 3, "A2"), (5000, 4, "B1"), (7000, 5, "B1"),
             (9500, 6, "B2"), (12500, 7, "B2"), (16000, 8, "C1"), (10 ** 9, 9, "C1")]
    with open(out, "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["lemma", "pos", "zipf", "rank", "wl", "cefr", "theme", "keep"])
        for i, (w, pos, z) in enumerate(rows[: a.count], 1):
            r = i + a.skip_basic
            wl, cefr = next((b[1], b[2]) for b in bands if r <= b[0])
            wr.writerow([w, pos, z, r, wl, cefr, "", "y"])
    print(f"wrote {min(a.count, len(rows))} candidate words to {out}. Edit keep/wl/theme, then run: build.py cards --lang {a.lang}")


# ---------- step 2: cards from open data ----------
def load_translation_maps(data):
    """From the English Wiktionary extract: English word -> {lang: [(word, gender)]}, and the reverse."""
    fwd, rev = {}, {}
    p = Path(data) / "kaikki-en.jsonl"
    if not p.exists():
        print("note: data/kaikki-en.jsonl missing, translations will be left to the AI step")
        return fwd, rev
    for e in read_jsonl(p):
        pos = POS_MAP.get(e.get("pos"))
        if not pos:
            continue
        for t in e.get("translations") or []:
            code, w = t.get("code") or t.get("lang_code"), t.get("word")
            if code not in ("de", "fr") or not w:
                continue
            gt = tags_of(t)
            g = "m" if "masculine" in gt else "f" if "feminine" in gt else "n" if "neuter" in gt else None
            fwd.setdefault((e["word"], pos), {}).setdefault(code, [])
            if (w, g) not in fwd[(e["word"], pos)][code]:
                fwd[(e["word"], pos)][code].append((w, g))
            rev.setdefault((code, w, pos), [])
            if e["word"] not in rev[(code, w, pos)]:
                rev[(code, w, pos)].append(e["word"])
    return fwd, rev


def load_sentences(data, lang, wanted_forms, max_words):
    """Sentences containing any wanted form, for one language: {id: text}, plus form -> [ids]."""
    path = Path(data) / "tatoeba" / f"{TATOEBA[lang]}_sentences.tsv"
    by_form, texts = {}, {}
    if not path.exists():
        print(f"note: {path} missing, examples will be left to the AI step")
        return texts, by_form
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            sid, text = parts[0], parts[2]
            toks = WORD_RE.findall(text)
            if not 3 <= len(toks) <= max_words:
                continue
            hit = False
            for t in set(toks):
                lt = t.lower()
                if lt in wanted_forms:
                    lst = by_form.setdefault(lt, [])
                    if len(lst) < 60:
                        lst.append(sid)
                        hit = True
            if hit:
                texts[sid] = text
    return texts, by_form


def load_links(data, src_ids):
    links = {}
    path = Path(data) / "tatoeba" / "links.csv"
    if not path.exists():
        return links
    with open(path, encoding="utf-8") as f:
        for line in f:
            a_, _, b_ = line.rstrip("\n").partition("\t")
            if a_ in src_ids:
                links.setdefault(a_, []).append(b_)
    return links


def load_texts(data, lang, ids):
    out = {}
    path = Path(data) / "tatoeba" / f"{TATOEBA[lang]}_sentences.tsv"
    if not path.exists() or not ids:
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 3 and parts[0] in ids:
                out[parts[0]] = parts[2]
    return out


def load_false_friends():
    ff = []
    p = HERE / "false_friends.tsv"
    with open(p, encoding="utf-8") as f:
        for row in csv.reader(f, delimiter="\t"):
            if row and not row[0].startswith("#") and len(row) >= 5:
                ff.append(row)
    return ff


def mark(text, forms):
    """Wrap the first occurrence of any form in [[ ]]; returns (marked, form) or (None, None)."""
    for m in WORD_RE.finditer(text):
        if m.group(0).lower() in forms:
            return text[:m.start()] + "[[" + m.group(0) + "]]" + text[m.end():], m.group(0)
    return None, None


def emoji_map(data):
    p = Path(data) / "openmoji.json"
    if not p.exists():
        return {}
    out = {}
    for e in json.load(open(p, encoding="utf-8")):
        ann = (e.get("annotation") or "").lower()
        if ann and " " not in ann and e.get("emoji") and e.get("group") not in ("flags", "symbols", "component", "extras-unicode"):
            out.setdefault(ann, e["emoji"])
    return out


def cmd_cards(a):
    lang, data = a.lang, a.data
    others = [l for l in LANGS if l != lang]
    rows = [r for r in csv.DictReader(open(a.list or f"lists/{lang}.csv", encoding="utf-8"))
            if (r.get("keep") or "y").strip().lower().startswith("y")]
    wanted = {(r["lemma"], r["pos"]): r for r in rows}
    entries = {}
    for e in read_jsonl(Path(data) / f"kaikki-{lang}.jsonl"):
        key = (e.get("word"), POS_MAP.get(e.get("pos")))
        if key in wanted and key not in entries:
            entries[key] = e
    missing = [k for k in wanted if k not in entries]
    if missing:
        print(f"note: {len(missing)} words not found in Wiktionary data (skipped): {missing[:10]}")
    fwd, rev = load_translation_maps(data)
    ff = load_false_friends()
    emojis = emoji_map(data)

    # forms -> lemma key, for finding example sentences
    form_to_key = {}
    for key, e in entries.items():
        forms = {key[0].lower()} | {strip_article(f.get("form", "")).lower() for f in e.get("forms") or []
                                    if f.get("form") and " " not in strip_article(f.get("form", ""))
                                    and not tags_of(f) & SKIP_FORM_TAGS}
        for fm in forms:
            if len(fm) > 1:
                form_to_key.setdefault(fm, key)
    texts, by_form = load_sentences(data, lang, set(form_to_key), a.max_words)
    links = load_links(data, set(texts))
    other_ids = {t for ids in links.values() for t in ids}
    other_texts = {o: load_texts(data, o, other_ids) for o in others}

    try:
        from wordfreq import zipf_frequency
    except ImportError:
        zipf_frequency = None

    def ease(text):
        if not zipf_frequency:
            return 0
        toks = WORD_RE.findall(text)
        return sum(zipf_frequency(t, lang) for t in toks) / max(1, len(toks))

    by_pos = {}
    for (lem, pos), r in wanted.items():
        by_pos.setdefault(pos, []).append((int(r.get("rank") or 0), lem))
    cards = []
    for key, e in entries.items():
        lemma, pos = key
        r = wanted[key]
        wl = int(r.get("wl") or 3)
        g = grammar(lang, pos, e, lemma)
        gender = g.get("gender")
        cid = card_id(lang, lemma, pos)
        glosses = good_senses(e, 2 if wl <= 4 else 3) or ["?"]
        flags = []

        # translations of the word
        tr = {}
        if lang == "en":
            for o in others:
                lst = fwd.get((lemma, pos), {}).get(o) or []
                if lst:
                    tr[o] = with_article(o, *lst[0])
        else:
            ens = rev.get((lang, lemma, pos)) or []
            if ens:
                tr["en"] = ens[0]
                o = [x for x in others if x != "en"][0]
                lst = fwd.get((ens[0], pos), {}).get(o) or []
                if lst:
                    tr[o] = with_article(o, *lst[0])
            elif glosses[0] != "?":
                tr["en"] = re.split(r"[;,(]", glosses[0])[0].strip()

        # examples from Tatoeba
        forms = {fm for fm, k in form_to_key.items() if k == key}
        cand = []
        for fm in forms:
            for sid in by_form.get(fm, []):
                cand.append(sid)
        scored = []
        for sid in dict.fromkeys(cand):
            marked, form = mark(texts[sid], forms)
            if not marked:
                continue
            trs = {}
            for t in links.get(sid, []):
                for o in others:
                    if t in other_texts[o] and o not in trs:
                        trs[o] = other_texts[o][t]
            n = len(WORD_RE.findall(texts[sid]))
            limit = 12 if wl <= 4 else 20
            score = len(trs) * 2 + ease(texts[sid]) - (5 if n > limit else 0) - n * 0.05
            scored.append((score, marked, form, trs))
        scored.sort(key=lambda x: -x[0])
        rng = random.Random(cid)
        examples = [{"text": m, "audience": "kid" if wl <= 6 else "adult", "translations": t}
                    for _, m, _, t in scored[:3]]
        cloze = [{"sentence": m.replace(f"[[{f}]]", "___"), "answer": f} for _, m, f, _ in scored[3:5]]

        # etymology
        et_text = (e.get("etymology_text") or "").strip()
        adult_et = " ".join(re.split(r"(?<=[.!?])\s+", et_text)[:2]) if et_text else None
        roots = [{"form": m.group(2), "lang": m.group(1), "meaning": None}
                 for m in re.finditer(r"\b(Latin|Ancient Greek|Old French|Old High German|Proto-Germanic|Old English)\s+(\*?[\w-]+)", et_text)][:3]

        # bridges: cognate candidates + curated false friends
        bridges = []
        for o in others:
            w = tr.get(o)
            if not w:
                continue
            bare = strip_article(w).split(",")[0].strip()
            if difflib.SequenceMatcher(None, plain(lemma), plain(bare)).ratio() >= 0.6:
                bridges.append({"lang": o, "word": bare, "type": "cognate", "note": None})
                flags.append("check:bridge")
        for row in ff:
            la, wa, lb, wb, note_a = row[:5]
            if la == lang and wa.lower() == lemma.lower():
                bridges.append({"lang": lb, "word": wb, "type": "false_friend", "note": note_a})
            elif lb == lang and wb.lower() == lemma.lower() and len(row) > 5:
                bridges.append({"lang": la, "word": wa, "type": "false_friend", "note": row[5]})

        # distractor words: same pos, similar rank, not synonyms
        syn = {s.get("word") for s in e.get("synonyms") or []}
        rank = int(r.get("rank") or 0)
        same = [(rk, w) for rk, w in by_pos.get(pos, []) if w != lemma and w not in syn]
        pool = [w for rk, w in same if abs(rk - rank) <= 800]
        rng.shuffle(pool)
        if len(pool) < 3:
            pool += [w for rk, w in sorted(same, key=lambda x: abs(x[0] - rank)) if w not in pool]

        card = {
            "id": cid, "lang": lang, "lemma": lemma, "pos": pos, "wl": wl, "cefr": r.get("cefr") or "A2",
            "themes": [t for t in (r.get("theme") or "").split("|") if t],
            "syllables": syllables_of(e, lemma), "ipa": ipa_of(e) or "/?/", "grammar": g,
            "senses": [{"kid_def": None, "adult_def": gl if lang == "en" else None,
                        "translations": dict(tr) if i == 0 else {}, "examples": examples if i == 0 else []}
                       for i, gl in enumerate(glosses)],
            "etymology": {"kid": None, "adult": adult_et, "roots": roots, "confidence": "high" if et_text else "low"},
            "family": [d["word"] for d in (e.get("derived") or []) if " " not in d.get("word", "")][:5],
            "synonyms": [{"word": s["word"], "note": None} for s in (e.get("synonyms") or [])[:4] if s.get("word")],
            "antonyms": [s["word"] for s in (e.get("antonyms") or [])[:3] if s.get("word")],
            "collocations": [], "bridges": bridges[:3], "mnemonics": [], "watch_out": [],
            "distractors": {"meanings": [], "words": pool[:3]}, "cloze": cloze,
            "image_prompt": None, "flags": sorted(set(flags + ([] if et_text else ["check:etymology"]))),
            "_facts": {"glosses_en": glosses, "etymology_text": et_text[:600], "gender": gender},
        }
        if pos == "noun" and lang == "en" and lemma.lower() in emojis:
            card["emoji"] = emojis[lemma.lower()]
        elif pos == "noun" and tr.get("en") and tr["en"].lower() in emojis:
            card["emoji"] = emojis[tr["en"].lower()]
        if len(card["senses"]) > 1:
            card["senses"] = [s for i, s in enumerate(card["senses"]) if i == 0 or s["adult_def"] or lang != "en"]
        cards.append(card)
    out = a.out or f"partial/{lang}.jsonl"
    write_jsonl(out, cards)
    with_ex = sum(1 for c in cards if len(c["senses"][0]["examples"]) == 3)
    print(f"wrote {len(cards)} partial cards to {out} ({with_ex} already have 3 example sentences)")


# ---------- step 3: what the AI must still write ----------
SYSTEM_PROMPT = """You complete vocabulary cards for WordWise, an app for children (from age 7) and adults learning English (en), German (de) and French (fr).
The facts (meaning, grammar, word history, example sentences) come from Wiktionary and Tatoeba. You only add short, kid-friendly text.

For each word you get: id, lang, lemma, pos, level (wl 1-12: 1 = grade 2, 3 = grade 4, 5 = grade 6, 7 = grade 8, 9+ = adult), English glosses, the Wiktionary etymology text, and what is missing.
Return one object per word with:
- kid_def: definition in the WORD'S OWN language, max 15 words, only words easier than the target, never the word itself.
- adult_def: definition in the word's own language, max 30 words (for English you may simplify the gloss).
- kid_etymology: max 2 short sentences in the word's own language, retelling ONLY what the given etymology text says; null if the text is empty or unclear. Never invent history.
- mnemonic_kid / mnemonic_adult: one short memory trick each (sound, image, story, bridge or morphology), in the word's own language, clearly a trick, not history. Type in mnemonic_*_type.
- wrong_meanings: 3 plausible but WRONG kid-level definitions in the word's own language.
- wrong_words: 3 other common words of the same part of speech and similar difficulty, in the word's own language, NOT synonyms (German nouns without article).
- sense_translations: translations of the main meaning into the two other languages (nouns with article: "der Apfel", "la pomme"); null for the word's own language.
- example_translations: for each example index listed as missing, natural translations into the two other languages.
- new_examples: as many as listed in missing_examples: short sentences in the word's own language (max 12 words for wl <= 4), each containing the word exactly once marked as [[word]] (any inflected form), with translations into the other two languages.
- new_cloze: as many as listed in missing_cloze: sentences with the word replaced by ___ and the exact missing form as answer.
- bridge_checks: for each word in bridge_candidates (a similar-looking word in another language), say if it is really related:
  "cognate" (same origin and same meaning), "shared_root" (same origin, different meaning), "false_friend" (looks alike, unrelated meaning) or "none" (not related / not sure).
  Give a short English note for shared_root and false_friend (what it really means), else null. When unsure, use "none"
Kid text: no violence, scary or sad topics, romance, brands or famous characters. German nouns capitalised; use "du"/"tu" for children."""

TR = {"type": "object", "additionalProperties": False, "required": ["en", "de", "fr"],
      "properties": {k: {"type": ["string", "null"]} for k in LANGS}}
ITEM_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "required": ["id", "kid_def", "adult_def", "kid_etymology", "mnemonic_kid", "mnemonic_kid_type", "mnemonic_adult",
                 "mnemonic_adult_type", "wrong_meanings", "wrong_words", "sense_translations", "example_translations", "new_examples", "new_cloze",
                 "bridge_checks"],
    "properties": {
        "id": {"type": "string"}, "kid_def": {"type": "string"}, "adult_def": {"type": "string"},
        "kid_etymology": {"type": ["string", "null"]},
        "mnemonic_kid": {"type": "string"}, "mnemonic_adult": {"type": "string"},
        "mnemonic_kid_type": {"type": "string", "enum": ["sound", "image", "story", "bridge", "morphology"]},
        "mnemonic_adult_type": {"type": "string", "enum": ["sound", "image", "story", "bridge", "morphology"]},
        "wrong_meanings": {"type": "array", "items": {"type": "string"}},
        "wrong_words": {"type": "array", "items": {"type": "string"}},
        "sense_translations": TR,
        "example_translations": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                 "required": ["index", "translations"], "properties": {"index": {"type": "integer"}, "translations": TR}}},
        "new_examples": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                         "required": ["text", "translations"], "properties": {"text": {"type": "string"}, "translations": TR}}},
        "new_cloze": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                      "required": ["sentence", "answer"], "properties": {"sentence": {"type": "string"}, "answer": {"type": "string"}}}},
        "bridge_checks": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                          "required": ["lang", "word", "type", "note"],
                          "properties": {"lang": {"type": "string"}, "word": {"type": "string"},
                                         "type": {"type": "string", "enum": ["cognate", "shared_root", "false_friend", "none"]},
                                         "note": {"type": ["string", "null"]}}}},
    },
}
SCHEMA = {"type": "object", "additionalProperties": False, "required": ["cards"],
          "properties": {"cards": {"type": "array", "items": ITEM_SCHEMA}}}


def ai_items(lang):
    others = [l for l in LANGS if l != lang]
    for c in read_jsonl(f"partial/{lang}.jsonl"):
        s = c["senses"][0]
        ex = s["examples"]
        yield {
            "id": c["id"], "lang": lang, "lemma": c["lemma"], "pos": c["pos"], "wl": c["wl"],
            "article": (c["grammar"] or {}).get("article"),
            "glosses_en": c["_facts"]["glosses_en"], "etymology_text": c["_facts"]["etymology_text"],
            "examples": [x["text"] for x in ex],
            "missing_example_translations": [i for i, x in enumerate(ex) if any(not x["translations"].get(o) for o in others)],
            "missing_sense_translations": [o for o in others if not s["translations"].get(o)],
            "missing_examples": max(0, 3 - len(ex)), "missing_cloze": max(0, 2 - len(c["cloze"])),
            "bridge_candidates": [{"lang": b["lang"], "word": b["word"]} for b in c["bridges"] if b["type"] == "cognate"],
        }


def chunks(xs, n):
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def cmd_ai_requests(a):
    items = list(ai_items(a.lang))
    reqs = []
    for i, group in enumerate(chunks(items, a.per_request), 1):
        reqs.append({"custom_id": f"{a.lang}-{i:04d}", "params": {
            "model": a.model, "max_tokens": 16000,
            "output_config": {"effort": a.effort, "format": {"type": "json_schema", "schema": SCHEMA}},
            "system": [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            "messages": [{"role": "user", "content": "Complete these words:\n" + "\n".join(json.dumps(x, ensure_ascii=False) for x in group)}],
        }})
    out = a.out or f"ai/{a.lang}.requests.jsonl"
    write_jsonl(out, reqs)
    print(f"wrote {len(reqs)} batch requests ({len(items)} words) to {out}. Send with: python3 send_batch.py {out}")


def cmd_ai_chat(a):
    items = list(ai_items(a.lang))
    Path("ai").mkdir(exist_ok=True)
    head = (SYSTEM_PROMPT + "\n\nReply with ONLY one ```json code block containing {\"cards\": [ ... ]}, one object per word, "
            "with exactly these keys: " + ", ".join(ITEM_SCHEMA["required"]) +
            ". sense_translations and each translations object have keys en, de, fr (null for the word's own language).\n\n")
    n = 0
    for n, group in enumerate(chunks(items, a.per_message), 1):
        p = Path(f"ai/{a.lang}.chat-{n:03d}.txt")
        p.write_text(head + "Complete these words:\n" + "\n".join(json.dumps(x, ensure_ascii=False) for x in group) + "\n", encoding="utf-8")
    print(f"wrote {n} paste-ready messages to ai/{a.lang}.chat-*.txt; save each reply as ai/{a.lang}.chat-NNN.reply.json")


# ---------- step 5: merge ----------
def load_ai_results(lang):
    res = {}
    for p in [f"ai/{lang}.results.jsonl"]:
        if Path(p).exists():
            for row in read_jsonl(p):
                for c in (row.get("cards") or []):
                    res[c["id"]] = c
    for p in sorted(glob.glob(f"ai/{lang}.chat-*.reply.json")):
        txt = Path(p).read_text(encoding="utf-8")
        txt = re.sub(r"^```\w*\s*|```\s*$", "", txt.strip(), flags=re.M)
        for c in json.loads(txt).get("cards", []):
            res[c["id"]] = c
    return res


def cmd_merge(a):
    lang = a.lang
    others = [l for l in LANGS if l != lang]
    ai = load_ai_results(lang)
    partial = list(read_jsonl(f"partial/{lang}.jsonl"))
    kid_defs = {}
    out, todo, bad = [], [], 0
    for c in partial:
        r = ai.get(c["id"])
        if not r:
            todo.append(c["id"])
            continue
        s = c["senses"][0]
        s["kid_def"], s["adult_def"] = r["kid_def"], s["adult_def"] if lang == "en" and s["adult_def"] else r["adult_def"]
        for o in others:
            if not s["translations"].get(o) and (r["sense_translations"] or {}).get(o):
                s["translations"][o] = r["sense_translations"][o]
        for et in r["example_translations"]:
            if 0 <= et["index"] < len(s["examples"]):
                for o in others:
                    if not s["examples"][et["index"]]["translations"].get(o) and et["translations"].get(o):
                        s["examples"][et["index"]]["translations"][o] = et["translations"][o]
        for x in r["new_examples"][: 3 - len(s["examples"])]:
            s["examples"].append({"text": x["text"], "audience": "kid" if c["wl"] <= 6 else "adult",
                                  "translations": {o: x["translations"].get(o) for o in others}})
        for x in r["new_cloze"][: 2 - len(c["cloze"])]:
            c["cloze"].append(x)
        for extra in c["senses"][1:]:
            extra["kid_def"] = extra["kid_def"] or extra["adult_def"]
            if not extra["examples"] or not extra["adult_def"]:
                c["senses"] = c["senses"][:1]
                break
        if r["kid_etymology"]:
            c["etymology"]["kid"] = r["kid_etymology"]
        c["mnemonics"] = [{"audience": "kid", "type": r["mnemonic_kid_type"], "text": r["mnemonic_kid"]},
                          {"audience": "adult", "type": r["mnemonic_adult_type"], "text": r["mnemonic_adult"]}]
        c["distractors"]["meanings"] = (r["wrong_meanings"] or [])[:3]
        words = c["distractors"]["words"]
        syn = {x["word"].lower() for x in c["synonyms"]} | {c["lemma"].lower()}
        for w in r.get("wrong_words") or []:
            if len(words) >= 3:
                break
            if w.lower() not in syn and w not in words:
                words.append(w)
        checked = {(b["lang"], b["word"]): b for b in r.get("bridge_checks") or []}
        keep = []
        for b in c["bridges"]:
            if b["type"] != "cognate":
                keep.append(b)
                continue
            chk = checked.get((b["lang"], b["word"]))
            if chk and chk["type"] != "none":
                keep.append({"lang": b["lang"], "word": b["word"], "type": chk["type"], "note": chk["note"]})
        c["bridges"] = keep
        c["flags"] = [f for f in c["flags"] if f != "check:bridge"]
        c.pop("_facts", None)
        kid_defs[c["lemma"]] = s["kid_def"]
        out.append(c)
    final = []
    for c in out:
        errs, warns = check_card(c, set())
        if errs:
            bad += 1
            c["flags"] = sorted(set(c["flags"] + ["needs-fix"]))
            c["_errors"] = errs
        final.append(c)
    path = a.out or f"cards/{lang}.jsonl"
    write_jsonl(path, final)
    print(f"merged {len(final)} cards into {path}: {len(final) - bad} valid, {bad} need a fix (see _errors), "
          f"{len(todo)} still waiting for AI text")
    if todo:
        print("  waiting:", ", ".join(todo[:10]) + (" …" if len(todo) > 10 else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default="data", help="folder with the downloaded data (default: data)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("wordlist"); p.add_argument("--lang", required=True, choices=LANGS)
    p.add_argument("--count", type=int, default=1500); p.add_argument("--top", type=int, default=60000)
    p.add_argument("--skip-basic", type=int, default=300, help="skip the N most common words (too easy for native speakers; use 0 for learners)")
    p.add_argument("--pos", help="comma list, default noun,verb,adjective,adverb,preposition"); p.add_argument("--out")
    p = sub.add_parser("cards"); p.add_argument("--lang", required=True, choices=LANGS); p.add_argument("--list"); p.add_argument("--out")
    p.add_argument("--max-words", type=int, default=20)
    p = sub.add_parser("ai-requests"); p.add_argument("--lang", required=True, choices=LANGS); p.add_argument("--model", required=True)
    p.add_argument("--effort", default="low", choices=["low", "medium", "high"]); p.add_argument("--per-request", type=int, default=20); p.add_argument("--out")
    p = sub.add_parser("ai-chat"); p.add_argument("--lang", required=True, choices=LANGS); p.add_argument("--per-message", type=int, default=25)
    p = sub.add_parser("merge"); p.add_argument("--lang", required=True, choices=LANGS); p.add_argument("--out")
    a = ap.parse_args()
    {"wordlist": cmd_wordlist, "cards": cmd_cards, "ai-requests": cmd_ai_requests, "ai-chat": cmd_ai_chat, "merge": cmd_merge}[a.cmd](a)


if __name__ == "__main__":
    main()
