#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <full-image-reference>" >&2
  exit 1
fi

image="$1"
resource_group="${AZURE_RESOURCE_GROUP:-Plugoh-dev-rg}"
container_app="${AZURE_CONTAINER_APP:-plugoh-api-dev}"
template_path="${AZURE_CONTAINERAPP_TEMPLATE:-infra/azure/api.dev.containerapp.yaml}"
health_path="${AZURE_HEALTH_PATH:-/health}"

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi

rendered_spec="$(mktemp "${TMPDIR:-/tmp}/plugoh-api-dev.XXXXXX.yaml")"
cleanup() {
  rm -f "$rendered_spec"
}
trap cleanup EXIT

bash infra/azure/render-containerapp-spec.sh "$template_path" "$image" "$rendered_spec"

az config set extension.use_dynamic_install=yes_without_prompt >/dev/null

if az containerapp show --name "$container_app" --resource-group "$resource_group" >/dev/null 2>&1; then
  az containerapp update --name "$container_app" --resource-group "$resource_group" --yaml "$rendered_spec" >/dev/null
else
  az containerapp create --resource-group "$resource_group" --yaml "$rendered_spec" >/dev/null
fi

attempt=1
max_attempts=60
while [ "$attempt" -le "$max_attempts" ]; do
  latest_revision="$(az containerapp show --name "$container_app" --resource-group "$resource_group" --query properties.latestRevisionName -o tsv)"
  ready_revision="$(az containerapp show --name "$container_app" --resource-group "$resource_group" --query properties.latestReadyRevisionName -o tsv)"
  running_status="$(az containerapp show --name "$container_app" --resource-group "$resource_group" --query properties.runningStatus -o tsv)"

  if [ -n "$latest_revision" ] && [ "$latest_revision" = "$ready_revision" ] && [ "$running_status" = "Running" ]; then
    break
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "Container App did not reach a ready running revision in time." >&2
    exit 1
  fi

  sleep 10
  attempt=$((attempt + 1))
done

fqdn="$(az containerapp show --name "$container_app" --resource-group "$resource_group" --query properties.configuration.ingress.fqdn -o tsv)"
if [ -z "$fqdn" ]; then
  echo "Container App ingress FQDN is empty." >&2
  exit 1
fi

attempt=1
max_attempts=20
while [ "$attempt" -le "$max_attempts" ]; do
  status_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://${fqdn}${health_path}" || true)"

  if [ "$status_code" = "200" ]; then
    echo "Smoke test passed: https://${fqdn}${health_path}"
    exit 0
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "Smoke test failed for https://${fqdn}${health_path} (last status: ${status_code})." >&2
    exit 1
  fi

  sleep 5
  attempt=$((attempt + 1))
done
