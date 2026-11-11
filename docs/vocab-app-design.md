# WordWise — Vocabulary Builder for Kids & Adults
### Product & Technical Design (v0.1, draft)

> Working title "WordWise". A few hand-picked words a day, each with meaning, story (etymology), examples and memory hooks — then spaced-repetition flashcards and weekly / monthly / ad-hoc self-tests to make them stick. English, German and French at launch; usable from 2nd–3rd grade (age ~7) up to adults.

---

## 0. Family edition: what to build first (overrides the larger plan below)

The first real users are two children (9 and 12), their close friends, and a few adults in the family: about 10–20 people. So:

| Topic | Family edition | Larger plan (later, only if ever needed) |
|---|---|---|
| App | **PWA only** (installable from the browser, works offline). No app stores, no native wrappers, no Apple/Google developer fees | Capacitor wrappers for the stores |
| Hosting | GitHub Pages (this repo) for the app and word packs | CDN / Cloudflare R2 |
| Backend | Firebase **free Spark plan**: Google sign-in + Firestore for progress. Child profiles with a picture-PIN under a parent's account | Blaze plan, Cloud Functions |
| Email-code sign-in (9.5) | Optional. It needs a small Cloud Function, which needs the pay-as-you-go Blaze plan (still $0 at this size; set a $1 budget alert) | Built in |
| Word content | **From free open data** (Wiktionary, Tatoeba, wordfreq, OpenMoji) with the scripts in `docs/vocab-pipeline/opendata/`. AI only writes the kid-friendly bits: **~$0.20 per 1,500 words** with Claude Haiku 5.5 batches, or $0 by pasting into your ChatGPT / Gemini / Claude subscriptions | 4,000+ fully AI-written cards per language (~$1,050) |
| How many words | Start with ~1,500 per language the family actually uses (at 3 words/day that is over a year for each child); add more any time with the same scripts | 4,000 per language, all levels |
| Audio | The browser's built-in voices (Web Speech API): no audio files, no storage | Recorded / TTS audio files |
| Pictures | OpenMoji emoji for concrete nouns; no illustrations | Commissioned or generated illustrations |
| Levels | Parent picks each person's level; the app adjusts it automatically (3.4). Placement test optional | Full adaptive placement test |
| Skipped for now | dictionary tier 2, AI extras at run time, classroom mode, weekly emails (progress is shown in the app), native apps, illustrations, recorded audio, second-model review of every card (spot-check ~5% instead) | |
| Content generation cost | **~$0–1 in total** | ~$1,050 |
| Running cost | **$0 / month** (inside free tiers) | see 9.7 |
| Storage | word text ~1.2 KB per card compressed: ~5 MB for 4,500 words; on each device ~5–10 MB, no media | see 9.6 |

The sections below describe the full design; where they differ, this table wins for the family edition.

---

## 1. Goals and non-goals

**Goals**
1. Grow *active* vocabulary (the learner can use the word), not just recognition.
2. Fit a 5–10 minute daily habit: learn 2–5 new words, review due ones.
3. Pick words at the right level for the learner's age / proficiency, so words are neither already known nor out of reach.
4. Make words memorable: etymology as a short story, word families, links to similar words in the other supported languages, and mnemonics.
5. Prove learning with flashcards (spaced repetition) and periodic self-tests, with progress parents and learners can see.
6. Work for a 7-year-old and a 45-year-old in the same family, with different UI modes.

**Non-goals (v1)**
- Full grammar / conversation course (not a Duolingo replacement).
- Open social features or chat (child safety).
- User-generated public content.

---

## 2. Users and modes

| Persona | Age | Need | Mode |
|---|---|---|---|
| **Mia**, 2nd grade, native English | 7–8 | Build school vocabulary, reading confidence | **Kid mode**: audio-first, pictures, 2–3 words/day, big buttons, no timers |
| **Leo**, 5th grade, German native, learning English at school | 10–11 | Learn English words from his school level, see links to German | Kid mode + **learner track** |
| **Priya**, 9th grade | 14–15 | SAT/ Abitur / Brevet style vocabulary, academic words | **Teen mode**: denser cards, streaks, tests |
| **Thomas**, adult moving to France | 30–60 | French from A1 to B2 | **Adult mode**: CEFR levels, 5–10 words/day |
| **Parent / teacher** | — | Set level, see progress, assign test | **Guardian dashboard** |

### Two learning tracks (important)
Every profile picks, per target language, one of:

- **Native enrichment** — the learner already speaks the language and wants a richer vocabulary (e.g. Mia in English, a French child in French). Levels are tied to **school grade**. Definitions are written *in the same language*.
- **Foreign-language learner** — the learner is acquiring a new language (Leo learning English, Thomas learning French). Levels are tied to **CEFR (A1–C2)**. Meanings are shown in the learner's **bridge language** (their stronger language), plus a simple same-language definition from A2 up.

A profile can have several tracks, e.g. Leo: German (native enrichment, grade 5) + English (learner, A2) + French (learner, A1).

---

## 3. Vocabulary levels

### 3.1 A single internal scale
All words get an internal **WordWise Level (WL) 1–12**, so tracks, languages and tests share one scale. Each level maps to a grade band (native track) and a CEFR band (learner track).

| WL | Native track (approx. school year) | Learner track (CEFR) | Typical words (EN example) |
|---|---|---|---|
| 1 | Grade 2 (age 7–8) | Pre-A1 | *gentle, giant, borrow, puddle* |
| 2 | Grade 3 (8–9) | A1 | *curious, enormous, whisper, protect* |
| 3 | Grade 4 (9–10) | A1+ | *ancient, explore, journey, fragile* |
| 4 | Grade 5 (10–11) | A2 | *ignore, reluctant, predict, habitat* |
| 5 | Grade 6 (11–12) | A2+ | *cautious, evidence, generous, observe* |
| 6 | Grade 7 (12–13) | B1 | *persuade, consequence, hesitate* |
| 7 | Grade 8 (13–14) | B1+ | *ambiguous, perceive, inevitable* |
| 8 | Grade 9–10 (14–16) | B2 | *meticulous, scrutinize, pragmatic* |
| 9 | Grade 11–12 (16–18) | B2+ | *ubiquitous, candid, mitigate* |
| 10 | College | C1 | *obfuscate, sanguine, laconic* |
| 11 | Advanced adult | C1+ | *perspicacious, recondite* |
| 12 | Expert / literary | C2 | *sesquipedalian, apophatic* |

Kids from 2nd grade start at WL 1–2 by default. The design target "from 2nd–3rd grade" means the youngest content must be readable by a 7-year-old — or listenable, since kid mode reads everything aloud.

