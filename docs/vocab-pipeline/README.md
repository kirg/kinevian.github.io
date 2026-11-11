# WordWise content kit: ChatGPT, Gemini and Claude

Generate word cards with the chat subscriptions you already pay for (ChatGPT Plus, Gemini Pro, Claude), in one fixed format that the app can use directly.

| File | What it is |
|---|---|
| `prompts/00-setup-card-writer.md` | The rules and card format. Paste once into a ChatGPT Project / custom GPT, a Gemini Gem, or a Claude Project |
| `prompts/01-word-list.md` | Optional: ask for candidate words for a level |
| `prompts/02-draft-batch.md` | The message you send per batch of ~10 words |
| `prompts/03-review-batch.md` | Have a *different* model check and correct a batch |
| `tools/validate.py` | Checks pasted output, writes a "fix these" message, merges good cards |
| `samples/sample-cards.jsonl` | Two finished cards (EN *curious*, DE *Apfel*) |

## Workflow (per batch of 10 words)
1. **Draft**: in the tool's Project/Gem, send a batch from `02-draft-batch.md`. Copy the reply's code block into `drafts/<lang>/<batch-id>.<tool>.jsonl`.
2. **Check**: `python3 tools/validate.py drafts/de/de-wl3-007.chatgpt.jsonl --fix-prompt`
   If there are errors, paste the printed "Fix these cards…" message back into the same chat and replace the bad lines.
3. **Review with another model**: send `03-review-batch.md` with the drafted lines to a different tool. Save the reply as `…<tool>.reviewed.jsonl` and validate it again.
4. **Merge**: `python3 tools/validate.py drafts/de/*.reviewed.jsonl --merge content/`
   Rejected cards are skipped. `content/<lang>.jsonl` is what the app's content packs are built from.
5. **Human check**: a native speaker skims each merged batch, especially WL 1–4 (kids). Grammar tables are later re-checked automatically against Wiktionary data (design doc §4.6).

## Splitting the work between tools
| Job | Suggested tool | Why |
|---|---|---|
| Draft English + French | ChatGPT | Good, fast drafting |
| Draft German | Gemini | Splits the load; strong multilingual writing |
| Review the other tool's batches | the other one, with web search on | Two different models catch more mistakes than one checking itself |
| Final check of kid levels WL 1–4, all etymology and false-friend links, and anything flagged | Claude (Project with the same setup prompt), or Claude Fable 5.2 via the API | The facts that matter most |

Rotate drafting and review between ChatGPT and Gemini each day, so neither subscription's daily limit stops you.

## How much can the subscriptions realistically cover?
- These are chat apps with usage limits that change over time, and copying is manual: about **3–5 minutes per batch of 10 words** including review and validation.
- **Prototype (500 words)**: ~50 draft + 50 review batches, roughly 5–8 hours spread over a few days. **Good fit**: costs nothing extra.
- **Full set (~12,000 words, three languages)**: ~1,200 draft + 1,200 review batches, about 150+ hours of copy-paste. That is a lot of manual work to save roughly $1,000 of API cost (design doc §11.4).
- **Recommended mix**: use the subscriptions for the prototype, for word lists, and for reviewing and spot-checking; use the API with the Batch API for bulk generation, using the same setup prompt as the system prompt and the same batch messages. The output format is identical, so cards from both routes merge the same way.

## Rules worth knowing
- Use the chat apps by hand. Scripts or bots that drive the ChatGPT or Gemini web apps are against their terms of use; automate only through their paid APIs.
- Check each provider's current terms for commercial use of outputs before launch (at the time of writing, OpenAI, Google and Anthropic consumer terms let you use outputs you generate, but review them).
- Don't paste personal data (children's names, emails) into any prompt. The batch messages contain only words.
