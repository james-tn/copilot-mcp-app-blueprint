"""Runtime configuration, loaded from environment variables (prefix ``PEGA_MCP_``).

Example::

    PEGA_MCP_PORT=3978
    PEGA_MCP_CORS_ORIGINS=*
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="PEGA_MCP_",
        env_file=".env",
        extra="ignore",
    )

    # Host/port the Streamable HTTP app binds to.
    host: str = "0.0.0.0"
    port: int = 3978

    # Comma-separated CORS allow-list. "*" is fine for local development; lock it
    # down for production deployments.
    cors_origins: str = "*"

    # Public base URL of this server (no trailing slash, no /mcp), used to build
    # absolute download links in the summary payload. On Azure App Service set
    # PEGA_MCP_PUBLIC_URL=https://<app>.azurewebsites.net. Empty -> localhost.
    public_url: str = ""

    # ── Microsoft Entra bearer-token auth (OFF by default) ──────────────────
    # Turn on to require a valid Entra access token on /mcp. Leave OFF until the
    # Copilot OAuth registration is in place, so the anonymous demo keeps working.
    require_auth: bool = False
    # Which IdP the bearer token comes from:
    #   "entra"   — Microsoft Entra ID (validated as a signed JWT). Needs the
    #               customer's tenant to register/consent the app.
    #   "generic" — any RFC 6749 OAuth 2 provider (GitHub, Okta, Auth0, Pega's
    #               own STS, ...) that returns an opaque token, validated by
    #               calling its userinfo endpoint. Needs NOTHING in the
    #               customer's Microsoft tenant — simplest for ISV distribution.
    auth_mode: str = "entra"
    # The Entra tenant that issues/validates tokens (the "Contoso" resource tenant).
    # Use a GUID for single-tenant, or "common"/"organizations" for the multi-tenant
    # ISV model (each token validated against its own tenant).
    entra_tenant_id: str = ""
    # Accepted token audiences (comma-separated): the API app client id and/or
    # its Application ID URI, e.g. "<api-app-id>,api://<api-app-id>".
    entra_audiences: str = ""
    # Optional required delegated scope, e.g. "access_as_user".
    entra_required_scope: str = ""
    # Optional comma-separated allowlist of subscribed customer tenant ids, used
    # only in multi-tenant mode. Empty = accept any tenant holding a valid token
    # for our audience.
    entra_allowed_tenants: str = ""

    # ── Generic OAuth 2 (auth_mode="generic") ───────────────────────────────
    # Userinfo endpoint that returns the caller's profile for a valid bearer
    # token, e.g. "https://api.github.com/user" or an OIDC "/userinfo" URL.
    oauth_userinfo_url: str = ""
    # Profile field used as the identity (e.g. "login" for GitHub, "sub"/"email"
    # for OIDC). Only needed if oauth_allowed_subjects is set.
    oauth_subject_field: str = ""
    # Optional comma-separated allowlist of permitted subjects (logins/emails).
    # Empty = accept any identity the IdP vouches for.
    oauth_allowed_subjects: str = ""

    def audiences_list(self) -> list[str]:
        return [a.strip() for a in self.entra_audiences.split(",") if a.strip()]

    def allowed_tenants_list(self) -> list[str]:
        return [t.strip() for t in self.entra_allowed_tenants.split(",") if t.strip()]

    def allowed_subjects_list(self) -> list[str]:
        return [s.strip() for s in self.oauth_allowed_subjects.split(",") if s.strip()]


def get_settings() -> Settings:
    return Settings()
