# Word list — propose candidate words for a level

Optional helper for choosing which words go into a level. The final lists should still be checked against the grade and frequency lists in the design doc (§3.2: Grundwortschatz / childLex for German, Dubois-Buyse / Manulex for French, age-of-acquisition and Academic Word List for English). Ask two different models and keep the words both agree on: that is a cheap quality filter.

No setup prompt needed. Paste into a new chat:

---

```
I am building a vocabulary app. Propose 60 candidate words for this level:

Language: de
Track: native (child already speaks German)
Level: Klasse 4 (age 9–10)
Theme: food (about half the words); the rest general school-age vocabulary

Rules:
- Words a typical child at this stage has met in reading but does not yet use confidently: not too easy (no basic words like "essen", "gut"), not adult-only.
- Mix parts of speech: about 50% nouns, 25% verbs, 20% adjectives, 5% other.
- Lemma form only; no proper names, brands, rude words or very regional words.
- For German nouns give the article.

Reply with only a CSV code block with this header:
lemma,pos,article_or_gender,wl,cefr,theme,why_this_level
Use wl 3 for Klasse 4 (WL scale: 1 = grade 2 … 9 = grade 12). "why_this_level" ≤ 10 words.
```
