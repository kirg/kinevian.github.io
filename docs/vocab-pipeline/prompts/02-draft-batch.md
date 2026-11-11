# Draft batch — message template

Send this in a chat that already has the setup prompt (00-setup-card-writer.md). Change the header lines and the word list each time. Start with **10 words per batch**; go up to 20 only if replies come back complete.

Save the reply's code block as `drafts/<lang>/<batch-id>.<tool>.jsonl` (for example `drafts/de/de-wl3-007.gemini.jsonl`) and run the validator (see README).

---

```
BATCH de-wl3-007
Language: de
Track: native            (native = learner already speaks it; learner = learning it as a foreign language)
Level: WL3 (Klasse 4)
Theme: food
English spelling: US
Words (lemma | pos | optional sense hint):
Apfel | noun
helfen | verb
schälen | verb
Birne | noun | the fruit, not the light bulb
süß | adjective
sauer | adjective
mit | preposition
Frühstück | noun
probieren | verb
knusprig | adjective

Write one card per word following the WordWise rules. Reply with only one ```jsonl code block, one card per line, in this order.
```

---

## Shorter follow-ups in the same chat
- Next batch: send only a new header + word list (the rules stay in the chat).
- Reply cut off: `Continue from the next word after "<last lemma>". Same format, only the remaining cards.`
- Validator errors: `Fix these cards and resend only them, same format:` followed by the error lines from the validator.
