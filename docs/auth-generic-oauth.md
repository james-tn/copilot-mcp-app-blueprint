# Generic OAuth (no Microsoft-tenant setup) — the simple ISV path

This is the **simplest** way to add sign-in to the Pega Blueprint agent: point it
at a **non-Microsoft IdP** (your own OAuth/STS, or GitHub for a demo) instead of
Entra ID. It's the same model as the `oauth-card-poc` reference — the user clicks
sign-in once, authorizes at *your* IdP, and it's silent thereafter.

## Why this avoids all the Entra pain

| | Entra SSO (hard) | Generic OAuth (this doc) |
| --- | --- | --- |
| App registration in **customer's** Microsoft tenant | required | **none** |
| Admin consent in customer tenant | required | **none** |
| Per-customer secret/registration | yes | **no** |
| Who the user signs into | their Microsoft org | **your IdP** (Pega/GitHub/Okta) |
| First-run UX | sign-in (+ maybe consent) | one "Authorize" click, then silent |

The token broker (`token.botframework.com` for bots / the Copilot plugin vault for
MCP) is a Microsoft-global service — it does **not** need anything registered in
the user's tenant. The only identity setup lives at **your** IdP.

> The user still needs to be able to *install* the agent in their tenant
> (custom-app upload / catalog approval) — that's a separate tenant-governance
> setting, unrelated to auth.

## How the server validates the token

Non-Microsoft IdPs return **opaque** access tokens (not JWTs), so there's no
signature to verify. The server validates by calling the IdP's **userinfo**
endpoint with the token (`pega_mcp/auth.py` → `make_userinfo_validator`): a `200`
means the token is live and the IdP vouches for the identity. Pure-Python, no
deps. Configure it with:

| Setting (env `PEGA_MCP_…`) | Value (GitHub example) |
| --- | --- |
| `REQUIRE_AUTH` | `true` |
| `AUTH_MODE` | `generic` |
| `OAUTH_USERINFO_URL` | `https://api.github.com/user` |
| `OAUTH_SUBJECT_FIELD` | `login` (optional; for the allowlist) |
| `OAUTH_ALLOWED_SUBJECTS` | `octocat,...` (optional; empty = any signed-in user) |

For a real OIDC IdP use its `/userinfo` URL and `sub` (or `email`) as the subject.

## Setup — GitHub demo (≈5 minutes, no Azure/Entra)

### 1. Register a GitHub OAuth app
<https://github.com/settings/developers> → **OAuth Apps → New OAuth App**:

| Field | Value |
| --- | --- |
| Application name | `Pega Blueprint (demo)` |
| Homepage URL | any (e.g. `https://example.com`) |
| Authorization callback URL | `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect` |

Register → copy the **Client ID**, generate and copy the **Client secret**.

### 2. Register the OAuth client in Teams Developer Portal
<https://dev.teams.microsoft.com/tools> → **OAuth client registration** →
**New** (this is the *OAuth client* path — generic, with a secret; **not** the
Entra SSO path):

