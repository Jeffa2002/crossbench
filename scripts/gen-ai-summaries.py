#!/usr/bin/env python3
"""
Generate AI summaries (via Claude Haiku) for hist_ bills that are missing them.
Uses title + APH description (no full text for historical bills).
Rate-limited to ~1 req/sec to stay within Anthropic limits.
"""
import json, time, re, urllib.request, urllib.error, psycopg2

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"

# Load API key
import subprocess
result = subprocess.run(
    ["grep", "ANTHROPIC_API_KEY", "/var/www/crossbench/.env"],
    capture_output=True, text=True
)
API_KEY = result.stdout.strip().split("=", 1)[-1].strip().strip('"').strip("'")
print(f"Anthropic key loaded: {API_KEY[:15]}...")

CLAUDE_URL = "https://api.anthropic.com/v1/messages"

def call_claude(prompt: str, max_tokens=400) -> str | None:
    payload = json.dumps({
        "model": "claude-haiku-4-5",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()
    req = urllib.request.Request(
        CLAUDE_URL,
        data=payload,
        headers={
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
                return data["content"][0]["text"].strip()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    API error {e.code}: {e.read()[:200]}")
                return None
        except Exception as e:
            print(f"    API error: {e}")
            if attempt < 2:
                time.sleep(5)
    return None

def build_prompt(title, chamber, status, sponsor, portfolio, description):
    parts = [f"Bill: {title}", f"Chamber: {chamber}", f"Status: {status}"]
    if sponsor:
        parts.append(f"Introduced by: {sponsor}")
    if portfolio:
        parts.append(f"Portfolio: {portfolio}")
    context = "\n".join(parts)

    if description and len(description) > 50:
        context += f"\n\nDescription: {description[:1500]}"
        return f"""You are summarising an Australian parliamentary bill for everyday citizens on a civic tech platform called Crossbench.

{context}

Write a plain-English summary for regular Australians (2-4 sentences):
- What this bill actually does
- Who it affects and why it matters
- One specific detail worth knowing (if available)

Be concrete and specific. No jargon. No "This bill..." opener. Don't start with "I" or "The bill"."""

    else:
        return f"""You are summarising an Australian parliamentary bill for everyday citizens on Crossbench.

{context}

Based on the title alone, write a brief 2-3 sentence plain-English explanation of what this bill likely does and why it might matter to Australians. Be honest if you're inferring from the title. No jargon."""

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Find hist_ bills missing AI summaries
    cur.execute("""
        SELECT id, title, chamber::text, status, "sponsorName", portfolio, "aphDescription"
        FROM "Bill"
        WHERE id LIKE 'hist_%'
          AND ("aiSummary" IS NULL OR "aiSummary" = '')
          AND status IN ('Passed', 'Not Passed')
        ORDER BY "parliamentNumber" DESC, "introducedAt" DESC NULLS LAST
    """)
    bills = cur.fetchall()
    print(f"Bills needing AI summaries: {len(bills)}")

    done = 0
    skipped = 0
    errors = 0

    for row in bills:
        bill_id, title, chamber, status, sponsor, portfolio, description = row

        print(f"\n[{done+1}/{len(bills)}] {title[:65]}...")

        prompt = build_prompt(title, chamber, status, sponsor, portfolio, description)
        summary = call_claude(prompt)

        if not summary:
            errors += 1
            print("  SKIP (API error)")
            time.sleep(2)
            continue

        if len(summary) < 20:
            skipped += 1
            print(f"  SKIP (too short: {repr(summary)})")
            continue

        try:
            cur.execute("""
                UPDATE "Bill"
                SET "aiSummary" = %s, "updatedAt" = NOW()
                WHERE id = %s
            """, (summary, bill_id))
            conn.commit()
            done += 1
            print(f"  OK: {summary[:80]}...")
        except Exception as e:
            print(f"  DB error: {e}")
            conn.rollback()
            errors += 1

        time.sleep(1.1)  # ~1 req/sec to stay within limits

        if done % 50 == 0:
            print(f"\n--- Progress: {done} done, {skipped} skipped, {errors} errors ---\n")

    cur.close()
    conn.close()
    print(f"\n=== Done: {done} summaries generated, {skipped} skipped, {errors} errors ===")

if __name__ == "__main__":
    main()