### 3.2 How words are assigned a level
Levels are computed per language from public, research-backed lists, then reviewed by an editor:

| Signal | English | German | French |
|---|---|---|---|
| School / grade lists | Academic Word List, Coxhead; Beck's "Tier 2" words; state grade-level lists | **Grundwortschatz** lists (state-defined basic vocabulary, Grundschule grades 1–4); **childLex** (children's book corpus, age bands 6–8 / 9–10 / 11–12) | **Échelle Dubois-Buyse** (words by school year CP → 3e); **Manulex** (word frequencies in primary-school readers by grade) |
| Age of acquisition | Kuperman et al. AoA norms (~30k words) | childLex age bands | Manulex grade levels |
| General frequency | SUBTLEX-US / SUBTLEX-UK | SUBTLEX-DE, DWDS frequency | Lexique 3 |
| CEFR (learner track) | English Vocabulary Profile-style A1–C2 bands, Oxford 3000/5000-like frequency cut-offs | Goethe-Zertifikat A1/A2/B1 word lists | DELF A1–B2 lists / FLELex (CEFR-graded French) |

`level_score = weighted(AoA or grade list, frequency rank, morphological complexity, abstractness)`, bucketed to WL 1–12, with editor overrides. Licensing of each list must be checked before shipping (some are research-only; see §10.3).

### 3.3 Placement test (2–4 minutes)
On first setup for each track:
1. **Age/grade or CEFR self-estimate** gives a starting WL.
2. **Adaptive yes/no check**: "Do you know this word?" for ~30 words across levels, mixing in ~25% **made-up pseudo-words** (e.g. *"flurb"*, *"Glimmerung"*). Saying "yes" to fake words lowers confidence — this corrects for guessing (the LexTALE / Yes-No vocabulary test method).
3. **5–8 verify questions** (pick the meaning) on words claimed as known, at the boundary level.
4. Result: estimated vocabulary size band + recommended WL. The learner (or parent) can override.

Kid mode: placement uses pictures and audio, max 15 items, and a parent can skip it by picking the grade.

### 3.4 Automatic level drift
Every week, the app looks at the learner's results:
- If they mark >60% of new words "I already knew this", raise the level by one.
- If weekly-test accuracy on new words is <60% for two weeks, lower it by one (or slow the daily count first).
The learner/parent is told and can undo.

---

## 4. The daily words

### 4.1 Daily plan
- **New words per day**: kid default 2–3, teen 3–5, adult 5 (range 1–10).
- **Daily session** = due reviews first (warm-up) → new words → a 1-minute mini-quiz on today's words.
- **Overload guard**: if due reviews > 4× daily new-word count, offer "review day" (no new words) — prevents the classic spaced-repetition pile-up.
- Words unlock at a chosen time (e.g. 7:00 local). Missed days don't stack up new words; the learner simply continues.

