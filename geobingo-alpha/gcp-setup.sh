#!/usr/bin/env bash
# geobingo — one-time Google Cloud setup for the accounts/leaderboard API.
# Run in Google Cloud Shell:   curl -fsSL https://kinevian.com/geobingo-alpha/gcp-setup.sh -o s.sh && bash s.sh
# Contains no secrets. Safe to run again (steps that already exist are skipped).
set -u
REGION=europe-west1
REPO=kirg/geo   # the GitHub repository allowed to deploy

say() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
try() { "$@" 2>&1 | grep -v -i 'already exists' || true; }

say "Which Google Cloud project?"
DEFAULT="${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
gcloud projects list --format='value(projectId)' 2>/dev/null | sed 's/^/   /'
read -rp "Project ID [${DEFAULT}]: " PROJECT_ID
PROJECT_ID="${PROJECT_ID:-$DEFAULT}"
[ -z "$PROJECT_ID" ] && { echo "No project ID — stopping."; exit 1; }
gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)') || exit 1
API_SA="geobingo-api@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOY_SA="geobingo-deploy@$PROJECT_ID.iam.gserviceaccount.com"

say "1/7 Turning on the services (takes a minute)"
gcloud services enable run.googleapis.com firestore.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com || exit 1

say "2/7 Database (Firestore, $REGION)"
try gcloud firestore databases create --location="$REGION" --type=firestore-native

say "3/7 Storage for the server's container images (keeps the newest 3)"
try gcloud artifacts repositories create geobingo --repository-format=docker --location="$REGION"
cat > /tmp/keep3.json <<'JSON'
[{"name":"keep-3","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":3}},
 {"name":"delete-rest","action":{"type":"Delete"},"condition":{"tagState":"any","olderThan":"1d"}}]
JSON
try gcloud artifacts repositories set-cleanup-policies geobingo --location="$REGION" --policy=/tmp/keep3.json --no-dry-run

say "4/7 Service accounts"
try gcloud iam service-accounts create geobingo-api --display-name="geobingo API (runtime)"
try gcloud iam service-accounts create geobingo-deploy --display-name="geobingo deploy (GitHub Actions)"
sleep 5
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$API_SA" --role=roles/datastore.user --condition=None >/dev/null
for ROLE in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$DEPLOY_SA" --role="$ROLE" --condition=None >/dev/null
done
gcloud iam service-accounts add-iam-policy-binding "$API_SA" --member="serviceAccount:$DEPLOY_SA" --role=roles/iam.serviceAccountUser >/dev/null

say "5/7 Secrets"
if ! gcloud secrets describe session-secret >/dev/null 2>&1; then
  openssl rand -base64 48 | tr -d '\n' | gcloud secrets create session-secret --data-file=- >/dev/null
fi
if ! gcloud secrets describe google-client-secret >/dev/null 2>&1; then
  echo "Paste the OAuth *Client secret* (it stays hidden while you type/paste), then press Enter:"
  read -rs CLIENT_SECRET; echo
  [ -z "$CLIENT_SECRET" ] && { echo "Empty — run the script again when you have it."; exit 1; }
  printf '%s' "$CLIENT_SECRET" | gcloud secrets create google-client-secret --data-file=- >/dev/null
  unset CLIENT_SECRET
else
  echo "Client secret already stored (to replace it: gcloud secrets versions add google-client-secret --data-file=-)"
fi
for S in session-secret google-client-secret; do
  gcloud secrets add-iam-policy-binding "$S" --member="serviceAccount:$API_SA" --role=roles/secretmanager.secretAccessor >/dev/null
done

say "6/7 Keyless deploys from GitHub ($REPO only)"
try gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
# A brand-new pool can take a few seconds to be usable: retry creating the provider until it exists.
for i in 1 2 3 4 5 6; do
  if gcloud iam workload-identity-pools providers describe geo --location=global --workload-identity-pool=github >/dev/null 2>&1; then break; fi
  sleep 5
  gcloud iam workload-identity-pools providers create-oidc geo --location=global --workload-identity-pool=github \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO'" 2>&1 | grep -v -i 'already exists'
done
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" >/dev/null
if gcloud iam workload-identity-pools providers describe geo --location=global --workload-identity-pool=github >/dev/null 2>&1; then
  echo "✅ GitHub login is ready"
else
  echo "❌ The GitHub login provider still doesn't exist — send Claude the lines above this."
fi

say "7/7 Done! Copy everything between the lines and send it to Claude (nothing in it is secret)"
echo "------------------------------------------------------------"
echo "project: $PROJECT_ID"
echo "number: $PROJECT_NUMBER"
echo "region: $REGION"
echo "provider: projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/geo"
echo "deployer: $DEPLOY_SA"
echo "api: https://geobingo-api-$PROJECT_NUMBER.$REGION.run.app"
echo "------------------------------------------------------------"
echo "(Also send the OAuth Client ID — the one ending in .apps.googleusercontent.com.)"
