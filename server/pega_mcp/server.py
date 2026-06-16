"""MCP Apps server bootstrap for the Pega Customer Engagement Blueprint.

Exposes a single UI resource (the blueprint widget) plus a set of tools that
return ``structuredContent`` the widget renders. Tools are linked to the widget
through ``_meta.ui.resourceUri`` (the MCP Apps convention), so when Copilot calls
a tool it renders the widget inline and hands it the data.

Run locally::

    uv run python -m pega_mcp          # http://localhost:3978/mcp
"""

from __future__ import annotations

import json
from pathlib import Path

import uvicorn
from mcp import types
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse, Response

import anyio

from . import auth, export, store
from .settings import get_settings
from .tools import PROMPT_SPECS, TOOL_SPECS, WIDGET_URI

_WEB_DIR = Path(__file__).parent / "web"


def _load_widget_html() -> str:
    """Read the built widget HTML fresh on each request (picks up rebuilds)."""
    path = _WEB_DIR / "widget.html"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return (
        "<!doctype html><html><body style=\"font-family:sans-serif;padding:24px\">"
        "<h3>Blueprint widget not built yet</h3>"
        "<p>Run <code>npm install &amp;&amp; npm run build</code> in the "
        "<code>widgets/</code> folder, then restart this server.</p>"
        "</body></html>"
    )


settings = get_settings()

mcp = FastMCP(
    "pega-blueprint",
    host=settings.host,
    port=settings.port,
    # Behind a dev tunnel / proxy the Host header is the public FQDN, which the
    # default DNS-rebinding guard rejects (HTTP 421). Disable it for the tunnel /
    # App Service scenarios used by the Microsoft 365 Agents Toolkit.
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
)


@mcp.resource(WIDGET_URI, mime_type="text/html;profile=mcp-app")
async def blueprint_widget() -> str:
    return _load_widget_html()


# Expose the widget URI as a resource *template* as well. Some MCP Apps hosts
# (Microsoft 365 Copilot) discover renderable widgets via listResourceTemplates,
# so advertising it here ensures the host fetches and renders the inline UI.
@mcp._mcp_server.list_resource_templates()
async def _list_resource_templates() -> list[types.ResourceTemplate]:
    return [
        types.ResourceTemplate(
            uriTemplate=WIDGET_URI,
            name="Pega Blueprint widget",
            description="Inline UI for the Customer Engagement Blueprint.",
            mimeType="text/html;profile=mcp-app",
            _meta={"ui": {"resourceUri": WIDGET_URI}},
        )
    ]


# Register every tool. UI tools carry the MCP Apps `_meta.ui.resourceUri` link.
for _spec in TOOL_SPECS:
    _kwargs: dict = {"name": _spec["name"], "description": _spec["description"]}
    if _spec.get("ui", True):
        _kwargs["meta"] = {"ui": {"resourceUri": WIDGET_URI}}
    mcp.tool(**_kwargs)(_spec["handler"])

for _spec in PROMPT_SPECS:
    mcp.prompt(name=_spec["name"], description=_spec["description"])(_spec["handler"])


# ── Bearer-token auth (pure ASGI, streaming-safe) ────────────────────────────

class BearerAuthMiddleware:
    """Require a valid Entra bearer token on protected path prefixes (default /mcp).

    Implemented as pure ASGI passthrough so it never buffers the MCP streaming
    (SSE) responses. Health and export routes stay public; OPTIONS preflight is
    always allowed.
    """

    def __init__(self, app, validate, protect_prefixes=("/mcp",)) -> None:
        self.app = app
        self.validate = validate
        self.prefixes = protect_prefixes

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            return await self.app(scope, receive, send)
        path = scope.get("path", "")
        method = scope.get("method", "GET")
        if method == "OPTIONS" or not any(path.startswith(p) for p in self.prefixes):
            return await self.app(scope, receive, send)

        headers = dict(scope.get("headers") or [])
        raw = headers.get(b"authorization", b"").decode("latin-1")
        token = raw[7:].strip() if raw[:7].lower() == "bearer " else ""

        detail = "missing bearer token"
        if token:
            try:
                await anyio.to_thread.run_sync(self.validate, token)
                return await self.app(scope, receive, send)
            except Exception as exc:  # noqa: BLE001 - any failure -> 401
                detail = str(exc)

        body = json.dumps({"error": "unauthorized", "detail": detail}).encode()
        await send({
            "type": "http.response.start",
            "status": 401,
            "headers": [
                (b"content-type", b"application/json"),
                (b"www-authenticate", b'Bearer error="invalid_token"'),
            ],
        })
        await send({"type": "http.response.body", "body": body})


