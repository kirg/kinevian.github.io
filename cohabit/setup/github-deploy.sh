#!/usr/bin/env bash
# One-time: lets GitHub Actions (only the kirg/CoHabit repository, only its main branch)
# deploy CoHabit's server side — security rules, indexes and functions — to Google Cloud.
# No keys or passwords are created: Google trusts GitHub's sign-in for that one repository
# ("Workload Identity Federation"). Safe to run again.
#
# Run in Google Cloud Shell:
#   curl -fsSL https://kinevian.com/cohabit/setup/github-deploy.sh | bash
set -uo pipefail

PROJECT_ID="${PROJECT_ID:-cohabit-o6fc96}"
REPO="${REPO:-kirg/CoHabit}"
POOL=github
PROVIDER=cohabit-repo
SA_NAME=cohabit-deployer
SA="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

ok() { echo "✅ $*"; }
die() { echo "❌ $*"; exit 1; }

gcloud auth print-access-token >/dev/null 2>&1 || die "Cloud Shell isn't signed in. Run: gcloud auth login   then run this again."
gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
NUM=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)') || die "Can't see project $PROJECT_ID."
echo "Project $PROJECT_ID ($NUM), repository $REPO"

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com iam.googleapis.com cloudresourcemanager.googleapis.com >/dev/null \
  && ok "Services on" || die "Couldn't turn on services."

gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create "$POOL" --location=global --display-name="GitHub" >/dev/null \
  || die "Couldn't create the GitHub identity pool."
ok "GitHub identity pool"

COND="assertion.repository=='$REPO' && assertion.ref=='refs/heads/main'"
if gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" --location=global --workload-identity-pool="$POOL" \
    --attribute-condition="$COND" >/dev/null || die "Couldn't update the GitHub provider."
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global --workload-identity-pool="$POOL" \
    --display-name="CoHabit repository" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="$COND" >/dev/null || die "Couldn't create the GitHub provider."
fi
ok "Trusts only $REPO (main branch)"

gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 \
  || gcloud iam service-accounts create "$SA_NAME" --display-name="CoHabit deploys from GitHub" >/dev/null \
  || die "Couldn't create the deploy account."
ok "Deploy account $SA"

# What a Firebase deploy of rules, indexes and 2nd-gen functions needs.
for role in roles/firebase.admin roles/cloudfunctions.admin roles/run.admin roles/cloudscheduler.admin \
            roles/eventarc.admin roles/pubsub.admin roles/artifactregistry.admin roles/cloudbuild.builds.editor \
            roles/serviceusage.serviceUsageAdmin roles/firebaserules.admin roles/datastore.indexAdmin roles/iam.serviceAccountViewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$role" --condition=None --quiet >/dev/null \
    || die "Couldn't grant $role."
done
# Functions run as the default compute account; the deployer may assign it.
gcloud iam service-accounts add-iam-policy-binding "$NUM-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:$SA" --role=roles/iam.serviceAccountUser --quiet >/dev/null || die "Couldn't allow using the compute account."
ok "Permissions for deploying"

gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" \
  --quiet >/dev/null || die "Couldn't link GitHub to the deploy account."
ok "GitHub can use the deploy account"

echo
echo "🎉 Done. Tell Claude: \"GitHub deploy is set up\"."
echo "   (provider: projects/$NUM/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER)"
