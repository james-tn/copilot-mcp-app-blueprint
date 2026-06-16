#!/usr/bin/env bash
# Build the Microsoft 365 Copilot sideload package (PegaBlueprintMCP.zip) by
# substituting ${{...}} env tokens into the appPackage manifest files.
#
# This is the manual equivalent of `atk provision`'s teamsApp/zipAppPackage step,
# handy for quick re-packaging without the full Agents Toolkit lifecycle.
#
# Tokens substituted (from env/.env.<env>):
#   ${{TEAMS_APP_ID}}          - Teams app GUID
#   ${{APP_NAME_SUFFIX}}       - name suffix (e.g. "dev"; emptied for prod)
#   ${{MCP_ENDPOINT_URL}}      - public https URL of the MCP server (+ /mcp)
#   ${{OAUTH_REGISTRATION_ID}} - Teams Dev Portal OAuth client registration id
#
# Auth behaviour:
#   - OAUTH_REGISTRATION_ID empty  -> auth block forced to {"type":"None"}
#   - OAUTH_REGISTRATION_ID set     -> auth block kept as OAuthPluginVault
#
# Usage:
#   ./scripts/build_package.sh            # uses env/.env.dev
#   APP_ENV=prod ./scripts/build_package.sh
set -euo pipefail

cd "$(dirname "$0")/.."   # -> mcp_app/

APP_ENV="${APP_ENV:-dev}"
ENV_FILE="env/.env.${APP_ENV}"
[ -f "$ENV_FILE" ] || { echo "ERROR: $ENV_FILE not found" >&2; exit 1; }

# Load env tokens. A non-empty value already in the environment (exported or set
# on the command line) wins over the file's value, so callers can override e.g.
# OAUTH_REGISTRATION_ID without editing the file.
_OAUTH_OVERRIDE="${OAUTH_REGISTRATION_ID:-}"
set -a; . "$ENV_FILE"; set +a
[ -n "$_OAUTH_OVERRIDE" ] && OAUTH_REGISTRATION_ID="$_OAUTH_OVERRIDE"
: "${APP_NAME_SUFFIX:=}"
: "${OAUTH_REGISTRATION_ID:=}"
[ -n "${TEAMS_APP_ID:-}" ]    || { echo "ERROR: TEAMS_APP_ID not set in $ENV_FILE" >&2; exit 1; }
[ -n "${MCP_ENDPOINT_URL:-}" ] || { echo "ERROR: MCP_ENDPOINT_URL not set in $ENV_FILE" >&2; exit 1; }

OUT_DIR="appPackage/build"
PKG_DIR="$OUT_DIR/pkg"
rm -rf "$OUT_DIR"
mkdir -p "$PKG_DIR"

for f in manifest.json declarativeAgent.json ai-plugin.json instruction.txt; do
  sed -e "s#\${{TEAMS_APP_ID}}#${TEAMS_APP_ID}#g" \
      -e "s#\${{APP_NAME_SUFFIX}}#${APP_NAME_SUFFIX}#g" \
      -e "s#\${{MCP_ENDPOINT_URL}}#${MCP_ENDPOINT_URL}#g" \
      -e "s#\${{OAUTH_REGISTRATION_ID}}#${OAUTH_REGISTRATION_ID}#g" \
      "appPackage/$f" > "$PKG_DIR/$f"
done

# If no OAuth registration id is configured, force the runtime auth block back to
# "None" so we never ship an OAuthPluginVault with an empty reference_id.
if [ -z "$OAUTH_REGISTRATION_ID" ]; then
  python3 - "$PKG_DIR/ai-plugin.json" <<'PY'
import json, sys
p = sys.argv[1]
m = json.load(open(p))
for rt in m.get("runtimes", []):
    auth = rt.get("auth") or {}
    if auth.get("type") == "OAuthPluginVault" and not (auth.get("reference_id") or "").strip():
        rt["auth"] = {"type": "None"}
json.dump(m, open(p, "w"), indent=4)
open(p, "a").write("\n")
PY
  echo "auth: None (OAUTH_REGISTRATION_ID empty)"
else
  echo "auth: OAuthPluginVault (reference_id=${OAUTH_REGISTRATION_ID})"
fi

cp appPackage/color.png appPackage/outline.png "$PKG_DIR/"

# Fail loudly if any token failed to substitute.
if grep -rlE '\$\{\{' "$PKG_DIR"/*.json "$PKG_DIR"/*.txt 2>/dev/null; then
  echo "ERROR: unsubstituted \${{...}} tokens remain (see above)" >&2
  exit 1
fi

ZIP="$OUT_DIR/PegaBlueprintMCP.zip"
( cd "$PKG_DIR" && zip -j -q "../PegaBlueprintMCP.zip" \
    manifest.json declarativeAgent.json ai-plugin.json instruction.txt color.png outline.png )

echo "PACKAGE ready: $PWD/$ZIP"
