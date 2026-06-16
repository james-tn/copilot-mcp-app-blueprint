#!/usr/bin/env bash
# One-command deploy of the Pega Blueprint MCP server to Azure Container Apps.
#
# Builds the container image from source (in Azure Container Registry — no local
# Docker needed) and creates/updates the Container App, then keeps it warm
# (min-replicas=1, so Copilot's MCP calls never hit a cold start) and wires the
# public URL used for export download links.
#
# Idempotent: safe to re-run. The first run provisions everything; later runs
# just push a new image + settings.
#
# Prereqks:
#   - Azure CLI (`az`) logged in            → ./scripts/az_login_mfa.sh
#   - containerapp extension (auto-installed by `az containerapp`)
#   - The widget built once                 → (cd widgets && npm ci && npm run build)
#     (the Dockerfile copies the prebuilt server/pega_mcp/web/widget.html)
#
# Usage:
#   ./scripts/deploy_azure.sh
#   RG=my-rg APP=my-mcp LOCATION=eastus2 ./scripts/deploy_azure.sh
#   AUTH_MODE=generic ./scripts/deploy_azure.sh     # enforce sign-in (see below)
#
# Configuration (env vars; all have defaults):
#   RG            Resource group              (default: rg-pega-blueprint)
#   APP           Container App name          (default: pega-blueprint-mcp)
#   LOCATION      Azure region                (default: eastus2)
#   ENVIRONMENT   Container Apps environment  (default: cae-pega-blueprint)
#   MIN_REPLICAS  Warm replicas               (default: 1)
#   MAX_REPLICAS  Max replicas                (default: 3)
#   TARGET_PORT   Container port              (default: 8000)
#   AUTH_MODE     "" (anonymous) | generic | entra   (default: "" = anonymous)
#     generic : validates the caller's OAuth token via a userinfo endpoint.
#               Set OAUTH_USERINFO_URL (default: Microsoft Graph /me).
#     entra   : validates an Entra-issued JWT. Set ENTRA_TENANT_ID + ENTRA_AUDIENCES.
#   OAUTH_USERINFO_URL  generic-mode userinfo (default: Graph /me)
#   ENTRA_TENANT_ID / ENTRA_AUDIENCES / ENTRA_REQUIRED_SCOPE   entra-mode config
#   CORS_ORIGINS  CORS allow-list             (default: *)
#
# See docs/security-and-login.md for the auth modes and docs/production-architecture.md
# for a hardened, enterprise-grade topology.
set -euo pipefail

# Run from the server/ directory regardless of where the script is invoked.
cd "$(dirname "$0")/../server"

RG="${RG:-rg-pega-blueprint}"
APP="${APP:-pega-blueprint-mcp}"
LOCATION="${LOCATION:-eastus2}"
ENVIRONMENT="${ENVIRONMENT:-cae-pega-blueprint}"
MIN_REPLICAS="${MIN_REPLICAS:-1}"
MAX_REPLICAS="${MAX_REPLICAS:-3}"
TARGET_PORT="${TARGET_PORT:-8000}"
CORS_ORIGINS="${CORS_ORIGINS:-*}"
AUTH_MODE="${AUTH_MODE:-}"
OAUTH_USERINFO_URL="${OAUTH_USERINFO_URL:-https://graph.microsoft.com/v1.0/me}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }

# ── Preflight ────────────────────────────────────────────────────────────────
command -v az >/dev/null || { echo "ERROR: Azure CLI (az) not found." >&2; exit 1; }
az account show >/dev/null 2>&1 || { echo "ERROR: not logged in. Run ./scripts/az_login_mfa.sh" >&2; exit 1; }

if [ ! -f pega_mcp/web/widget.html ]; then
  echo "ERROR: server/pega_mcp/web/widget.html is missing." >&2
  echo "       Build the widget first:  (cd widgets && npm ci && npm run build)" >&2
  exit 1
fi