### 4.2 Choosing which words
For each profile & track, pick from the level pool (current WL, plus ~15% from WL+1 for stretch):
1. Exclude words already seen, marked known, or in the "too easy" list.
2. Prefer a **weekly theme** (e.g. "Weather", "Feelings", "Science words", "Words from Latin *port* = carry") — themes make words easier to remember and make the weekly test feel coherent. Adults can switch themes off.
3. Avoid putting easily confused words on the same day (*affect/effect*, *das Gift / gift*, *sensible/sensible* FR) — they get scheduled ≥ 3 days apart and later tested *together* as a contrast pair.
4. Mix parts of speech (not 5 adjectives in a row).
5. Optional **school sync**: a parent/teacher can paste a word list (e.g. this week's spelling list) which takes priority.

### 4.3 What a word card contains

Each word card has sections; kid mode shows the starred ones by default and hides the others behind "More".

| Section | Content | Kid | Adult |
|---|---|---|---|
| ★ Headword + audio | Word, syllables (cu·ri·ous), IPA, native-speaker or high-quality TTS audio, slow-speed audio | ✔ | ✔ |
| ★ Grammar badge | Part of speech; **German**: article colour-coded (der = blue, die = red, das = green) + plural (*der Schmetterling, die Schmetterlinge*); **French**: gender (*le/la*), plural, liaison note | ✔ | ✔ |
| ★ Picture | Illustration for concrete words; a small scene for abstract words | ✔ | optional |
| ★ Meaning | Kid-friendly definition (≤15 words, only words easier than the target); adult definition; each sense listed separately, the most common first | ✔ | ✔ |
| ★ Example sentences | 3 sentences: (1) everyday, (2) story/school context, (3) a "you" sentence the learner can relate to. Target word highlighted. Audio for each | ✔ | ✔ |
| Translation (learner track) | Translation in bridge language(s) | ✔ | ✔ |
| ★ Word story (etymology) | 1–3 sentence story for kids; fuller derivation for adults (root → path → today) | short | full |
| Word family / morphology | Parts: *un·break·able*; related words: *curious → curiosity, curiously* | ✔ | ✔ |
| ★ Memory tips | Mnemonics: sound-alike, image, story, or **cross-language bridge** (see 4.4) | ✔ | ✔ |
| Synonyms / opposites | 2–4 each, graded by level; with nuance notes for adults (*big / huge / enormous*) | simple | ✔ |
| Watch out! | False friends, common mistakes, confusable words | ✔ | ✔ |
| Collocations | Words it goes with: *to be curious **about***, *neugierig **auf***, *curieux **de*** | — | ✔ |
| Your turn | Prompt: "Use *curious* in a sentence about your day" (typed or spoken; optional) | ✔ | ✔ |

### 4.4 Cross-language memory bridges
Because the app knows all three languages, every card can link to its relatives:

- **Cognates** (same root, same meaning): EN *music* / DE *Musik* / FR *musique*; EN *curious* / FR *curieux*; EN *hand* / DE *Hand*.
- **False friends** ("Watch out!"): DE *Gift* = poison; DE *bekommen* = to receive (not become); FR *librairie* = bookshop (library = *bibliothèque*); FR *sensible* = sensitive.
- **Literal-meaning bridges**: DE *neugierig* = *neu* (new) + *gierig* (greedy) → "greedy for new things" = curious. DE *Handschuh* = hand-shoe = glove. FR *pomme de terre* = apple of the earth = potato.
- **Shared-root bridges**: EN *pavilion* and FR *papillon* (butterfly) both come from Latin *papilio* — big tents looked like spread butterfly wings.

Rules: show only bridges to languages the learner has chosen (native or learning); always label which language; never show a false friend without the "⚠ different meaning" badge. For young kids with only one language, bridges come from English words they already know (word families) instead.

### 4.5 Sample word cards

**English — native track, WL 2 (Grade 3)**
```json
{
  "id": "en:curious:adj:1",
  "lang": "en",
  "lemma": "curious",
  "syllables": ["cu", "ri", "ous"],
  "ipa": "/ˈkjʊəriəs/",
  "pos": "adjective",
  "wl": 2,
  "senses": [{
    "kid_def": "Wanting to know or learn about something.",
    "adult_def": "Eager to know or learn something; also: strange or unusual.",
    "examples": [
      "The curious cat sniffed the new box.",
      "Mia was curious about how rainbows are made.",
      "What are you most curious about in space?"
    ]
  }],
  "etymology": {
    "kid": "It comes from the Latin word 'cura', which means 'care'. A curious person cares a lot about finding things out!",
    "adult": "From Old French curios, from Latin curiosus 'careful, inquisitive', from cura 'care' (cf. cure, accurate)."
  },
  "family": ["curiosity", "curiously", "incurious"],
  "synonyms": ["interested", "nosy (not polite)", "inquisitive (WL6)"],
  "antonyms": ["bored", "uninterested"],
  "bridges": [
    {"lang": "fr", "word": "curieux", "type": "cognate"},
    {"lang": "de", "word": "neugierig", "type": "literal",
     "note": "neu (new) + gierig (greedy) = greedy for new things"}
  ],
  "mnemonics": ["Curious George is always curious — he can't stop exploring!"],
  "image": "img/en/curious.webp",
  "audio": {"word": "aud/en/curious.mp3", "examples": ["…"]},
  "review_status": "approved", "content_version": 3
}
```

**German — native track, WL 3 (Klasse 4)**: *der Schmetterling* (pl. *die Schmetterlinge*)
- Bedeutung (kid): Ein Insekt mit großen, bunten Flügeln.
- Beispiele: „Ein gelber Schmetterling saß auf der Blume." / „Aus der Raupe wird ein Schmetterling."
- Wortgeschichte: Kommt vom alten Wort *Schmetten* = Sahne. Früher glaubte man, Schmetterlinge naschen gern Sahne!
- Brücken: EN *butterfly* (butter + fly — also about cream/butter!), FR *papillon* ↔ EN *pavilion*.
- Merktipp: „Schmetterlinge schmettern nicht, sie schweben" + article badge **der** (blue).

**French — learner track (bridge: English), A2**: *la bibliothèque*
- Meaning: library. Simple FR def: Un lieu où on peut emprunter des livres.
- Exemples: « Je vais à la bibliothèque le mercredi. » / « La bibliothèque de l'école est petite mais jolie. »
- Word story: Greek *biblion* (book) + *thēkē* (box/case) = "book box". Same root as *Bible*.
- Bridges: DE *die Bibliothek* (cognate). ⚠ False friend: FR *la librairie* = bookshop.
- Memory tip: "A Bible-o-thèque is a home for books."

### 4.6 Grammar details per language (forms, gender, cases)

Every word carries a **grammar block**. It is *imported from structured dictionary data* (Wiktionary inflection tables via the Kaikki.org extracts), **not generated by AI** — inflection tables must be exact, and this data already exists. AI is only used to cross-check and to write the short explanations.

**German** (the richest; this is where the app adds most value)
| Word type | Stored | Shown at **every** level (all kids, teens, adults) | Added from Klasse 4 / A2+ |
|---|---|---|---|
| Noun | gender + article, plural, genitive singular, full 4-case × singular/plural table, *n-declension* flag (*der Junge → des Jungen*), umlaut in plural (*der Apfel → die Äpfel*) | **article always with the noun** (colour + word, e.g. *der Apfel*), gender, plural (*die Äpfel*) | case table (Nominativ, Akkusativ, Dativ, Genitiv) with the article changing colour by case |
| Verb | infinitive, *er/sie/es* present (shows stem change: *laufen → läuft*), Präteritum, Partizip II + auxiliary *haben/sein*, separable prefix (*anrufen → ich rufe … an*), reflexive (*sich freuen*), case it takes (*helfen* + Dativ), present-tense table | infinitive + *er/sie/es* form | full present table, Perfekt, Präteritum, governed case |
| Adjective | comparative / superlative (*gut, besser, am besten*), irregular forms | comparatives | ending table (der *gute* Hund / ein *guter* Hund) for B1+ |
| Preposition | case it takes: Akk (*für*), Dat (*mit*), two-way (*in, auf* — Wo? Dativ / Wohin? Akkusativ) | case badge | example pair for two-way prepositions |

The article is part of the noun everywhere in the app: on the card, in flashcards, in "My words", in lookup results, in tests (a German noun answer without the right article counts as "almost"), for kids and adults alike. The same applies to French *le / la / l'* (plus *un / une*).

New German card / test types: *"mit ___ Hund"* → **dem**; *"Ich helfe ___ (der Mann)"* → **dem Mann**; plural builder (*das Kind → die ___*); separable verb word order.

**French**: gender (+ an "ends in *-tion* → usually *la*" hint), irregular plurals (*cheval → chevaux*), adjective feminine forms (*beau / belle / bel*), verb group (-er/-ir/-re), *être* vs *avoir* in passé composé, key tenses table, elision/liaison and *h aspiré* notes. Test types: gender, plural, conjugation, "which auxiliary".

**English**: irregular verbs (*go / went / gone*), irregular plurals (*mouse → mice*), countable vs uncountable (*advice*), comparatives, phrasal-verb particles.

Articles, gender and plurals are always shown at every level. Only the *extra* grammar follows the level: case tables and full conjugations appear from the school stage that teaches them (German cases are introduced around Klasse 3–4) and for learners from A2; adults can switch everything on.

---

## 5. Flashcards (spaced repetition)

### 5.1 Scheduler
- Use **FSRS** (Free Spaced Repetition Scheduler — open-source, modern successor to SM-2 used by Anki). It models each card's *stability* and *difficulty* and schedules the next review for a target recall rate (default 90%; kids 90%, adults configurable 80–95%).
- Each word produces several **card types** (siblings), which are spaced apart so they don't appear on the same day:

| Card type | Front → Back | Unlocks |
|---|---|---|
| Recognition | Word (+ audio) → meaning | Day 1 |
| Picture match (kid) | Picture → pick/say the word | Day 1 |
| Listening | Audio only → word & meaning | Day 2 |
| Recall | Meaning / translation → produce the word | After 2 good recognitions |
| Cloze | Sentence with gap → fill in the word | After first recall |
| Gender (DE/FR) | *___ Schmetterling* → der/die/das | Day 1 for nouns |
| Spelling (opt.) | Audio → type the word | Kid "spelling" setting |

### 5.2 Rating
- Adults/teens: four buttons — *Again / Hard / Good / Easy* (standard FSRS).
- Kids: two or three big emoji buttons — 😕 "Not yet" / 🙂 "Got it" / 🤩 "Easy!" (mapped to Again/Good/Easy). Where possible kid cards are **auto-graded** (tap a picture, pick from 3 options) instead of self-rated, because young children over-rate themselves.
- Typed/spoken answers are auto-graded with tolerance: case, accents (é vs e = "almost — check the accent"), German ß/ss, umlaut fallbacks (ae/ä).

### 5.3 Mastery states (shown to the user)
`New → Learning → Familiar → Strong → Mastered`
- **Familiar**: stability ≥ 3 days.
- **Strong**: stability ≥ 21 days, recall card passed.
- **Mastered**: stability ≥ 60 days **and** answered correctly in a weekly or monthly test.
Users can also tap "I already know this" on a new word → quick 1-question check → moves to Strong if passed.

### 5.4 Flashcard sessions
- Daily review (auto), "Practice extra" (no effect on schedule unless failed), and **custom decks**: by theme, by week, by "words I keep missing" (leeches — words with ≥ 4 lapses get a "let's learn this one again" re-teach screen with a new mnemonic).
- Session length caps: kids 10 cards or 5 minutes, then a celebration screen.

---

## 6. Self-tests

### 6.1 Test types
| Test | When | Contents | Length |
|---|---|---|---|
| **Daily mini-quiz** | End of daily session | Today's new words | 3–5 Qs |
| **Weekly test** | Opens Fri–Sun (configurable day) | All words from the week (100%) + 20% from older words due soon | Kid 8–10 Qs, adult 15–20 |
| **Monthly test** | Last weekend of month | Sample from the whole month, weighted to weak words; + 10% "retention" from earlier months | Kid 15, adult 30 |
| **Ad-hoc test** | Any time | Learner/parent picks: date range, theme, level, mastery state, question types, length, timed or not | 5–50 |
| **Level-up check** | When the app suggests moving up a level | Words from the next level, not yet taught | 10–15 |
| **Parent/teacher-assigned** | When assigned | Assigned list (e.g. school spelling words) | any |

### 6.2 Question types
1. **Meaning multiple choice** — word → choose meaning (4 options; 3 for kids).
2. **Reverse MC** — meaning/picture → choose word.
3. **Fill the gap** (cloze) — new sentence not seen on the card, so it tests understanding, not memory of the example.
4. **Listen & choose** — audio → word/picture.
5. **Spell it** — audio → type (optional, good for native kids).
6. **Synonym / opposite match**.
7. **Which sentence uses the word correctly?** (2–3 sentences, one is wrong — tests real understanding; teen/adult).
8. **Gender** (DE/FR) — choose article.
9. **Word-family build** — *happy* → *un___ness*.
10. **Odd one out / confusable pairs** — *affect vs effect*, *bekommen vs become*.
11. **Translate** (learner track) — both directions.
12. **Use it** (optional, ungraded or AI-feedback for adults) — write your own sentence.

Each test mixes at least 3 types; recall (producing the word) counts more than recognition.

### 6.3 Generating good wrong answers (distractors)
Distractors decide whether a test is real or trivial. Rules:
- Same part of speech and similar level (± 1 WL).
- Prefer words the learner **has also studied** (tests discrimination, not guessing by "never seen it").
- Not a synonym of the correct answer (checked against the synonym graph / wordnet).
- For kids: similar length, no joke options.
- Pre-generated and editor-checked for top words; computed at runtime for the rest.

### 6.4 Scoring and feedback
- Score per test + per word. A wrong answer in a test sends that word's cards back to *Learning* (FSRS "Again") so it comes back soon.
- Results screen: score, words to practise (one-tap "practise these now"), comparison to the last test of the same type, and a mastery chart.
- Kid mode: no red X's — "Let's look at this one again 💪", stars instead of percentages; no timers unless turned on.
- Weekly/monthly tests can be **retaken** once; the first score is the one recorded.

---

## 7. Motivation & gamification (healthy, not addictive)
- **Streaks** with 2 "freeze" days per week (kids should not feel punished for a weekend away). Parents can turn streaks off.
- **Word garden** (kid): each mastered word grows a plant/flower in a garden; weekly test results make it bloom. Adults: a simple "words mastered" counter and a vocabulary-size estimate.
- **Badges**: first 10 words, first perfect weekly test, 5 word stories read, "Language explorer" (used bridges in 2 languages).
- **Family challenge** (opt-in): family members see each other's weekly words count — no global leaderboards for kids.
- No ads, no loot boxes, no pay-to-skip, no notifications after 8 pm for kid profiles.

---

## 8. Screens (main flows)

1. **Onboarding**: who is learning (me / my child / both) → profile(s) → language(s) and track → age/grade or CEFR → placement → words per day → reminder time.
2. **Home / Today**: "3 new words • 12 reviews • Weekly test opens Friday"; big *Start* button; streak; theme of the week.
3. **New word** (swipe through sections, or one long scroll for adults): word & audio → picture & meaning → examples → story → memory tip → "Your turn". Buttons: *I knew this*, *Save tip*, *Report a problem*.
4. **Review** (flashcards).
5. **Tests**: list of available/upcoming tests, history, *Create a test* (ad-hoc builder).
6. **My words**: searchable list, filter by state/theme/week/language, word detail.
7. **Progress**: words learned per week, mastery breakdown, test scores over time, estimated vocabulary size.
8. **Guardian dashboard** (PIN / parent account): per child progress, level settings, assign word list/test, screen-time caps, weekly email summary.
9. **Settings**: UI language (EN/DE/FR, independent of target language), audio speed, dyslexia-friendly font, font size, colour-blind safe article colours, notifications.

10. **Look up** (dictionary): search box on every main screen (see 8.1).
11. **Sign in**: "Continue with Google", "Continue with email" (one-time code; the address is not stored), Apple later, or "Try without an account". Child profiles can link an email with parent approval (9.5).

Kid mode UI: every text has a 🔊 button, maximum one idea per screen, 48 px+ tap targets, mascot guide, read-aloud on by default for WL 1–2.

### 8.1 Dictionary / lookup mode — feasible, in two tiers

**Tier 1 (MVP, low effort): look up any word the app already has.** The ~4,000 curated words per language plus all their inflected forms (from the grammar data in 4.6) go into an on-device search index (e.g. MiniSearch/FlexSearch, ~1–2 MB per language).
- Forgiving search: accents optional (*eleve* finds *élève*), umlaut fallbacks (*Aepfel*, *Apfel*), and **inflected forms find the base word** (*gehst*, *ging*, *gegangen* → *gehen*; *chevaux* → *cheval*; *mice* → *mouse*).
- Search across languages: type *butterfly* and get *der Schmetterling* / *le papillon* (from the translation links).
- Result opens the normal word card, with a **"Add to my words"** button that puts it into the daily queue / flashcards.
- Works offline.

**Tier 2 (v2, medium effort): a full dictionary.** 30–60k headwords per language from Wiktionary data (CC BY-SA, so attribution and share-alike apply to that data), downloaded on demand (~10–25 MB compressed per language). Words outside the curated set show a plain "dictionary entry" (definitions, grammar table, audio via TTS) labelled as such; tapping "Add to my words" can request a full kid-friendly card, which is generated and reviewed in the next content batch (or, if AI features are on, generated on demand — see §11).
- Kid profiles: tier-2 results are filtered with a child-safe word list; parents can turn tier 2 off.
- Optional camera lookup (point at a word in a book) later, using the device's on-device text recognition.

Verdict: not too much. Tier 1 is a few days of work because the data already exists for the word cards; tier 2 is mostly a data-pipeline task.

---

## 9. Architecture

### 9.1 Recommendation
Consistent with the other apps in this repo (geobingo, multiplier — Vite-built PWAs with Workbox and Firebase):

- **Client**: TypeScript + React (or Svelte) + Vite, installable **PWA**, works fully **offline**. Wrap with Capacitor later for App Store / Play Store.
- **Local storage**: IndexedDB (via Dexie) for content packs, card states and review logs — reviews and tests work offline and sync later.
- **Backend**: Firebase
  - Auth: **Google sign-in** (Firebase Authentication, Google provider) or **email with a one-time code** for the parent or adult learner; Apple sign-in added for iOS. Child profiles are *sub-profiles* of the parent; a child profile can optionally link an email to sign in on its own device with a code. **Email addresses are never stored** (see 9.5).
  - Firestore: profiles, settings, card states, review logs (compact), test results — this is where multi-day progress lives.
  - Cloud Functions: weekly parent summary, content-pack publishing, optional AI sentence feedback.
  - Hosting/CDN: static content packs (could also live on GitHub Pages as here).
- **Scheduler**: FSRS runs on the device (open-source `ts-fsrs`), so no server is needed for reviews.

### 9.2 Content delivery
- Content is split into **packs**: `{lang}/{track}/wl{n}/v{version}.json.gz` + audio/image bundles, ~300–500 words per pack.
- App downloads the current and next level packs; audio/images are lazy-loaded and cached by the service worker.
- Content corrections ship as small diffs (`content_version` per word).

### 9.3 Data model (simplified)

```text
Word            id, lang, lemma, pos, gender, plural, ipa, syllables, wl,
                cefr, frequency_rank, aoa, themes[], audio, image, content_version
Sense           word_id, order, kid_def, adult_def, def_in_lang, translations{lang: text}
Example         sense_id, text, level, audio, source
Etymology       word_id, kid_text, adult_text, root_ids[]
Root            id, form, origin_lang (Latin/Greek/Proto-Germanic…), meaning
Mnemonic        word_id, type(sound|image|story|bridge), text, for_mode(kid|adult)
Bridge          word_id, other_word_id, type(cognate|false_friend|literal|shared_root), note
Relation        word_id, other_word_id, type(synonym|antonym|family|confusable)

Account         id, country, consent_records          (no email address stored)
EmailLink       email_key (keyed hash), account_id, profile_id   (no email address stored)
Profile         id, account_id, name, avatar, birth_year, mode(kid|teen|adult), ui_lang
Track           profile_id, lang, kind(native|learner), bridge_lang, wl, words_per_day, theme_on
CardState       profile_id, word_id, card_type, fsrs{stability, difficulty, due, reps,
                lapses, state}, mastery, known_flag
ReviewLog       profile_id, card_id, ts, rating, elapsed_ms, scheduled_days
DailyPlan       profile_id, track_id, date, new_word_ids[], completed_at
Test            id, profile_id, kind(daily|weekly|monthly|adhoc|levelup|assigned),
                spec{range, themes, types, length, timed}, questions[], score, started/finished
Assignment      from_profile_id, to_profile_id, word_list[] | test_spec, due
```

### 9.4 Key algorithms (pseudo-code)

**Daily plan**
```text
due = cards where due <= today
if count(due) > 4 * words_per_day: suggest review day
pool = level_pool(track.wl) ∪ sample(level_pool(track.wl+1), 15%)
pool -= seen ∪ known ∪ assigned_already
prefer theme_of_week; spread confusables ≥ 3 days; mix POS
new = assignment_words first, then top-ranked from pool (by level_score)
```

**Weekly test builder**
```text
words = introduced this week
      + top 20% of older words by (due soon, high lapses)
for each word: pick a question type not used for it in the last test,
  biased toward recall as mastery rises
distractors = studied words, same POS, ±1 WL, not synonyms
shuffle; cap length by mode
```

### 9.5 Accounts, sign-in and progress sync

**Sign-in flow**
1. First launch: **"Continue with Google"** (one tap, Firebase `signInWithPopup` / native Google sign-in on mobile), **"Continue with email"** (one-time code, below), or **"Try without an account"**.
2. "Try without an account" uses Firebase *anonymous* auth, so progress is still saved to the backend; later "Save my progress" links a Google account (`linkWithCredential`) or an email code, and nothing is lost.
3. The signed-in account is the **family owner** (the parent, or the adult learner). The parent adds child profiles; on a shared tablet a profile picker opens with a picture-PIN. Leaving kid mode needs the parent PIN.
4. **Child profiles can add an email** (optional, parent-approved): the child can then sign in on their *own* device with a code and lands only in their own profile (no parent area, no other profiles).
5. Same account on phone, tablet and web: progress follows the learner.

**Email sign-in / linking with a one-time code — without storing the address**
- Shown to users everywhere an email is entered: *"We don't store your email address. We use it only to send you a sign-in code."* (Also stated in the privacy policy.)
- Flow:
  1. The user (adult, or a child with parent approval) types an email. A Cloud Function normalises it (trim, lower-case) and computes `email_key = HMAC-SHA256(server secret, email)`. The secret lives in Secret Manager, never in the database, so the keys can't be reversed by guessing addresses from a leaked database.
  2. The function creates a random 6-digit code, stores only `{email_key, HMAC(code), expiresAt: +10 min, attempts: 0}` and asks the email service to send the code. The plain address is then discarded: not written to Firestore, not logged.
  3. The user types the code. The function checks it (max 5 tries, rate-limited per key and per IP), deletes the code record, and looks up `emailLinks/{email_key}`.
  4. **Linking** (from a profile's settings or the parent dashboard): writes `emailLinks/{email_key} = {ownerUid, profileId}`. For a child profile the parent confirms with the parent PIN first.
     **Signing in**: if the key is linked, the function returns a Firebase *custom token* for that account, with a `profileId` claim for child profiles; security rules then limit a child session to that one profile.
- Because the address is not stored, the app can't show it back ("Email linked ✓" only), can't send newsletters, and a forgotten address can't be looked up. To change it: unlink and link a new one. "Delete my data" removes the link.
- Google sign-in: Google gives the app an email as part of the sign-in; Firebase Authentication keeps it inside its own user record (that is how Google accounts work there), but the app never copies it into its database. The weekly parent summary is sent to that Google address read at send time; email-code accounts get the summary in the app / as a push notification instead.
- Why not Firebase's built-in email-link sign-in: it stores the address in Firebase Authentication, so the custom-token flow above is used to keep the "no stored email" promise.
- The email service (e.g. a transactional provider) necessarily processes the address to deliver the code: pick one with an EU region, short log retention and address logging switched off, and name it in the privacy policy.

**What is stored on the backend (Firestore)**
```text
users/{uid}                                  owner settings, consent record, plan
users/{uid}/profiles/{pid}                   name, avatar, birth year, mode, UI language
users/{uid}/profiles/{pid}/tracks/{lang}     track kind, level (WL/CEFR), words/day, streak
users/{uid}/profiles/{pid}/cardsets/{lang_n}   FSRS states packed ~200 cards per doc:
                                             stability, difficulty, due, reps, lapses,
                                             mastery, updatedAt per card (see 9.7)
users/{uid}/profiles/{pid}/days/{yyyy-mm-dd} that day's new words, review log (array),
                                             minutes spent, quiz score
users/{uid}/profiles/{pid}/tests/{testId}    spec, questions, answers, score
users/{uid}/assignments/{id}                 parent/teacher word lists and tests
```
- **One "day" document per profile per day** holds that day's review log as an array. With card states packed into a few documents (9.7), a 10-minute session costs ~6 writes, not one per card, which keeps Firestore inside its free tier for a long time (free tier: 20k writes / 50k reads per day).
- Security rules: a user can only read and write under their own `users/{uid}`.
- **Offline-first**: the app works fully offline (IndexedDB + Firestore offline persistence) and syncs when back online. Card states merge by latest `updatedAt`; review logs are append-only, so FSRS state can always be recomputed from them if two devices conflict.
- Progress screens (weekly charts, streaks, test history, parent dashboard) read from the `days` and `tests` documents; a nightly Cloud Function writes small weekly summary documents so charts load fast and the weekly parent email is cheap to build.
- Export (JSON/CSV) and "delete my data" per profile.

### 9.6 Storage needed for word content and progress

> **Family edition:** text only (no audio files or illustrations): ~1.2 KB per card compressed, ~5 MB for 4,500 words on the server and at most ~5–10 MB per device, plus ~2 MB of progress data per person per year.

Measured on the sample cards (`docs/vocab-pipeline/samples/`): a full card is **~3 KB of JSON** (≈1 KB compressed). Cards with 3 senses or full verb tables are larger, so the estimate uses **3.5 KB per card (~1.2 KB compressed)**.

**Content (the same for all users)**
| Item | Per word | Per language (4,000 words) | All 3 languages |
|---|---|---|---|
| Card text (JSON) | 3.5 KB (1.2 KB compressed) | 14 MB (5 MB compressed) | 42 MB (15 MB compressed) |
| Search index (lookup tier 1) | — | 1–2 MB | 3–6 MB |
| Audio: word + slow word + 3 example sentences + kid definition, Opus/AAC mono ~24 kbps (~3 KB per second) | ~45 KB | ~180 MB | ~540 MB |
| Pictures: 1 WebP illustration, 512 px, for ~70% of words | ~30 KB | ~85 MB | ~250 MB |
| **Total** | **~70 KB** | **~280 MB** | **~850 MB** |
| Optional dictionary tier 2 (30–60k extra entries, text only) | — | 10–25 MB compressed | 30–75 MB |

Cheaper option: play example sentences with the device's built-in text-to-speech and keep recorded audio only for the word itself; audio then drops to ~9 KB per word (~110 MB for all three languages, ~400 MB total).

- **Backend (Cloud Storage / CDN)**: ~0.9 GB, or ~2–3 GB when keeping old content versions. Storage costs only cents per month; the larger cost is download traffic, ~5–30 MB per new user.

**In the app (on the device)**
| What | Size |
|---|---|
| Text packs for the learner's current + next level, one language | ~1.5 MB (400–800 words) |
| All card text for all three languages (if downloaded) | ~45 MB |
| Audio + pictures, cached only for words actually studied (~1,000 words per year at 3/day) | ~70 MB per year; capped at ~150 MB by default, oldest mastered words' media are cleared first and re-downloaded if needed |
| "Download this level for offline" (400 words with all media) | ~30 MB |
| Progress data (mirror of the backend) | ~2 MB per profile per year |

So a typical child profile uses **~5 MB plus ~70 MB of cached media per year**, well within what browsers and phones allow for a PWA (the app asks for persistent storage so the cache is not cleared).

**Progress data (backend, Firestore)**
| Item | Per profile per year |
|---|---|
| Card states (~1,000 words × ~3 card types × ~300 bytes) | ~0.9 MB |
| Daily records with review logs (~2 KB per day) | ~0.7 MB |
| Tests, weekly summaries, settings | ~0.1 MB |
| **Total** | **~1.7–2 MB** |

Example: 1,000 families with 3 profiles each ≈ 6 GB after a year, about $1 per month of Firestore storage (the free tier covers the first 1 GB). Review logs older than a year can be compacted into monthly summaries if needed.

### 9.7 Server running costs

> **Family edition (~20 users):** $0 per month: GitHub Pages hosting, Firebase free plan, browser voices instead of audio files. The table below is for larger scales.

**Design choice that keeps costs low**: card states are packed into a few documents per track (~200 cards per document, a few KB each) rather than one document per card, and the app saves at the end of a session or every minute. A 10-minute session is then ~10 reads and ~6 writes, whatever the number of cards reviewed. Scheduling, tests and grading run on the device, so there are no per-question server calls.

**Usage per monthly active profile** (≈20 active days/month): ~200 Firestore reads, ~120 writes, ~0.2 MB new data, ~8 MB of content download (text packs + audio/pictures for new words, initial download spread over the year), ~30 small background function runs (nightly summaries), ~0.5 email codes.

**Prices used** (Firebase / Google Cloud list prices as last known; check the current pricing pages before budgeting):
| Service | Free each month / day | Then |
|---|---|---|
| Firestore | 50k reads, 20k writes, 20k deletes per **day**; 1 GiB stored | ~$0.06 / 100k reads, ~$0.18 / 100k writes, ~$0.18 per GiB-month (multi-region; single region is cheaper) |
| Firebase Hosting (content packs, media) | 10 GB stored, ~10 GB transfer / month | ~$0.15 / GB transfer |
| Cloudflare R2 (alternative for media) | 10 GB stored, 10M reads / month | ~$0.015 / GB-month, **no download fees** |
| Cloud Functions | 2M invocations / month | ~$0.40 per million + small compute |
| Firebase Authentication | Google and custom-token sign-in free on the basic tier | if the project is upgraded to Identity Platform: 50k MAU free, then roughly $0.005 per MAU |
| Email codes (e.g. Amazon SES or a provider's free tier) | ~3,000 emails / month free on many providers | ~$0.10 per 1,000 (SES) |

Firebase needs the pay-as-you-go **Blaze plan** for Cloud Functions; the free quotas above still apply on Blaze. Set a budget alert (e.g. $10) on day one.

**Estimated monthly cost (no AI extras)**
| Monthly active profiles | Firestore | Content download (Hosting / R2) | Functions + email | **Total** |
|---|---|---|---|---|
| ≤ 300 (family, friends, a class) | $0 | $0 | $0 | **~$0** |
| 1,000 | ~$0 (inside free tier) + ~$0.20 storage after a year | ~$0 (8 GB, within free) | ~$0 | **~$0–1** |
| 10,000 | ~$1 ops + ~$3–4 storage after a year | ~$10 Hosting / ~$0 R2 | ~$0–5 | **~$5–20** |
| 100,000 | ~$30 ops + ~$35 storage after a year | ~$120 Hosting / ~$30 R2 (request fees) | ~$10–20 | **~$100–200** |

That is roughly **$0.001–0.002 per active profile per month**. Content storage itself (~1–3 GB including old versions) costs a few cents.

**Things that change the picture**
- **Media download is the biggest line** at scale: serving audio and pictures from Cloudflare R2 (no download fees) instead of Firebase Hosting cuts it by ~75%. Using the device's built-in voice for example sentences (§9.6) roughly halves media size again.
- **Identity Platform**: if the project uses it (needed for some enterprise features, not for Google sign-in or the email-code flow here), 100k monthly users would add roughly $250 per month. Stay on basic Firebase Authentication unless a feature needs it.
- **Optional AI extras** (§11.2) cost more than everything above: about $0.0002 per sentence check on Claude Haiku 5.5. A teen using it 5 times a day ≈ $0.03 per month, roughly 15–30× the server cost of that profile. Keep the daily limits, or include AI extras only in a paid plan.
- **One-time costs are separate**: content generation (§11.4, ~$1,050 for all three languages with batches) and human review.
- Domain (~$10–15/year) and app store accounts (Apple $99/year, Google Play $25 once) if you ship native apps.

---

## 10. Content creation pipeline

Content quality is the core of the product; this is the biggest effort.

### 10.1 Pipeline
1. **Word lists & levels** — import the lists in §3.2 → lemmatise → compute WL → editor review of each level.
2. **Base data** — part of speech, gender, plural, IPA, senses, etymology roots, synonyms from **Wiktionary** (CC BY-SA) and **Open Multilingual Wordnet**; cross-language links from Wiktionary translations and etymology sections.
3. **Draft generation with an LLM** — kid definitions, 3 example sentences per sense, kid etymology story, mnemonics, bridge notes, distractors, cloze sentences for tests. Prompted with level constraints ("use only words at WL ≤ n").
4. **Automatic checks**
   - The target word (or an inflected form) appears in each example.
   - Readability: definitions/examples use only words below the target level (checked against the level lists); sentence length limits per mode.
   - Safety filter: no violence/romance/brand names/stereotypes in kid content.
   - Etymology claims cross-checked against Wiktionary roots; unverifiable stories are rejected (no invented "folk" etymologies presented as fact — playful mnemonics are labelled as tips, not history).
   - Bridges: false-friend list check; cognate must share a root in data.
5. **Human review** — native-speaker editors per language, mandatory for WL 1–6 (kids) and for all etymology; spot checks above that. Review tool shows the card exactly as the app will.
6. **Audio** — neural TTS per language with human spot checks; real recordings from **Lingua Libre / Wikimedia Commons** where available; slow version for kids.
7. **Images** — commissioned or AI-generated illustrations in one consistent style, reviewed; abstract words get small scenes.
8. **Publish** — versioned packs; in-app "Report a problem" feeds back to the review queue.

### 10.2 Launch content size
| | EN | DE | FR |
|---|---|---|---|
| Native track WL 1–8 | 2,400 | 2,000 | 2,000 |
| Learner track A1–B2 | 3,000 | 3,000 | 3,000 |
| Total unique lemmas (overlap merged) | ~4,000 | ~3,800 | ~3,800 |

At 3 words/day a child uses ~1,000 words/year, so WL 1–4 (≈1,200 words) covers more than a year for young users.

### 10.3 Licensing to verify
- Wiktionary / Wikimedia: CC BY-SA — attribution needed; derived *data* may need to stay share-alike. Keep Wiktionary-derived fields separate from original writing.
- Grade/frequency lists (childLex, Manulex, Dubois-Buyse, AoA norms, SUBTLEX): several are free for research only — use them to *assign levels* (facts), not redistribute the lists; confirm terms.
- Do not copy dictionary definitions or Etymonline text (copyrighted); write originals.

---

## 11. AI: where it is used, and running without it

### 11.1 The app runs with no AI at run time
All learning content is generated and reviewed **ahead of time** and shipped as static packs. Everything the learner does at run time is plain code on the device:
- daily word selection, FSRS scheduling, test building and distractors (pre-computed), grading (string match with accent/umlaut tolerance), progress charts, dictionary search.

So the core app needs **no API key, no tokens and no network** to run (network only for sync and downloading packs). AI is a build-time tool, plus a few optional extras below.

### 11.2 Optional AI extras (off by default for kids)
Served through a Cloud Function that holds the API key (never in the app), with per-profile daily limits:
- "Use it" feedback on the learner's own sentence (teen/adult; kids only with parent opt-in, text not stored).
- "Explain more" about the current word, limited to that word.
- Personalised memory tip ("make me a memory tip with football").
- On-demand card for a tier-2 dictionary word (cached and sent to editorial review).
These are small, cheap requests: a sentence check is ~600 input + ~200 output tokens, about $0.0002 on Claude Haiku 5.5, so even heavy use is a few cents per user per month.

### 11.3 Which Claude model for what
| Job | Model | Why |
|---|---|---|
| Bulk card drafting (definitions, examples, kid stories, mnemonics, distractors) | **Claude Opus 5.5** | Strong multilingual writing at half Fable's price; good default |
| **Quality pass**: verify etymology claims, cognates / false friends across EN-DE-FR, check kid content for levels WL 1–4, judge grammar-table explanations | **Claude Fable 5.2** | Most capable model; errors here (a wrong etymology, a "cognate" that is a false friend) are the costliest mistakes. Also used to design the prompts and grading rubric, and to review sample batches before each full run |
| Cheap automatic checks (word appears in sentence, readability, length, format) and run-time extras | **Claude Haiku 5.5** | Very cheap, fast |
| Inflection / case tables | none | Imported from dictionary data (4.6) |

Run generation through the **Message Batches API** (50% off, results within 24 hours) with prompt caching on the shared instructions. Use structured outputs so every card comes back as JSON that matches the schema.

### 11.4 How many tokens does content generation take?

> **Family edition:** use the open-data route instead (`docs/vocab-pipeline/opendata/`): facts, grammar tables, translations and example sentences come free from Wiktionary and Tatoeba, and AI writes only the kid-friendly text, about 700 tokens per word. Cost: ~$0.20 per 1,500 words with Claude Haiku 5.5 batches (~$0.60 for three languages), ~$4 per 1,500 with Sonnet 5.5, or $0 through chat subscriptions. The estimate below is for fully AI-written cards and is kept for reference.
Assumptions per curated word: generation ≈ 2k input + 3k output tokens (both kid and adult versions of every section, 3 examples, story, tips, bridges, distractors, cloze sentences; output includes the model's thinking), plus a review pass ≈ 3k input + 1k output. Add 30% for retries and regenerated cards.

| | Words | Input tokens | Output tokens |
|---|---|---|---|
| Per language (~4,000 curated words) | 4,000 | ~27M | ~20M |
| **All three languages** | ~12,000 | **~80M** | **~60M** |

Estimated cost for the full curated set (all three languages), at current list prices:
| Setup | Standard | With Batch API (−50%) |
|---|---|---|
| All on Claude Opus 5.5 | ~$1,500 | **~$760** |
| All on Claude Fable 5.2 | ~$3,000 | ~$1,500 |
| **Recommended**: Opus 5.5 drafts + Fable 5.2 review of every card + Haiku 5.5 checks | ~$2,100 | **~$1,050** |
| All on Claude Sonnet 5.5 (cheaper alternative to test) | ~$760 | ~$380 |

That is roughly **$350 per language** (batched) for the recommended setup, a one-time cost; updates and corrections later are small. A first prototype (500 English words) costs ~$45 batched. Wall-clock time is about 1–2 days per language with batches, the real bottleneck being human review (§10.1 step 5), not tokens.

Cheaper route for part of the work: the prompts and checker in `docs/vocab-pipeline/` produce the same card format by hand in ChatGPT, Gemini or Claude chat subscriptions. Good for the prototype and for cross-model review; bulk generation is better done through the API.

Tier-2 dictionary (§8.1): base entries come free from Wiktionary data; generating short kid-friendly definitions for, say, 30k extra words per language is ~0.5k input + 0.6k output each — about 100M tokens for all three languages: ~$15 on Haiku 5.5 or ~$315 on Sonnet 5.5 with batches. Better done lazily for words people actually look up.

All AI outputs for kid profiles go through the same safety filter; no free-form chat for kids.

---

## 12. Privacy, safety, accessibility
- **Children's privacy**: COPPA (US), GDPR-K (digital consent age 16 in Germany, 15 in France) — the parent account gives consent; **no email address is ever stored** (child or adult — only a keyed hash to recognise a linked email, see 9.5), no exact birthdate (birth year only), no free-text sharing. A child profile can link an email only with parent approval.
- No third-party ads or tracking SDKs; analytics are first-party, aggregate, and opt-in for adults.
- Data export & delete per profile.
- **Accessibility**: WCAG 2.2 AA; screen-reader labels; dyslexia-friendly font (e.g. OpenDyslexic / Lexend) option; article colours also shown as text (colour-blind safe); captions on all audio; reduce motion setting.

---

## 13. Success metrics
- Day-7 / Day-30 retention of daily habit (target D30 ≥ 35% for families).
- **Retention of learned words**: % correct on monthly test for words learned 4+ weeks ago (target ≥ 80%).
- Words mastered per active week.
- Placement accuracy: % of new words marked "already known" (target 10–30%; outside means wrong level).
- Content quality: reports per 1,000 card views (target < 2).

---

## 14. Roadmap

| Phase | Scope | Rough effort |
|---|---|---|
| **0. Prototype** (4–6 wks) | English native track WL 1–4 (~500 words), daily words, flashcards with FSRS, weekly test, **Google sign-in + Firestore progress sync**, single profile, offline PWA | 1–2 devs + 1 editor |
| **1. MVP** (3 mo) | EN + DE + FR native tracks WL 1–6; learner track A1–A2; family profiles; parent dashboard; monthly & ad-hoc tests; bridges; audio; **German/French grammar blocks**; **dictionary tier 1** | + 1 editor per language |
| **2. v1** (6 mo) | All levels to WL 8 / B2; placement test; themes; school word-list import; badges & word garden; case/conjugation test types; native app wrappers | |
| **3. v2** | **Dictionary tier 2**, classroom/teacher mode, optional AI extras (sentence feedback, explain more), speech practice, more languages (Spanish, Italian — reuse Latin-root bridges) | |

---

## 15. Open questions
1. Free vs paid: free core with a family subscription for extra languages/levels/tests? (No ads either way.)
2. Should the learner track for kids follow the school curriculum (e.g. English in German Grundschule from grade 3) — possibly by textbook unit?
3. How much to rely on LLM-drafted content vs fully hand-written for the youngest levels?
4. Spelling as a core feature for native kids (strong demand in DE/FR schools) or an add-on?
5. Teacher/classroom mode: in scope for v1 or later?