| Field | Value |
| --- | --- |
| Registration name | `Pega Blueprint Generic OAuth` |
| Base URL | `https://<YOUR_ACA_FQDN>` |
| Client ID / secret | from step 1 |
| Authorization endpoint | `https://github.com/login/oauth/authorize` |
| Token endpoint | `https://github.com/login/oauth/access_token` |
| Refresh endpoint | `https://github.com/login/oauth/access_token` |
| Scope | `read:user` |
| Enable PKCE | off (GitHub OAuth apps don't require it) |

Save → copy the generated **registration ID**.

> For a different IdP (Okta/Auth0/Pega STS) just swap the three endpoint URLs,
> the client id/secret, and the scope. Everything else is identical.

### 3. Point the agent at the registration and rebuild
```bash

sed -i 's/^OAUTH_REGISTRATION_ID=.*/OAUTH_REGISTRATION_ID=<registration-id>/' env/.env.dev
./scripts/build_package.sh        # emits auth.type = OAuthPluginVault
```
Re-upload `appPackage/build/PegaBlueprintMCP.zip` in Copilot.

### 4. Configure + enable the server validator
```bash
az containerapp update -g rg-pega-blueprint-poc -n pega-blueprint-mcp --set-env-vars \
  PEGA_MCP_AUTH_MODE=generic \
  PEGA_MCP_OAUTH_USERINFO_URL=https://api.github.com/user \
  PEGA_MCP_REQUIRE_AUTH=true
```

### 5. Test
New Copilot chat → *"Open my Pega Blueprint"* → click **Sign in**
→ GitHub's **Authorize** screen (once) → blueprint renders. Subsequent calls are
silent (the broker caches + refreshes the token).

## Verify
```bash
BASE=https://<YOUR_ACA_FQDN>
curl -s -o /dev/null -w "healthz %{http_code}\n" "$BASE/healthz"          # 200
curl -s -o /dev/null -w "mcp(noauth) %{http_code}\n" -X POST \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{}' "$BASE/mcp"                                                     # 401
```

## Rollback to anonymous
```bash
az containerapp update -g rg-pega-blueprint-poc -n pega-blueprint-mcp \
  --set-env-vars PEGA_MCP_REQUIRE_AUTH=false
( sed -i 's/^OAUTH_REGISTRATION_ID=.*/OAUTH_REGISTRATION_ID=/' env/.env.dev && ./scripts/build_package.sh )
```

## For production (Pega's own IdP)
Replace GitHub with Pega's OAuth/STS: set the three endpoint URLs to Pega's, the
scope to whatever represents "use the Blueprint API", and
`PEGA_MCP_OAUTH_USERINFO_URL` to Pega's userinfo (or a token-introspection
wrapper). Each customer then simply installs the agent and signs into **Pega** —
no Entra app, no admin consent, no per-customer Microsoft configuration.

## Variant: Entra ID *as a generic* OAuth 2 provider (best of both worlds)

You can keep **Microsoft identity** while still avoiding all the Entra-SSO
plumbing — by pointing the *generic* OAuth registration at Entra's standard
endpoints with **user-consentable Graph scopes**. This is the cleanest pattern:
real Microsoft users, no admin consent, no token-store preauthorization, no
per-tenant provisioning, multi-tenant via `/common`.

Proven working in the `oauth-card-poc` bot (connection `entra-as-generic`):

| TDP OAuth client field | Value |
| --- | --- |
| Authorization endpoint | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| Token endpoint | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| Refresh endpoint | same as token |
| Scope | `openid profile offline_access User.Read` |
| Client ID / secret | a **multi-tenant** Entra app's id + secret |

Server config (the token's audience is Microsoft Graph, so validate via Graph `/me`):

```bash
az containerapp update -g rg-pega-blueprint-poc -n pega-blueprint-mcp --set-env-vars \
  PEGA_MCP_AUTH_MODE=generic \
  PEGA_MCP_OAUTH_USERINFO_URL=https://graph.microsoft.com/v1.0/me \
  PEGA_MCP_REQUIRE_AUTH=true
```

Why it needs no admin / no per-tenant setup: `User.Read`, `openid`, `profile`,
`offline_access` are all **user-consentable** Graph permissions. A user from any
tenant signs in via `/common`, consents once, and a service principal is
auto-created in their tenant as part of that consent — no admin step, no
per-customer registration. Use a specific tenant id instead of `common` to lock
it to one org. For an allowlist, set `PEGA_MCP_OAUTH_SUBJECT_FIELD=userPrincipalName`
and `PEGA_MCP_OAUTH_ALLOWED_SUBJECTS=user@contoso.com,...`.

> Contrast with the Entra **SSO** path (`docs/auth-runbook.md`): that uses an
> app-specific scope (`api://app/access_as_user`) + a token-store preauthorized
> client + an SSO registration, which is what dragged in admin consent and
> per-tenant provisioning. Entra-as-generic skips all of it.
