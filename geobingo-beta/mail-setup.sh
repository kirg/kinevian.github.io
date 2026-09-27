#!/usr/bin/env bash
# geobingo — switch on feedback emails (each bug report / idea from the app is mailed to you via Gmail).
# Run in Google Cloud Shell:   curl -fsSL https://kinevian.com/geobingo-beta/mail-setup.sh -o m.sh && bash m.sh
# Needs a Gmail *app password* (https://myaccount.google.com/apppasswords — requires 2-Step Verification).
# Contains no secrets. Safe to run again (it replaces the stored password).
set -u
REGION=europe-west1
say() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
read -rp "Project ID [${PROJECT_ID:-geobingo-509810}]: " P
PROJECT_ID="${P:-${PROJECT_ID:-geobingo-509810}}"
gcloud config set project "$PROJECT_ID" >/dev/null
API_SA="geobingo-api@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOY_SA="geobingo-deploy@$PROJECT_ID.iam.gserviceaccount.com"
read -rp "Send feedback to (your Gmail address): " TO
[ -z "$TO" ] && { echo "No address — stopping."; exit 1; }

say "1/3 The Gmail app password"
echo "Paste the 16-letter app password (it stays hidden), then press Enter:"
read -rs PASS; echo
PASS="${PASS// /}"
[ ${#PASS} -lt 16 ] && { echo "That doesn't look like an app password (16 letters) — stopping."; exit 1; }
if gcloud secrets describe smtp-password >/dev/null 2>&1; then
  printf '%s' "$PASS" | gcloud secrets versions add smtp-password --data-file=- >/dev/null
else
  printf '%s' "$PASS" | gcloud secrets create smtp-password --data-file=- >/dev/null
fi
unset PASS
gcloud secrets add-iam-policy-binding smtp-password --member="serviceAccount:$API_SA" --role=roles/secretmanager.secretAccessor >/dev/null
# Lets the GitHub deploy see that the secret exists, so later deploys keep emails on.
gcloud secrets add-iam-policy-binding smtp-password --member="serviceAccount:$DEPLOY_SA" --role=roles/secretmanager.viewer >/dev/null
echo "Stored."

say "2/3 Switching the API over"
gcloud run services update geobingo-api --region "$REGION" \
  --update-secrets SMTP_PASSWORD=smtp-password:latest --update-env-vars "FEEDBACK_EMAIL=$TO" >/dev/null && echo "Done." || { echo "❌ Couldn't update the service — send Claude the lines above."; exit 1; }

say "3/3 Test"
URL=$(gcloud run services describe geobingo-api --region "$REGION" --format 'value(status.url)')
curl -fsS -X POST "$URL/feedback" -H 'content-type: application/json' \
  -d '{"kind":"other","text":"Test from mail-setup.sh — feedback emails work.","channel":"setup"}' >/dev/null \
  && echo "✅ Sent a test — check $TO in a minute (look in spam the first time)." \
  || echo "❌ The test didn't go through — send Claude the lines above."
