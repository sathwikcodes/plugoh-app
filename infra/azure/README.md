# Azure Deployment Notes

This directory contains the deployment assets for the Plugoh backend on Azure.

## Current Dev Target

- Runtime: Azure Container Apps
- App: `plugoh-api-dev`
- Environment: `plugoh-dev-env`
- Resource group: `Plugoh-dev-rg`
- Registry: `plugohdev.azurecr.io`
- Secrets: Azure Key Vault `plugohdev`

## Files

- `api.dev.containerapp.yaml`
  Source-controlled Container App spec template for the dev API.
- `render-containerapp-spec.sh`
  Renders the template with the exact image tag to deploy.
- `deploy-api-dev.sh`
  Idempotent dev deployment helper for create/update, readiness polling, and smoke test.
- `setup-github-oidc-dev.sh`
  Bootstraps Azure AD + RBAC for GitHub Actions OIDC deployments to the dev environment.
- `configure-github-env-dev.sh`
  Creates the `azure-dev` GitHub environment and writes the required environment variables after `gh auth login`.

## GitHub Actions Contract

The API dev workflow expects these GitHub environment variables under the `azure-dev` environment:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_CONTAINER_APP`
- `AZURE_CONTAINER_ENV`
- `AZURE_ACR_NAME`
- `AZURE_ACR_LOGIN_SERVER`

Runtime application secrets do not belong in GitHub. They stay in Azure Key Vault and are consumed by Container Apps through Key Vault-backed secret references.

## Bootstrap Order

1. Run `infra/azure/setup-github-oidc-dev.sh` while authenticated with `az login`.
2. Re-authenticate `gh` if needed.
3. Run `infra/azure/configure-github-env-dev.sh` to create the GitHub environment `azure-dev` and set the required variables.
4. Push the repo to GitHub.
5. Let `.github/workflows/api-dev.yml` build, test, and deploy the API.
