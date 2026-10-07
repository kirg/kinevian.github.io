#!/usr/bin/env bash
# geobingo — move the website, the deploys and the hourly reminders to Google (2.135; docs/GOOGLE.md).
# Run in Google Cloud Shell:   curl -fsSL https://geobingo.app/alpha/google-setup.sh -o g.sh && bash g.sh
# Contains no secrets. Safe to run again (what already exists is kept).
#   - Firebase Hosting for geobingo.app (site = the project; keeps the last 10 versions)
#   - Cloud Build: deploys the API (kirg/geo, server/) and the website (kirg/geobingo.app) on every push
#   - Cloud Scheduler: the hourly reminders (POST /push/run), instead of GitHub's scheduler
set -u
REGION=europe-west1
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-geobingo-509810}"
GH_OWNER=kirg

say() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m✅ %s\033[0m\n' "$*"; }
bad() { printf '\033[1;31m❌ %s\033[0m\n' "$*"; }
try() { "$@" 2>&1 | grep -v -i -E 'already exists|ALREADY_EXISTS' || true; }
api() { curl -fsS -H "Authorization: Bearer $(gcloud auth print-access-token)" -H 'Content-Type: application/json' "$@"; }

gcloud config set project "$PROJECT_ID" >/dev/null || exit 1
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)') || exit 1
DEPLOY_SA="geobingo-deploy@$PROJECT_ID.iam.gserviceaccount.com"
echo "Project $PROJECT_ID ($PROJECT_NUMBER)"

say "1/6 Turning on the services (takes a minute)"
gcloud services enable firebase.googleapis.com firebasehosting.googleapis.com cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com secretmanager.googleapis.com serviceusage.googleapis.com || exit 1

say "2/6 Firebase + Hosting"
api -X POST "https://firebase.googleapis.com/v1beta1/projects/$PROJECT_ID:addFirebase" -d '{}' >/dev/null 2>&1 || true
for i in $(seq 1 12); do
  api "https://firebase.googleapis.com/v1beta1/projects/$PROJECT_ID" >/dev/null 2>&1 && break
  sleep 5
done
api -X POST "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites?siteId=$PROJECT_ID" -d '{}' >/dev/null 2>&1 || true
if api "https://firebasehosting.googleapis.com/v1beta1/projects/$PROJECT_ID/sites/$PROJECT_ID" >/dev/null 2>&1; then
  api -X PATCH "https://firebasehosting.googleapis.com/v1beta1/sites/$PROJECT_ID/config?updateMask=maxVersions" -d '{"maxVersions": 10}' >/dev/null 2>&1
  ok "Firebase Hosting site: https://$PROJECT_ID.web.app (keeps the last 10 versions)"
else
  bad "No Firebase Hosting site — open console.firebase.google.com, add Firebase to $PROJECT_ID, then run this again."
fi

say "3/6 What the deploy account may do (it builds and publishes; nothing else)"
for ROLE in roles/firebasehosting.admin roles/firebase.viewer roles/serviceusage.serviceUsageConsumer \
  roles/logging.logWriter roles/secretmanager.viewer roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$DEPLOY_SA" --role="$ROLE" --condition=None >/dev/null
done
# Cloud Build (and Cloud Scheduler) run jobs as the deploy account.
for AGENT in "service-$PROJECT_NUMBER@gcp-sa-cloudbuild.iam.gserviceaccount.com" "service-$PROJECT_NUMBER@gcp-sa-cloudscheduler.iam.gserviceaccount.com"; do
  try gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --member="serviceAccount:$AGENT" --role=roles/iam.serviceAccountTokenCreator >/dev/null
done
ok "Roles set"

say "4/6 Linking GitHub to Cloud Build"
CONN=geobingo-github
# Cloud Build keeps the GitHub login in Secret Manager: its own service agent needs to be allowed to (Google's docs).
gcloud beta services identity create --service=cloudbuild.googleapis.com --project="$PROJECT_ID" >/dev/null 2>&1 || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" --condition=None >/dev/null \
  --member="serviceAccount:service-$PROJECT_NUMBER@gcp-sa-cloudbuild.iam.gserviceaccount.com" --role=roles/secretmanager.admin
