#!/usr/bin/env bash
set -euo pipefail

repo="${GITHUB_REPOSITORY:-sathwikcodes/plugoh-app}"
github_environment="${GH_ENVIRONMENT:-azure-dev}"
app_display_name="${APP_DISPLAY_NAME:-plugoh-api-github-dev}"
resource_group="${AZURE_RESOURCE_GROUP:-Plugoh-dev-rg}"
container_app="${AZURE_CONTAINER_APP:-plugoh-api-dev}"
container_env="${AZURE_CONTAINER_ENV:-plugoh-dev-env}"
acr_name="${AZURE_ACR_NAME:-plugohdev}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is required." >&2
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run 'gh auth login' before executing this script." >&2
  exit 1
fi

if ! az account show >/dev/null 2>&1; then
  echo "Run 'az login' and select the correct subscription before executing this script." >&2
  exit 1
fi

client_id="$(az ad app list --display-name "$app_display_name" --query "[0].appId" -o tsv)"
if [ -z "$client_id" ]; then
  echo "Azure AD application not found for display name: $app_display_name" >&2
  exit 1
fi

tenant_id="$(az account show --query tenantId -o tsv)"
subscription_id="$(az account show --query id -o tsv)"
acr_login_server="$(az acr show --name "$acr_name" --resource-group "$resource_group" --query loginServer -o tsv)"

gh api --method PUT "repos/${repo}/environments/${github_environment}" >/dev/null

gh variable set AZURE_CLIENT_ID --env "$github_environment" --body "$client_id" --repo "$repo"
gh variable set AZURE_TENANT_ID --env "$github_environment" --body "$tenant_id" --repo "$repo"
gh variable set AZURE_SUBSCRIPTION_ID --env "$github_environment" --body "$subscription_id" --repo "$repo"
gh variable set AZURE_RESOURCE_GROUP --env "$github_environment" --body "$resource_group" --repo "$repo"
gh variable set AZURE_CONTAINER_APP --env "$github_environment" --body "$container_app" --repo "$repo"
gh variable set AZURE_CONTAINER_ENV --env "$github_environment" --body "$container_env" --repo "$repo"
gh variable set AZURE_ACR_NAME --env "$github_environment" --body "$acr_name" --repo "$repo"
gh variable set AZURE_ACR_LOGIN_SERVER --env "$github_environment" --body "$acr_login_server" --repo "$repo"

cat <<EOF
GitHub environment '${github_environment}' is configured for ${repo}.

Environment variables written:
- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- AZURE_RESOURCE_GROUP
- AZURE_CONTAINER_APP
- AZURE_CONTAINER_ENV
- AZURE_ACR_NAME
- AZURE_ACR_LOGIN_SERVER
EOF
