# Low-cost word content from free open data

Most of a word card is facts that already exist in free, open datasets, so you can download them instead of paying an AI to write them. AI is only used for the short kid-friendly parts, through the cheapest model or for free through your ChatGPT / Gemini / Claude subscriptions.

| Part of the card | Source | Cost |
|---|---|---|
| Word list and level (by how common a word is) | `wordfreq` Python package | free |
| Meanings (English), pronunciation (IPA), syllables, word history, synonyms, related words | Wiktionary, via kaikki.org downloads | free |
| **German articles, plurals, all 4 cases, verb forms, which case a verb takes; French genders, plurals, conjugations; English irregular forms** | Wiktionary (exact tables, no AI) | free |
| Translations EN ↔ DE ↔ FR | Wiktionary translation tables | free |
| Example sentences + their translations, fill-the-gap sentences | Tatoeba (real sentences by volunteers) | free |
| False friends (Gift = poison, librairie = bookshop…) | `false_friends.tsv` in this folder (add your own) | free |
| Wrong answers for tests (distractor words) | computed by the script | free |
| Picture for concrete nouns | OpenMoji emoji | free |
| Audio | the browser's built-in voices (Web Speech API), no files | free |
| **Kid definition, own-language definition, kid word story, 2 memory tips, wrong meanings, missing translations, a few missing sentences, checking guessed cognates** | AI: Claude Haiku 5.5 batch, or your chat subscriptions | **~$0–1 per 1,500 words** |

## What you need
- A computer with Python 3.10+, ~5 GB free disk for the downloads, an internet connection.
- `pip install wordfreq` (and `pip install anthropic` only if you use the API route).

## Steps
```bash
cd docs/vocab-pipeline/opendata
bash fetch.sh                      # downloads ~3–5 GB once (Wiktionary is the big one)
pip install wordfreq

# 1. candidate words (most common first; the 300 most common are skipped as too easy)
python3 build.py wordlist --lang de --count 1500
#    open lists/de.csv in a spreadsheet: set keep to n for words you don't want,
#    adjust wl (level) and add a theme if you like.

# 2. cards from open data (grammar, meanings, examples, translations, false friends)
python3 build.py cards --lang de

# 3a. AI route (cheapest model, half price with the Batch API, ~$0.20 per 1,500 words with Haiku)
python3 build.py ai-requests --lang de --model claude-haiku-5-5
export ANTHROPIC_API_KEY=...       # your key from console.anthropic.com
python3 send_batch.py ai/de.requests.jsonl

# 3b. OR free route: paste ai/de.chat-001.txt, -002… into ChatGPT / Gemini / Claude one by one
python3 build.py ai-chat --lang de
#     save each reply as ai/de.chat-001.reply.json, ai/de.chat-002.reply.json …

# 4. merge + check
python3 build.py merge --lang de                     # -> cards/de.jsonl
python3 ../tools/validate.py cards/de.jsonl --merge content/
```
`merge` reports cards that still fail a check (they get a `needs-fix` flag and an `_errors` list) and words still waiting for AI text. Run steps 3–4 again for those only; nothing is lost.

## Which AI option?
Measured on the test run: each word needs ~250 input + ~450 output tokens for the AI part (20 words per request, shared instructions cached).

| Option | 1,500 words (one language) | 4,500 words (3 languages) | 12,000 words |
|---|---|---|---|
| ChatGPT / Gemini / Claude subscription, by hand (25 words per message) | $0, ~60 messages, ~2–3 h | $0, ~180 messages | $0, ~480 messages |
| Claude Haiku 5.5, Batch API | **~$0.20** | **~$0.60** | ~$1.60 |
| Claude Sonnet 5.5, Batch API | ~$4 | ~$12 | ~$31 |
| Claude Opus 5.5, Batch API | ~$8 | ~$23 | ~$62 |

Suggested: Haiku for everything, then spot-check ~5% of cards (and every card for the youngest child's level) with `../prompts/03-review-batch.md` in ChatGPT or Gemini, which costs nothing extra. Because the facts come from Wiktionary and Tatoeba, the AI only rewrites and simplifies, which the small model handles well.

## Licences (fine for a family app, just give credit)
- Wiktionary / kaikki.org: CC BY-SA 4.0. Tatoeba: CC BY 2.0 FR. OpenMoji: CC BY-SA 4.0. wordfreq data: CC BY-SA 4.0.
- Add a "Credits" screen in the app naming Wiktionary, Tatoeba, OpenMoji and wordfreq. If the app is public, the word content you publish should carry CC BY-SA too.

## Tested
The scripts were run end-to-end on small sample files in the kaikki.org and Tatoeba formats (German *Apfel, helfen, Gift, Birne*): correct articles, case tables, verb forms (*hilft, half, geholfen*, takes Dativ), translations, Tatoeba examples, the *Gift* false friend, and all cards passed the validator. They have not yet been run on the full downloads (this sandbox can't reach those sites). If a real file differs from what the script expects, the `merge` / validator output will show which fields are missing.
