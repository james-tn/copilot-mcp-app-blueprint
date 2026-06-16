"""Microsoft Entra (Azure AD) bearer-token validation — pure Python, zero compiled deps.

This makes the MCP server an OAuth 2.0 protected resource. When Microsoft 365
Copilot calls the server with `Authorization: Bearer <jwt>` (obtained via the
plugin's OAuth registration), this module validates the token:

* RS256 signature against the tenant's JWKS (RSA verify implemented in pure
  Python so the server builds on any host — no `cryptography`/`PyJWT`),
* issuer is the configured Entra tenant (v1 or v2 form),
* audience matches the API app (client id or `api://<client id>`),
* not expired / not before, optional required scope, optional tenant (`tid`).

It is OFF by default (see settings.require_auth) so the anonymous demo keeps
working until the Copilot OAuth registration is in place.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
from typing import Any, Callable


class AuthError(Exception):
    """Raised when a bearer token fails validation."""


# ── base64url ────────────────────────────────────────────────────────────────

def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def _b64url_to_int(data: str) -> int:
    return int.from_bytes(_b64url_decode(data), "big")


# ── pure-Python RS256 verification ───────────────────────────────────────────

# DER prefix for an EMSA-PKCS1-v1_5 DigestInfo with SHA-256.
_SHA256_DIGESTINFO_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")


def _rsa_pkcs1_v15_verify(message: bytes, signature: bytes, n: int, e: int) -> bool:
    """Verify an RSASSA-PKCS1-v1_5 / SHA-256 signature using only big-int math."""
    k = (n.bit_length() + 7) // 8
    if len(signature) != k:
        return False
    s = int.from_bytes(signature, "big")
    if s >= n:
        return False
    m = pow(s, e, n)  # RSA verify primitive (public exponent is tiny: fast)
    em = m.to_bytes(k, "big")

    digest = hashlib.sha256(message).digest()
    t = _SHA256_DIGESTINFO_PREFIX + digest
    if k < len(t) + 11:
        return False
    ps = b"\xff" * (k - len(t) - 3)
    expected = b"\x00\x01" + ps + b"\x00" + t
    return hmac.compare_digest(em, expected)


# ── JWKS cache ───────────────────────────────────────────────────────────────

_jwks_cache: dict[str, tuple[float, dict[str, dict[str, Any]]]] = {}
_JWKS_TTL = 3600.0


def _default_jwks_loader(tenant_id: str) -> dict[str, dict[str, Any]]:
    """Fetch the tenant JWKS (keyed by `kid`), cached for an hour."""
    now = time.time()
    cached = _jwks_cache.get(tenant_id)
    if cached and now - cached[0] < _JWKS_TTL:
        return cached[1]
    url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310 - fixed Microsoft URL
        doc = json.loads(resp.read().decode("utf-8"))
    keys = {k["kid"]: k for k in doc.get("keys", []) if k.get("kty") == "RSA"}
    _jwks_cache[tenant_id] = (now, keys)
    return keys


# ── Validator factory ────────────────────────────────────────────────────────

# Tenant markers that put the validator in multi-tenant mode (ISV/SaaS): the
# token is validated against *its own* tenant (the ``tid`` claim) rather than a
# single fixed tenant. This is what lets one Entra app registration serve many
# customer tenants.
_MULTITENANT = {"common", "organizations", "*", ""}


def make_validator(
    tenant_id: str,
    audiences: list[str],
    required_scope: str = "",
    *,
    leeway: int = 120,
    allowed_tenants: list[str] | None = None,
    jwks_loader: Callable[[str], dict[str, dict[str, Any]]] | None = None,
) -> Callable[[str], dict[str, Any]]:
    """Build a ``validate(token) -> claims`` callable. Raises AuthError on failure.

    Single-tenant: pass a concrete ``tenant_id`` (GUID). Tokens must come from
    that tenant.

    Multi-tenant (ISV): pass ``tenant_id="common"`` (or "organizations"/"*").
    Each token is then validated against the tenant named in its own ``tid``
    claim — signature checked against that tenant's JWKS, issuer matched to that
    tenant. Pass ``allowed_tenants`` to restrict to your list of subscribed
    customer tenants (empty = any tenant that holds a token for your audience).
    """
    loader = jwks_loader or _default_jwks_loader
    aud_set = set(audiences)
    multitenant = tenant_id.lower() in _MULTITENANT
    allow_set = {t.strip() for t in (allowed_tenants or []) if t.strip()}

    def _issuers_for(tid: str) -> set[str]:
        return {
            f"https://login.microsoftonline.com/{tid}/v2.0",
            f"https://sts.windows.net/{tid}/",
        }

    def validate(token: str) -> dict[str, Any]:
        parts = token.split(".")
        if len(parts) != 3:
            raise AuthError("malformed token")
        header_b64, payload_b64, sig_b64 = parts
        try:
            header = json.loads(_b64url_decode(header_b64))
            claims = json.loads(_b64url_decode(payload_b64))
            signature = _b64url_decode(sig_b64)
        except Exception as exc:  # noqa: BLE001
            raise AuthError(f"undecodable token: {exc}") from exc

        if header.get("alg") != "RS256":
            raise AuthError(f"unsupported alg: {header.get('alg')}")
        kid = header.get("kid")
        if not kid:
            raise AuthError("missing kid")

        # Decide which tenant's keys/issuer to validate against. In multi-tenant
        # mode this comes from the (as-yet-unverified) ``tid`` claim, which only
        # selects the JWKS endpoint — the signature check below still proves the
        # token was issued by that tenant, and the audience/allowlist checks stop
        # tokens minted for other apps/tenants.
        if multitenant:
            tok_tid = claims.get("tid")
            if not tok_tid:
                raise AuthError("missing tid")
            if allow_set and tok_tid not in allow_set:
                raise AuthError("tenant not allowed")
            key_tenant = tok_tid
            valid_issuers = _issuers_for(tok_tid)
        else:
            key_tenant = tenant_id
            valid_issuers = _issuers_for(tenant_id)

        keys = loader(key_tenant)
        jwk = keys.get(kid)
        if not jwk:
            # Key may have rotated — drop the cache and retry once.
            _jwks_cache.pop(key_tenant, None)
            jwk = loader(key_tenant).get(kid)
        if not jwk:
            raise AuthError("signing key not found")

        n = _b64url_to_int(jwk["n"])
        e = _b64url_to_int(jwk["e"])
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        if not _rsa_pkcs1_v15_verify(signing_input, signature, n, e):
            raise AuthError("bad signature")

        now = int(time.time())
        if "exp" in claims and now > int(claims["exp"]) + leeway:
            raise AuthError("token expired")
        if "nbf" in claims and now < int(claims["nbf"]) - leeway:
            raise AuthError("token not yet valid")

        if claims.get("iss") not in valid_issuers:
            raise AuthError(f"bad issuer: {claims.get('iss')}")
        if aud_set and claims.get("aud") not in aud_set:
            raise AuthError(f"bad audience: {claims.get('aud')}")
        if not multitenant and tenant_id and claims.get("tid") not in (None, tenant_id):
            raise AuthError("wrong tenant")
        if required_scope:
            scopes = str(claims.get("scp", "")).split()
            if required_scope not in scopes:
                raise AuthError("missing required scope")
        return claims

    return validate


# ── Generic OAuth 2 validator (non-Microsoft IdP, opaque tokens) ─────────────

# Many IdPs (GitHub, Okta, Auth0, Pega's own STS, ...) return OPAQUE access
# tokens, not JWTs — so there's nothing to verify a signature on. The standard
# way to validate them is to call the IdP's "userinfo" endpoint with the token:
# a 200 means the token is live and the IdP vouches for the identity it returns.
# This is the same pattern the Bot Framework reference uses, and it needs ZERO
# configuration in the customer's Microsoft tenant — the IdP is whatever you
# point it at.

_userinfo_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_USERINFO_TTL = 60.0  # short: a single widget render makes several MCP calls


def make_userinfo_validator(
    userinfo_url: str,
    *,
    subject_field: str = "",
    allowed_subjects: list[str] | None = None,
    cache_ttl: float = _USERINFO_TTL,
    fetch: Callable[[str, str], tuple[int, dict[str, Any]]] | None = None,
) -> Callable[[str], dict[str, Any]]:
    """Build a ``validate(token) -> claims`` callable for a generic OAuth 2 IdP.

    ``userinfo_url``    GET endpoint that returns the caller's profile when
                        called with ``Authorization: Bearer <token>`` (e.g.
                        ``https://api.github.com/user`` or an OIDC ``/userinfo``).
    ``subject_field``   optional claim used as the identity (e.g. ``login`` for
                        GitHub, ``sub``/``email`` for OIDC). If ``allowed_subjects``
                        is set, this field must match one of them.
    ``allowed_subjects``optional allowlist of permitted subject values.
    ``fetch``           test hook: ``(url, token) -> (status, json)``.
    """
    allow_set = {s.strip() for s in (allowed_subjects or []) if s.strip()}
    do_fetch = fetch or _http_get_json

    def validate(token: str) -> dict[str, Any]:
        token = (token or "").strip()
        if not token:
            raise AuthError("missing token")

        now = time.time()
        cached = _userinfo_cache.get(token)
        if cached and now - cached[0] < cache_ttl:
            claims = cached[1]
        else:
            try:
                status, claims = do_fetch(userinfo_url, token)
            except Exception as exc:  # noqa: BLE001 - network/parse failure
                raise AuthError(f"userinfo call failed: {exc}") from exc
            if status in (401, 403):
                raise AuthError("invalid or expired token")
            if status != 200 or not isinstance(claims, dict):
                raise AuthError(f"userinfo returned status {status}")
            _userinfo_cache[token] = (now, claims)

        if allow_set:
            subject = str(claims.get(subject_field, "")) if subject_field else ""
            if subject not in allow_set:
                raise AuthError("subject not allowed")
        return claims

    return validate


def _http_get_json(url: str, token: str) -> tuple[int, dict[str, Any]]:
    """GET ``url`` with a bearer token; return (status, parsed-json)."""
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": "pega-blueprint-mcp",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310 - configured IdP URL
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:  # type: ignore[attr-defined]
        return exc.code, {}

