"""Local unit test for pega_mcp.auth — RS256 verify + claim checks.

Generates a throwaway RSA keypair with openssl, mints a JWT signed with it,
builds a matching JWKS, and exercises the pure-Python validator (valid token +
tamper / wrong-aud / expired negatives). No network, no compiled deps.

Run: uv run python scripts/test_auth.py
"""

from __future__ import annotations

import base64
import json
import subprocess
import time
from pathlib import Path

from pega_mcp import auth

TENANT = "11111111-1111-1111-1111-111111111111"
AUD = "22222222-2222-2222-2222-222222222222"
KID = "testkey1"
TMP = Path("/tmp/pega_auth_test")


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def sh(cmd: str) -> bytes:
    return subprocess.run(cmd, shell=True, check=True, capture_output=True).stdout


def main() -> None:
    TMP.mkdir(exist_ok=True)
    priv = TMP / "priv.pem"
    sh(f"openssl genrsa -out {priv} 2048 2>/dev/null")

    # Extract modulus (n) and exponent (e) from the public key.
    mod_hex = sh(f"openssl rsa -in {priv} -noout -modulus 2>/dev/null").decode().strip()
    mod_hex = mod_hex.split("=", 1)[1]
    n = int(mod_hex, 16)
    n_bytes = n.to_bytes((n.bit_length() + 7) // 8, "big")
    e = 65537
    e_bytes = e.to_bytes((e.bit_length() + 7) // 8, "big")

    jwks = {KID: {"kty": "RSA", "kid": KID, "n": b64url(n_bytes), "e": b64url(e_bytes)}}
    loader = lambda _tenant: jwks  # noqa: E731

    def mint(claims: dict) -> str:
        header = {"alg": "RS256", "typ": "JWT", "kid": KID}
        seg = b64url(json.dumps(header).encode()) + "." + b64url(json.dumps(claims).encode())
        (TMP / "si.bin").write_bytes(seg.encode())
        sig = sh(f"openssl dgst -sha256 -sign {priv} {TMP/'si.bin'}")
        return seg + "." + b64url(sig)

    now = int(time.time())
    good_claims = {
        "iss": f"https://login.microsoftonline.com/{TENANT}/v2.0",
        "aud": AUD,
        "tid": TENANT,
        "scp": "access_as_user",
        "iat": now, "nbf": now, "exp": now + 3600,
        "name": "Test User",
    }

    validate = auth.make_validator(TENANT, [AUD], "access_as_user", jwks_loader=loader)

    results: list[tuple[str, bool]] = []

    # 1) valid token passes
    try:
        c = validate(mint(good_claims))
        results.append(("valid token accepted", c.get("name") == "Test User"))
    except auth.AuthError as exc:
        results.append((f"valid token accepted (got {exc})", False))

    # 2) tampered signature fails
    tok = mint(good_claims)
    tampered = tok[:-4] + ("AAAA" if not tok.endswith("AAAA") else "BBBB")
    results.append(("tampered signature rejected", _rejects(validate, tampered)))

    # 3) wrong audience fails
    results.append(("wrong audience rejected", _rejects(validate, mint({**good_claims, "aud": "someone-else"}))))

    # 4) expired fails
    results.append(("expired token rejected", _rejects(validate, mint({**good_claims, "exp": now - 7200, "nbf": now - 7300, "iat": now - 7300}))))

    # 5) wrong issuer fails
    results.append(("wrong issuer rejected", _rejects(validate, mint({**good_claims, "iss": "https://evil.example/v2.0"}))))

    # 6) missing scope fails
    results.append(("missing scope rejected", _rejects(validate, mint({**good_claims, "scp": "other"}))))

    print()
    ok = True
    for name, passed in results:
        print(f"  [{'PASS' if passed else 'FAIL'}] {name}")
        ok = ok and passed
    print()
    print("✅ all auth checks passed" if ok else "❌ some auth checks FAILED")
    raise SystemExit(0 if ok else 1)


def _rejects(validate, token: str) -> bool:
    try:
        validate(token)
        return False
    except auth.AuthError:
        return True


if __name__ == "__main__":
    main()
