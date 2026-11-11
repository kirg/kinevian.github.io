#!/usr/bin/env bash
# Download the free open data WordWise cards are built from, into ./data
# Run on your own computer (needs curl, bunzip2, tar; ~5 GB free disk while unpacking).
# If a link has moved, open the site in a browser and download the same file by hand into the same place.
#
#   bash fetch.sh            # everything
#   bash fetch.sh de         # only what German needs (+ English, used for translations)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data/tatoeba
LANGS="${1:-en de fr}"

get() {  # url  target   (resumes partial downloads, skips finished ones)
  if [ -s "$2" ]; then echo "have $2"; return; fi
  echo "downloading $1"
  curl -L --fail -C - -o "$2.part" "$1" && mv "$2.part" "$2"
}

declare -A KAIKKI=([en]=English [de]=German [fr]=French)
declare -A TATO=([en]=eng [de]=deu [fr]=fra)

# 1. Wiktionary, extracted by kaikki.org (CC BY-SA 4.0). English is always needed: it holds the translation tables.
for l in en $LANGS; do
  n=${KAIKKI[$l]}
  get "https://kaikki.org/dictionary/$n/kaikki.org-dictionary-$n.jsonl" "data/kaikki-$l.jsonl"
done

# 2. Tatoeba example sentences + translation links (CC BY 2.0 FR; some CC0)
for l in en de fr; do
  t=${TATO[$l]}
  get "https://downloads.tatoeba.org/exports/per_language/$t/${t}_sentences.tsv.bz2" "data/tatoeba/${t}_sentences.tsv.bz2"
  [ -s "data/tatoeba/${t}_sentences.tsv" ] || bunzip2 -k "data/tatoeba/${t}_sentences.tsv.bz2"
done
get "https://downloads.tatoeba.org/exports/links.tar.bz2" "data/tatoeba/links.tar.bz2"
[ -s data/tatoeba/links.csv ] || tar -xjf data/tatoeba/links.tar.bz2 -C data/tatoeba

# 3. OpenMoji emoji list (CC BY-SA 4.0): optional picture for concrete nouns
get "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/data/openmoji.json" "data/openmoji.json"

echo
echo "Done. Next:  pip install wordfreq   then   python3 build.py wordlist --lang de --count 1500"
du -sh data 2>/dev/null || true
