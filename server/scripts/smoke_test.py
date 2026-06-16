"""End-to-end MCP client smoke test.

Starts an in-process Streamable HTTP client against a running server and exercises
every tool, asserting the widget resource and structuredContent come back.

Run the server first::

    uv run python -m pega_mcp        # http://localhost:3978/mcp

Then in another shell::

    uv run python scripts/smoke_test.py
"""

from __future__ import annotations

import asyncio
import os

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

URL = os.environ.get("MCP_ENDPOINT_URL", "http://localhost:3978/mcp")


async def main() -> None:
    async with streamablehttp_client(URL) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            names = [t.name for t in tools.tools]
            print("tools:", names)

            resources = await session.list_resources()
            print("resources:", [str(r.uri) for r in resources.resources])

            async def call(name: str, **args):
                res = await session.call_tool(name, args)
                sc = res.structuredContent or {}
                text = res.content[0].text if res.content else ""
                print(f"\n• {name}({args}) -> view={sc.get('view')}")
                print("  text:", text[:110])
                return sc

            ov = await call("show_blueprint")
            assert ov.get("view") == "overview", ov
            personas = await call("show_personas")
            assert len(personas.get("personas", [])) == 5
            await call("show_brand")
            exp = await call("show_experiences")
            assert exp.get("groups"), exp
            first_action = exp["groups"][0]["actions"][0]["id"]
            act = await call("show_action", action=first_action)
            assert act.get("view") == "action", act
            assert act["action"]["treatments"], act
            await call("show_summary")
            data = await call("get_blueprint_summary")
            assert data.get("view") == "summary-data", data

            # Read the widget resource.
            widget_uri = "ui://pega-blueprint/app.html"
            content = await session.read_resource(widget_uri)
            html = content.contents[0].text if content.contents else ""
            print(f"\nwidget resource: {len(html)} chars, starts: {html[:40]!r}")
            assert "<" in html and len(html) > 1000, "widget html looks empty"

            print("\n✅ smoke test passed")


if __name__ == "__main__":
    asyncio.run(main())