def build_app():
    """Build the Starlette/Streamable-HTTP ASGI app with CORS + export routes."""
    app = mcp.streamable_http_app()
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()] or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "mcp-session-id",
            "mcp-protocol-version",
        ],
        expose_headers=["mcp-session-id"],
    )

    async def healthz(_req: Request) -> Response:
        return PlainTextResponse("ok")

    # Public download routes for the Summary "Download PDF / Excel / Blueprint"
    # actions. format: pdf | excel | blueprint (importable JSON).
    async def export_route(req: Request) -> Response:
        blueprint_id = req.path_params["blueprint_id"]
        fmt = req.path_params["fmt"]
        bp = store.get(blueprint_id)
        if not bp:
            return JSONResponse({"error": "Blueprint not found"}, status_code=404)
        name = export.safe_filename(bp["title"])
        try:
            if fmt == "pdf":
                data_bytes = export.build_pdf(bp)
                media, ext = "application/pdf", "pdf"
            elif fmt in ("excel", "xlsx"):
                data_bytes = export.build_xlsx(bp)
                media, ext = (
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "xlsx",
                )
            elif fmt == "blueprint":
                data_bytes = export.build_blueprint_json(bp)
                media, ext = "application/json", "blueprint.json"
            else:
                return JSONResponse({"error": "Unsupported format"}, status_code=400)
        except Exception as exc:  # noqa: BLE001 - surface a clean 500
            return JSONResponse({"error": f"Export failed: {exc}"}, status_code=500)
        return Response(
            content=data_bytes,
            media_type=media,
            headers={"Content-Disposition": f'attachment; filename="{name}.{ext}"'},
        )

    app.add_route("/healthz", healthz, methods=["GET"])
    app.add_route("/export/{blueprint_id}/{fmt}", export_route, methods=["GET"])

    # Gate /mcp behind bearer auth when configured. Wrapped outermost so it runs
    # before routing; pure ASGI keeps MCP streaming intact. OFF by default.
    # Two IdP modes (settings.auth_mode):
    #   "generic" — any OAuth 2 provider (GitHub/Okta/Pega STS); opaque token
    #               validated via its userinfo endpoint. No Microsoft-tenant setup.
    #   "entra"   — Microsoft Entra ID; token validated as a signed JWT.
    if settings.require_auth:
        validate = None
        if settings.auth_mode == "generic" and settings.oauth_userinfo_url:
            validate = auth.make_userinfo_validator(
                settings.oauth_userinfo_url,
                subject_field=settings.oauth_subject_field,
                allowed_subjects=settings.allowed_subjects_list(),
            )
        elif settings.entra_tenant_id and settings.audiences_list():
            validate = auth.make_validator(
                settings.entra_tenant_id,
                settings.audiences_list(),
                settings.entra_required_scope,
                allowed_tenants=settings.allowed_tenants_list(),
            )
        if validate is not None:
            return BearerAuthMiddleware(app, validate)
    return app


# ASGI entry point for production servers (e.g. `uvicorn pega_mcp.server:app`).
app = build_app()


def main() -> None:
    print(
        f"\n  Pega Blueprint MCP server\n"
        f"  Transport : Streamable HTTP\n"
        f"  Endpoint  : http://{settings.host}:{settings.port}/mcp\n"
        f"  Tools     : {', '.join(s['name'] for s in TOOL_SPECS)}\n"
    )
    uvicorn.run(app, host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
