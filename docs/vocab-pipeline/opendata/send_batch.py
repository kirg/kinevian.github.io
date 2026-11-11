#!/usr/bin/env python3
"""Send ai/<lang>.requests.jsonl to the Claude Message Batches API (50% cheaper) and save the results.

  pip install anthropic
  export ANTHROPIC_API_KEY=...            # your own key
  python3 send_batch.py ai/de.requests.jsonl            # submit, wait, save ai/de.results.jsonl
  python3 send_batch.py --resume msgbatch_... ai/de.requests.jsonl   # pick up an earlier batch

Most batches finish within an hour (at most 24 h). The script prints the batch id first,
so you can stop it and resume later.
"""
import argparse
import json
import sys
import time

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("requests")
    ap.add_argument("--resume", help="existing batch id")
    a = ap.parse_args()
    out = a.requests.replace(".requests.jsonl", ".results.jsonl")
    client = anthropic.Anthropic()

    if a.resume:
        batch_id = a.resume
    else:
        reqs = [json.loads(l) for l in open(a.requests, encoding="utf-8") if l.strip()]
        batch = client.messages.batches.create(requests=[
            Request(custom_id=r["custom_id"], params=MessageCreateParamsNonStreaming(**r["params"])) for r in reqs])
        batch_id = batch.id
        print(f"submitted {len(reqs)} requests as batch {batch_id}")

    while True:
        b = client.messages.batches.retrieve(batch_id)
        if b.processing_status == "ended":
            break
        print(f"  {b.processing_status}: {b.request_counts.processing} still processing…")
        time.sleep(60)

    ok, failed, usage_in, usage_out = 0, [], 0, 0
    with open(out, "w", encoding="utf-8") as f:
        for res in client.messages.batches.results(batch_id):
            if res.result.type != "succeeded":
                failed.append(f"{res.custom_id}: {res.result.type}")
                continue
            msg = res.result.message
            if msg.stop_reason in ("refusal", "max_tokens"):
                failed.append(f"{res.custom_id}: stopped ({msg.stop_reason})")
                continue
            text = next((blk.text for blk in msg.content if blk.type == "text"), "")
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                failed.append(f"{res.custom_id}: reply was not valid JSON")
                continue
            data["custom_id"] = res.custom_id
            f.write(json.dumps(data, ensure_ascii=False) + "\n")
            ok += 1
            usage_in += msg.usage.input_tokens + (msg.usage.cache_read_input_tokens or 0) + (msg.usage.cache_creation_input_tokens or 0)
            usage_out += msg.usage.output_tokens
    print(f"saved {ok} results to {out}; tokens used: {usage_in:,} input, {usage_out:,} output")
    if failed:
        print("not saved (re-run build.py ai-requests later; merge shows which words still wait):")
        print("\n".join("  " + x for x in failed))
        sys.exit(1)


if __name__ == "__main__":
    main()