if ! gcloud builds connections describe "$CONN" --region="$REGION" >/dev/null 2>&1; then
  for i in 1 2 3; do
    gcloud builds connections create github "$CONN" --region="$REGION" && break
    echo "(Permissions can take a minute to apply — trying again in 30 s …)"; sleep 30
  done
fi
if ! gcloud builds connections describe "$CONN" --region="$REGION" >/dev/null 2>&1; then
  bad "Couldn't create the GitHub link — send Claude a screenshot of the error above. (Running this again is safe.)"
  exit 1
fi
STAGE=$(gcloud builds connections describe "$CONN" --region="$REGION" --format='value(installationState.stage)')
while [ "$STAGE" != "COMPLETE" ]; do
  echo
  echo "👉 Open this link, sign in to GitHub, install \"Google Cloud Build\" and give it the repositories"
  echo "   $GH_OWNER/geo and $GH_OWNER/geobingo.app (\"Only select repositories\"):"
  gcloud builds connections describe "$CONN" --region="$REGION" --format='value(installationState.actionUri)'
  read -rp "Done? Press Enter to check… " _
  STAGE=$(gcloud builds connections describe "$CONN" --region="$REGION" --format='value(installationState.stage)')
done
ok "GitHub linked"
for R in geo geobingo.app; do
  try gcloud builds repositories create "${R//./-}" --remote-uri="https://github.com/$GH_OWNER/$R.git" --connection="$CONN" --region="$REGION"
done

say "5/6 Deploys on every push (Cloud Build triggers)"
REPO_PATH="projects/$PROJECT_ID/locations/$REGION/connections/$CONN/repositories"
SA_PATH="projects/$PROJECT_ID/serviceAccounts/$DEPLOY_SA"
if ! gcloud builds triggers describe geobingo-api --region="$REGION" >/dev/null 2>&1; then
  gcloud builds triggers create github --name=geobingo-api --region="$REGION" \
    --repository="$REPO_PATH/geo" --branch-pattern='^main$' --build-config=cloudbuild/api.yaml \
    --included-files='server/**,cloudbuild/api.yaml' --service-account="$SA_PATH" \
    --description="API (server/) → Cloud Run" >/dev/null && ok "Trigger geobingo-api"
fi
if ! gcloud builds triggers describe geobingo-site --region="$REGION" >/dev/null 2>&1; then
  gcloud builds triggers create github --name=geobingo-site --region="$REGION" \
    --repository="$REPO_PATH/geobingo-app" --branch-pattern='^main$' --build-config=cloudbuild.yaml \
    --service-account="$SA_PATH" --description="geobingo.app's files → Firebase Hosting" >/dev/null && ok "Trigger geobingo-site"
fi
echo "Publishing the website to Firebase once now (a few minutes) …"
gcloud builds triggers run geobingo-site --region="$REGION" --branch=main --format='value(metadata.build.logUrl)' 2>&1 | tail -1

say "6/6 The hourly reminders (Cloud Scheduler)"
API_URL=$(gcloud run services describe geobingo-api --region="$REGION" --format='value(status.url)')
ARGS=(--location="$REGION" --schedule='7 * * * *' --time-zone=Etc/UTC --uri="$API_URL/push/run" --http-method=POST
  --oidc-service-account-email="$DEPLOY_SA" --oidc-token-audience=geobingo-push-run --attempt-deadline=300s)
if gcloud scheduler jobs describe geobingo-reminders --location="$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http geobingo-reminders "${ARGS[@]}" >/dev/null
else
  gcloud scheduler jobs create http geobingo-reminders "${ARGS[@]}" >/dev/null
fi
gcloud scheduler jobs run geobingo-reminders --location="$REGION" >/dev/null 2>&1 && ok "Reminders job: every hour at :07 (ran once now)"

say "Done! Send Claude everything between the lines (nothing in it is secret)"
echo "------------------------------------------------------------"
echo "hosting: https://$PROJECT_ID.web.app"
gcloud builds triggers list --region="$REGION" --format='value(name)' | sed 's/^/trigger: /'
gcloud scheduler jobs list --location="$REGION" --format='value(name.basename(),schedule,state)' | sed 's/^/scheduler: /'
gcloud builds list --region="$REGION" --limit=1 --format='value(status,createTime)' | sed 's/^/last build: /'
echo "------------------------------------------------------------"
