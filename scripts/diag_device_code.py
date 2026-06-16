#!/usr/bin/env python3
"""Diagnostic: mint a REAL delegated token for the MCP API via device-code flow,
then run it through the server's own validator.

Why: the Teams/Copilot sign-in ends on a blank oAuthRedirect page (token exchange
appears to fail) and this tenant has no premium license, so sign-in audit logs are
unreadable. This flow reproduces the *same* token request (client_id = our app,
scope = api://<app>/access_as_user) directly against Entra, so we see the exact
AADSTS error if it fails — or prove the whole AAD chain works if it succeeds.

It uses the confidential client secret in the token poll (no app config change).
Run it, open the printed URL, enter the code, sign in as the guest user.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # mcp_app/
sec = json.loads((ROOT / "env" / ".contoso-oauth.secret").read_text())
TENANT = sec["tenant"]
CLIENT = sec["appId"]
SECRET = sec["password"]
SCOPE = f"api://{CLIENT}/access_as_user offline_access openid profile"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT}/oauth2/v2.0"


def _post(url: str, data: dict) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        url, body, {"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())


def main() -> int:
    dc = _post(f"{AUTHORITY}/devicecode", {"client_id": CLIENT, "scope": SCOPE})
    if "user_code" not in dc:
        print("devicecode init error:", json.dumps(dc, indent=2))
        return 1

    print("\n" + "=" * 60)
    print("  OPEN:  ", dc["verification_uri"])
    print("  CODE:  ", dc["user_code"])
    print("  Sign in as janguy@microsoft.com (the guest in Contoso)")
    print("=" * 60 + "\n", flush=True)

    interval = int(dc.get("interval", 5))
    deadline = time.time() + int(dc.get("expires_in", 900))
    # Device code is a public-client grant; omit the confidential secret unless
    # explicitly requested (PEGA_SEND_SECRET=1). Requires isFallbackPublicClient.
    send_secret = os.environ.get("PEGA_SEND_SECRET", "") == "1"
    tok = None
    while time.time() < deadline:
        time.sleep(interval)
        form = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": CLIENT,
            "device_code": dc["device_code"],
        }
        if send_secret:
            form["client_secret"] = SECRET
        r = _post(f"{AUTHORITY}/token", form)
        if "access_token" in r:
            tok = r
            break
        if r.get("error") == "authorization_pending":
            continue
        if r.get("error") == "slow_down":
            interval += 5
            continue
        print("\n❌ TOKEN EXCHANGE ERROR (this is likely the same failure Teams hits):")
        print("   error:", r.get("error"))
        print("   desc :", (r.get("error_description") or "").split("\n")[0])
        return 2

    if not tok:
        print("timed out waiting for sign-in")
        return 1

    at = tok["access_token"]
    payload = at.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    print("✅ TOKEN ISSUED — AAD chain (resource/scope/consent/guest) works.\n")
    print("=== access-token claims ===")
    for k in ("aud", "iss", "tid", "scp", "appid", "azp", "ver", "upn"):
        if k in claims:
            print(f"  {k:6} = {claims[k]}")
    print("  refresh_token present:", "refresh_token" in tok)

    # Run the server's own validator against this REAL token.
    sys.path.insert(0, str(ROOT / "server"))
    from pega_mcp import auth  # noqa: E402

    validate = auth.make_validator(TENANT, [CLIENT, f"api://{CLIENT}"], "access_as_user")
    print("\n=== server validator on the real token ===")
    try:
        validate(at)
        print("  ✅ server WOULD ACCEPT this real user token (auth path proven).")
    except Exception as e:  # noqa: BLE001
        print("  ❌ server rejected:", type(e).__name__, str(e))
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
