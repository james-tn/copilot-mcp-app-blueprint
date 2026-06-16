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
            cr = await call("show_create")
            assert cr.get("view") == "create" and cr.get("catalog"), cr
            new = await call("create_blueprint", industry="Insurance", sub_industry="Claims", purpose="Claims Intake")
            assert new.get("view") == "overview", new
            assert any(c["name"] == "Claims Intake" for c in new["caseTypes"]), new
            wf = await call("show_workflows")
            assert wf.get("caseTypes"), wf
            first_case = wf["caseTypes"][0]["id"]
            det = await call("show_workflow", case=first_case)
            assert det.get("view") == "workflow-details", det
            assert det["case"]["stages"], det
            await call("show_data")
            personas = await call("show_personas")
            assert personas.get("personas"), personas
            await call("show_summary")
            data = await call("get_blueprint_summary")
            assert data.get("view") == "summary-data", data

            # State awareness: the server tracks the live UI step across calls, so
            # the agent (a separate session) can read it. We just navigated to
            # 'summary' (via show_summary), and the active blueprint is the one we
            # created, so app-state must reflect both.
            st = await call("get_app_state")
            assert st.get("view") == "app-state", st
            assert st.get("phase") == "summary", st
            assert st.get("title") == "Claims Intake", st
            assert st.get("summary"), st

            # Read the widget resource.
            widget_uri = "ui://pega-blueprint/app.html"
            content = await session.read_resource(widget_uri)
            html = content.contents[0].text if content.contents else ""
            print(f"\nwidget resource: {len(html)} chars, starts: {html[:40]!r}")
            assert "<" in html and len(html) > 1000, "widget html looks empty"

            print("\n✅ smoke test passed")


if __name__ == "__main__":
    asyncio.run(main())