SUB_NAME="$(az account show --query name -o tsv)"
bold "Subscription : $SUB_NAME"
echo "Resource group: $RG | App: $APP | Region: $LOCATION | Env: $ENVIRONMENT"
echo "Auth mode    : ${AUTH_MODE:-anonymous}"
echo

# ── Resource group + Container Apps environment (idempotent) ─────────────────
bold "1/4 Resource group"
az group create -n "$RG" -l "$LOCATION" -o none

bold "2/4 Container Apps environment"
if ! az containerapp env show -g "$RG" -n "$ENVIRONMENT" -o none 2>/dev/null; then
  az containerapp env create -g "$RG" -n "$ENVIRONMENT" -l "$LOCATION" -o none
else
  echo "  exists — reusing $ENVIRONMENT"
fi

# ── Build image from source + create/update the app ──────────────────────────
bold "3/4 Build image from source + deploy (this builds in ACR; a few minutes)"
az containerapp up \
  --name "$APP" \
  --resource-group "$RG" \
  --environment "$ENVIRONMENT" \
  --location "$LOCATION" \
  --source . \
  --ingress external \
  --target-port "$TARGET_PORT" \
  -o none

FQDN="$(az containerapp show -g "$RG" -n "$APP" --query properties.configuration.ingress.fqdn -o tsv)"
PUBLIC_URL="https://$FQDN"

# ── Settings: scale + public URL + auth ──────────────────────────────────────
bold "4/4 Configure scale, public URL and auth"
ENV_VARS=(
  "PEGA_MCP_PUBLIC_URL=$PUBLIC_URL"
  "PEGA_MCP_CORS_ORIGINS=$CORS_ORIGINS"
)
case "$AUTH_MODE" in
  generic)
    ENV_VARS+=("PEGA_MCP_REQUIRE_AUTH=true" "PEGA_MCP_AUTH_MODE=generic"
               "PEGA_MCP_OAUTH_USERINFO_URL=$OAUTH_USERINFO_URL")
    ;;
  entra)
    : "${ENTRA_TENANT_ID:?set ENTRA_TENANT_ID for AUTH_MODE=entra}"
    : "${ENTRA_AUDIENCES:?set ENTRA_AUDIENCES for AUTH_MODE=entra}"
    ENV_VARS+=("PEGA_MCP_REQUIRE_AUTH=true" "PEGA_MCP_AUTH_MODE=entra"
               "PEGA_MCP_ENTRA_TENANT_ID=$ENTRA_TENANT_ID"
               "PEGA_MCP_ENTRA_AUDIENCES=$ENTRA_AUDIENCES"
               "PEGA_MCP_ENTRA_REQUIRED_SCOPE=${ENTRA_REQUIRED_SCOPE:-}")
    ;;
  *)
    ENV_VARS+=("PEGA_MCP_REQUIRE_AUTH=false")
    ;;
esac

az containerapp update -g "$RG" -n "$APP" \
  --min-replicas "$MIN_REPLICAS" --max-replicas "$MAX_REPLICAS" \
  --set-env-vars "${ENV_VARS[@]}" \
  -o none

# ── Smoke check ──────────────────────────────────────────────────────────────
echo
bold "Deployed."
echo "  MCP endpoint : $PUBLIC_URL/mcp"
echo "  Health       : $PUBLIC_URL/healthz"
HEALTH="$(curl -fsS -o /dev/null -w '%{http_code}' "$PUBLIC_URL/healthz" 2>/dev/null || echo 000)"
echo "  Health check : HTTP $HEALTH"
echo
echo "Next steps:"
echo "  • Put this in env/.env.dev →  MCP_ENDPOINT_URL=$PUBLIC_URL/mcp"
echo "  • Build the Copilot package →  ./scripts/build_package.sh"
echo "  • Sideload appPackage/build/PegaBlueprintMCP.zip in https://m365.cloud.microsoft/chat"
if [ -n "$AUTH_MODE" ]; then
  echo "  • Auth is ON ($AUTH_MODE): set OAUTH_REGISTRATION_ID in env/.env.dev so the package shows a sign-in card."
fi
