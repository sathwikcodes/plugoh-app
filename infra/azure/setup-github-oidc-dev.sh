#!/usr/bin/env bash
set -euo pipefail

repo="${GITHUB_REPOSITORY:-sathwikcodes/plugoh-app}"
github_environment="${GH_ENVIRONMENT:-azure-dev}"
app_display_name="${APP_DISPLAY_NAME:-plugoh-api-github-dev}"
federated_credential_name="${FEDERATED_CREDENTIAL_NAME:-plugoh-api-azure-dev}"
resource_group="${AZURE_RESOURCE_GROUP:-Plugoh-dev-rg}"
container_app="${AZURE_CONTAINER_APP:-plugoh-api-dev}"
container_env="${AZURE_CONTAINER_ENV:-plugoh-dev-env}"
acr_name="${AZURE_ACR_NAME:-plugohdev}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required." >&2
  exit 1
fi

if ! az account show >/dev/null 2>&1; then
  echo "Run 'az login' and select the correct subscription before executing this script." >&2
  exit 1
fi

tenant_id="$(az account show --query tenantId -o tsv)"
subscription_id="$(az account show --query id -o tsv)"
acr_id="$(az acr show --name "$acr_name" --resource-group "$resource_group" --query id -o tsv)"
acr_login_server="$(az acr show --name "$acr_name" --resource-group "$resource_group" --query loginServer -o tsv)"
resource_group_id="$(az group show --name "$resource_group" --query id -o tsv)"

app_id="$(az ad app list --display-name "$app_display_name" --query "[0].appId" -o tsv)"
app_object_id="$(az ad app list --display-name "$app_display_name" --query "[0].id" -o tsv)"

if [ -z "$app_id" ] || [ -z "$app_object_id" ]; then
  app_id="$(az ad app create --display-name "$app_display_name" --query appId -o tsv)"
  app_object_id="$(az ad app show --id "$app_id" --query id -o tsv)"
fi

if ! az ad sp show --id "$app_id" >/dev/null 2>&1; then
  az ad sp create --id "$app_id" >/dev/null
fi

service_principal_object_id="$(az ad sp show --id "$app_id" --query id -o tsv)"

existing_credential_name="$(az ad app federated-credential list --id "$app_object_id" --query "[?name=='$federated_credential_name'].name | [0]" -o tsv)"
if [ -z "$existing_credential_name" ]; then
  parameters_file="$(mktemp "${TMPDIR:-/tmp}/plugoh-api-oidc.XXXXXX.json")"
  cleanup() {
    rm -f "$parameters_file"
  }
  trap cleanup EXIT

  cat > "$parameters_file" <<EOF
{
  "name": "$federated_credential_name",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$repo:environment:$github_environment",
  "description": "GitHub Actions deployment for $repo ($github_environment)",
  "audiences": [
    "api://AzureADTokenExchange"
  ]
}
EOF

  az ad app federated-credential create --id "$app_object_id" --parameters "$parameters_file" >/dev/null
fi

ensure_role_assignment() {
  local scope="$1"
  local role_name="$2"
  local existing_assignment

  existing_assignment="$(az role assignment list --assignee-object-id "$service_principal_object_id" --scope "$scope" --query "[?roleDefinitionName=='$role_name'] | [0].id" -o tsv)"
  if [ -z "$existing_assignment" ]; then
    az role assignment create --assignee-object-id "$service_principal_object_id" --assignee-principal-type ServicePrincipal --role "$role_name" --scope "$scope" >/dev/null
  fi
}

ensure_role_assignment "$resource_group_id" "Contributor"
ensure_role_assignment "$acr_id" "AcrPush"

cat <<EOF
Azure OIDC principal is ready for GitHub Actions.

Set these GitHub environment variables on the 'azure-dev' environment:
AZURE_CLIENT_ID=$app_id
AZURE_TENANT_ID=$tenant_id
AZURE_SUBSCRIPTION_ID=$subscription_id
AZURE_RESOURCE_GROUP=$resource_group
AZURE_CONTAINER_APP=$container_app
AZURE_CONTAINER_ENV=$container_env
AZURE_ACR_NAME=$acr_name
AZURE_ACR_LOGIN_SERVER=$acr_login_server

Federated identity subject:
repo:$repo:environment:$github_environment
EOF
