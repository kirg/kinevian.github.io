# Review batch — cross-check another model's cards

Use a **different** model from the one that drafted the batch (Gemini reviews ChatGPT's cards and the other way round; Claude reviews the kid levels WL 1–4 and anything flagged). Paste the setup prompt first (or use the same Project / Gem), then this message with the drafted lines pasted at the end.

If the tool can search the web (ChatGPT search, Gemini with Google Search), say "use web search to verify etymology and false friends" at the top. It helps for the facts most often wrong.

Save the reply as `drafts/<lang>/<batch-id>.<tool>.reviewed.jsonl`.

---

```
REVIEW BATCH de-wl3-007
You are now the reviewer, not the author. Check every card below against the WordWise rules and against facts. For each card:

1. Facts: definitions, translations, IPA, every grammar form (articles, plurals, all 4 cases, verb forms, auxiliaries, governed case, French genders and plurals). Fix anything wrong.
2. Etymology: keep only well-established history. Remove anything invented or folk etymology. Lower "confidence" when not certain.
3. Bridges: a "cognate" must share origin AND meaning; a "false_friend" must say what it really means. Remove any link you cannot verify.
4. Level: kid_def and kid examples must use only words easier than the target, ≤ 15 / ≤ 12 words for WL ≤ 4, and not use the word itself in kid_def.
5. Examples: natural, correct grammar, target marked with [[ ]] exactly once, translations accurate and natural.
6. Distractors: clearly wrong but plausible; distractor words are not synonyms.
7. Safety and style rules for children.

Reply with only one ```jsonl block: every card again (corrected where needed), same order, with ONE extra field at the end of each line:
"review": {"by": "<your tool name: chatgpt|gemini|claude>", "verdict": "ok" | "fixed" | "reject", "issues": ["short description of each problem you found or fixed"]}
Use "reject" only when the word should not be in this level or the card cannot be fixed (explain in issues).

CARDS:
<paste the drafted jsonl lines here>
```
