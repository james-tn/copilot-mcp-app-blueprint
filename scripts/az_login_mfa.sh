#!/usr/bin/env bash
# Azure CLI login that *forces* the MFA step-up required by Conditional Access
# for the Azure management plane (the cause of the AADSTS50076 loop).
#
# Why this is needed:
#   A plain `az login` requests a management token WITHOUT the required auth
#   context, so writes (e.g. `az webapp config appsettings set`) get rejected
#   with AADSTS50076 ("you must use multi-factor authentication"). The fix is to
#   pass --claims-challenge so Entra demands the "p1" auth context (MFA) at the
#   sign-in page.
#
#   The challenge below decodes to:
#     {"access_token":{"acrs":{"essential":true,"values":["p1"]}}}
#   i.e. the token must carry the "p1" (MFA) authentication-context class.
#
# This script targets Ubuntu/WSL, so it uses device-code login by default (no
# browser is required). MFA is still enforced at the device-login page.
#
# Usage (Ubuntu/WSL — device code is the DEFAULT, no browser needed):
#   ./scripts/az_login_mfa.sh            # prints a code → enter at
#                                        # https://microsoft.com/devicelogin
#   ./scripts/az_login_mfa.sh --browser  # force the interactive browser flow
#
# After it prints "MFA login verified", re-run the app-settings/deploy commands.
set -euo pipefail

TENANT="${AZ_TENANT_ID:-11111111-1111-1111-1111-111111111111}"
MGMT_SCOPE="https://management.core.windows.net//.default"
# Forces ACR "p1" (MFA). Override via AZ_CLAIMS_CHALLENGE if your tenant prints a
# different challenge (copy the value from the AADSTS50076 error message).
CLAIMS_CHALLENGE="${AZ_CLAIMS_CHALLENGE:-eyJhY2Nlc3NfdG9rZW4iOnsiYWNycyI6eyJlc3NlbnRpYWwiOnRydWUsInZhbHVlcyI6WyJwMSJdfX19}"

# Device code by default (Ubuntu/WSL has no browser); pass --browser to opt out.
USE_DEVICE_CODE=1
[ "${1:-}" = "--browser" ] && USE_DEVICE_CODE=0
[ "${1:-}" = "--device-code" ] && USE_DEVICE_CODE=1   # explicit, same as default

echo "Tenant:        $TENANT"
echo "Scope:         $MGMT_SCOPE"
echo "MFA challenge: enforced (acrs=p1)"
if [ "$USE_DEVICE_CODE" = "1" ]; then
  echo "Flow:          device code  →  https://microsoft.com/devicelogin"
else
  echo "Flow:          interactive browser"
fi
echo

login_args=(--tenant "$TENANT" --scope "$MGMT_SCOPE" --claims-challenge "$CLAIMS_CHALLENGE")
[ "$USE_DEVICE_CODE" = "1" ] && login_args+=(--use-device-code)

az login "${login_args[@]}" -o none

echo
echo "=== verifying the management token actually carries MFA ==="
# Pull a fresh management token and decode its payload to prove the step-up took.
TOKEN="$(az account get-access-token --scope "$MGMT_SCOPE" --query accessToken -o tsv)"
python3 - "$TOKEN" <<'PY'
import base64, json, sys
tok = sys.argv[1]
payload = tok.split(".")[1]
payload += "=" * (-len(payload) % 4)          # pad base64url
claims = json.loads(base64.urlsafe_b64decode(payload))
acrs = claims.get("acrs") or []
amr  = claims.get("amr") or []
acr  = claims.get("acr")
mfa_ok = ("p1" in acrs) or ("mfa" in amr) or (acr == "1")
print(f"  amr  = {amr}")
print(f"  acrs = {acrs}")
print(f"  acr  = {acr}")
if mfa_ok:
    print("  ✅ token satisfies MFA / p1 auth context")
else:
    print("  ⚠️  token does NOT show MFA — the write may still be blocked.")
    print("      Re-run with the EXACT --claims-challenge from the AADSTS50076 error:")
    print("      AZ_CLAIMS_CHALLENGE=<value> ./scripts/az_login_mfa.sh")
    sys.exit(2)
PY

echo
echo "MFA login verified. You can now run the app-settings / deploy commands."
