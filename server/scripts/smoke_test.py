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

            # State awareness: the server tracks the live UI step/case AND provenance,
            # so the agent (a separate session) knows the user CREATED this blueprint
            # (not a sample) and which step they're on.
            st = await call("get_app_state")
            assert st.get("view") == "app-state", st
            assert st.get("phase") == "summary", st
            assert st.get("title") == "Claims Intake", st
            assert st.get("origin") == "created" and st.get("createdThisSession") is True, st
            assert st.get("recentActivity"), st
            assert st.get("summary"), st

            # The agent can enumerate the user's own blueprints (created + the sample).
            lst = await call("list_blueprints")
            assert lst.get("view") == "blueprint-list", lst
            assert lst.get("createdCount", 0) >= 1, lst
            created_titles = [b["title"] for b in lst["blueprints"] if b.get("createdThisSession")]
            assert "Claims Intake" in created_titles, lst
            assert any(b.get("isCurrent") for b in lst["blueprints"]), lst

            # Author a blueprint from an EXPLICIT described lifecycle (incl. wait + resolve
            # step types) — general workflow modeling, the foundation for WorkIQ grounding.
            authored = await call(
                "author_blueprint",
                title="Capacity & Quota Management",
                industry="Cross Industry",
                sub_industry="Cloud Operations",
                case_types=[{
                    "name": "Capacity & Quota Management",
                    "stages": [
                        {"name": "Intake", "kind": "primary", "steps": [
                            {"name": "Capture Resource Request", "type": "collect"},
                            {"name": "Validate Request Completeness", "type": "decision"},
                        ]},
                        {"name": "Quota adjustment", "kind": "primary", "steps": [
                            {"name": "Submit Quota Increase Request", "type": "automation"},
                            {"name": "Wait for Quota Approval Response", "type": "wait"},
                        ]},
                        {"name": "Monitoring and closure", "kind": "primary", "steps": [
                            {"name": "Generate Capacity and Quota Insights", "type": "ai-agent"},
                            {"name": "Resolve Capacity and Quota Management Case", "type": "resolve"},
                        ]},
                    ],
                }],
            )
            assert authored.get("view") == "overview", authored
            assert authored.get("title") == "Capacity & Quota Management", authored
            acase = authored["caseTypes"][0]
            assert acase["name"] == "Capacity & Quota Management", authored
            # the authored, typed steps survive round-trip (wait + resolve preserved)
            adet = await call("show_workflow", case=acase["id"])
            atypes = {s["type"] for st in adet["case"]["stages"] for s in st.get("steps", [])}
            assert "wait" in atypes and "resolve" in atypes, atypes

            # Re-open a previously created blueprint by title (switch the current one).
            reopened = await call("open_blueprint", blueprint="Claims Intake")
            assert reopened.get("view") == "overview" and reopened.get("title") == "Claims Intake", reopened
            stt = await call("get_app_state")
            assert stt.get("title") == "Claims Intake", stt

            # Read the widget resource.
            widget_uri = "ui://pega-blueprint/app.html"
            content = await session.read_resource(widget_uri)
            html = content.contents[0].text if content.contents else ""
            print(f"\nwidget resource: {len(html)} chars, starts: {html[:40]!r}")
            assert "<" in html and len(html) > 1000, "widget html looks empty"

            print("\n✅ smoke test passed")


if __name__ == "__main__":
    asyncio.run(main())
