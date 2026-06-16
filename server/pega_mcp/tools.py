"""MCP tool + prompt handlers for the Pega Blueprint MCP App.

Every UI tool returns a :class:`mcp.types.CallToolResult` carrying:

* ``content``           – a short text summary Copilot can read aloud / ground on.
* ``structuredContent`` – the payload the widget renders. Each payload includes a
  ``view`` discriminator so the single widget routes to the right step view.

``TOOL_SPECS`` / ``PROMPT_SPECS`` are consumed by ``server.py``.
"""

from __future__ import annotations

from typing import Any

from mcp import types

from . import store

# Stable URI for the single blueprint widget. Every UI tool result points here
# via ``_meta.ui.resourceUri`` so the host knows to render the widget inline.
WIDGET_URI = "ui://pega-blueprint/app.html"


def _result(text: str, structured: dict[str, Any], *, ui: bool = True) -> types.CallToolResult:
    kwargs: dict[str, Any] = {
        "content": [types.TextContent(type="text", text=text)],
        "structuredContent": structured,
    }
    if ui:
        # Echo the widget link on the RESULT (not just the tool descriptor) so the
        # host renders the widget for this invocation and reads the UI resource.
        kwargs["_meta"] = {"ui": {"resourceUri": WIDGET_URI}}
    return types.CallToolResult(**kwargs)


# ── Tool handlers ────────────────────────────────────────────────────────────

async def show_create() -> types.CallToolResult:
    """Render the 'Create a Blueprint' wizard (industry → sub-industry → purpose)."""
    data = store.view_create()
    text = (
        "Start a new blueprint: pick an industry, a sub-industry, and an application "
        "purpose, then Generate. I'll design the workflows, data model and personas."
    )
    return _result(text, data)


async def create_blueprint(industry: str = "", sub_industry: str = "",
                           purpose: str = "", description: str = "") -> types.CallToolResult:
    """Generate a brand-new blueprint from an industry / sub-industry / purpose."""
    if not purpose.strip():
        data = store.view_create()
        return _result(
            "To create a blueprint I need at least an application purpose (e.g. 'Access Request'). "
            "Pick an industry, sub-industry and purpose, then Generate.",
            data,
        )
    bp = store.create_blueprint(industry, sub_industry, purpose, description)
    data = store.view_overview(bp["id"])
    c = store.blueprint_counts(bp)
    text = (
        f"Created blueprint '{bp['title']}' ({bp['subIndustry']} · {bp['id']}): "
        f"{c['caseTypes']} workflows, {c['stages']} stages, {c['steps']} steps, "
        f"{c['dataObjects']} data objects and {c['personas']} personas. Showing the overview."
    )
    return _result(text, data)


async def show_blueprint(phase: str = "") -> types.CallToolResult:
    """Open the blueprint and render the requested step (default: overview)."""
    p = (phase or "").strip().lower()
    if p == "context":
        data = store.view_context()
    elif p in ("workflows", "case-types", "cases"):
        data = store.view_workflows()
    elif p in ("workflow-details", "workflow", "lifecycle", "details"):
        data = store.view_workflow_details(None)
    elif p in ("data", "data-integrations", "integrations"):
        data = store.view_data()
    elif p == "personas":
        data = store.view_personas()
    elif p == "summary":
        data = store.view_summary()
    else:
        data = store.view_overview()
    bp = store.get()
    c = store.blueprint_counts(bp)
    text = (
        f"{bp['title']} ({bp['subIndustry']} · {bp['id']}). "
        f"{c['caseTypes']} workflows, {c['stages']} stages, {c['steps']} steps, "
        f"{c['personas']} personas. Showing the {data['view']} view."
    )
    return _result(text, data)


async def show_workflows() -> types.CallToolResult:
    """Render the workflows (Pega Case Types) generated for the application."""
    data = store.view_workflows()
    names = ", ".join(c["name"] for c in data["caseTypes"])
    text = f"{len(data['caseTypes'])} workflows (case types): {names}."
    return _result(text, data)


async def show_workflow(case: str = "") -> types.CallToolResult:
    """Drill into one workflow and render its Case Lifecycle (stages & steps)."""
    data = store.view_workflow_details(None, case or None)
    if data["view"] == "error":
        return _result(data["message"], data)
    cs = data["case"]
    cc = cs["counts"]
    text = (
        f"{cs['name']} lifecycle: {cc['primaryStages']} primary + {cc['alternateStages']} "
        f"alternate stages, {cc['steps']} steps ({cc['automations']} automated)."
    )
    return _result(text, data)


async def show_data() -> types.CallToolResult:
    """Render the Data & Integrations: data objects, integrations, inbound events, identity."""
    data = store.view_data()
    local = data["dataObjects"]["local"]
    names = ", ".join(o["name"] for o in local)
    text = (
        f"{len(local)} data objects ({names}); {len(data['integrations'])} integrations; "
        f"identity via {data['identity']}."
    )
    return _result(text, data)


async def show_personas() -> types.CallToolResult:
    """Render the worker personas involved in the workflows."""
    data = store.view_personas()
    names = ", ".join(p["name"] for p in data["personas"])
    text = f"{len(data['personas'])} personas: {names}."
    return _result(text, data)


async def show_summary() -> types.CallToolResult:
    """Render the summary: application architecture counts, value, and export options."""
    data = store.view_summary()
    a = data["architecture"]
    v = data["value"]
    text = (
        f"Summary of {data['title']}: {a['caseTypes']} workflows, {a['stages']} stages, "
        f"{a['steps']} steps, {a['dataObjects']} data objects, {a['personas']} personas. "
        f"Illustrative delivery ~{v['blueprintDays']} days with Blueprint vs ~{v['traditionalMonths']} "
        f"months hand-built. Download as PDF, Excel, or an importable Blueprint file."
    )
    return _result(text, data)


async def get_blueprint_summary() -> types.CallToolResult:
    """Return headline blueprint metrics as data only (no widget) for quick text answers."""
    data = store.summary_data()
    text = (
        f"{data['title']} — {data['organization']} ({data['subIndustry']}, {data['industry']}). "
        f"{data['caseTypeCount']} workflows: {', '.join(data['caseTypes'])}. "
        f"{data['stageCount']} stages, {data['stepCount']} steps, "
        f"{data['dataObjectCount']} data objects, {data['personaCount']} personas."
    )
    return _result(text, data, ui=False)


# ── Prompt handlers (conversation starters surfaced by some hosts) ───────────

async def overview_prompt() -> list[types.PromptMessage]:
    return [types.PromptMessage(
        role="user",
        content=types.TextContent(type="text", text="Open my Pega Blueprint."),
    )]


# ── Registries consumed by server.py ─────────────────────────────────────────

TOOL_SPECS: list[dict[str, Any]] = [
    {"name": "show_create", "handler": show_create, "ui": True,
     "description": (
         "Open the 'Create a Blueprint' wizard so the user can start a NEW application design: it "
         "renders the industry → sub-industry → application-purpose pickers. Use for 'create a new "
         "blueprint', 'start a blueprint', 'design a new app', 'new blueprint'.")},
    {"name": "create_blueprint", "handler": create_blueprint, "ui": True,
     "description": (
         "Generate a brand-new blueprint from a selection and render its overview. Parameters: "
         "'industry' (e.g. 'Banking', 'Cross Industry (e.g. HR, IT, Finance, etc.)'), 'sub_industry' "
         "(e.g. 'Human Resources', 'Claims'), 'purpose' (the application purpose, e.g. 'Access "
         "Request', 'Claims Intake'; REQUIRED), and optional 'description'. The server designs the "
         "workflows (case types), case lifecycles, data objects and personas. Use when the user has "
         "chosen what to build, e.g. 'create an Access Request app for IT', 'generate a Claims Intake "
         "blueprint for insurance'.")},
    {"name": "show_blueprint", "handler": show_blueprint, "ui": True,
     "description": (
         "Open the Pega Blueprint (workflow / application design) and render it inline. Optional "
         "'phase' selects which design step to show: 'context' (industry, purpose, description), "
         "'workflows' (the generated case types), 'workflow-details' (a case lifecycle of stages & "
         "steps), 'data' (data objects & integrations), 'personas', or 'summary'. Omit phase for the "
         "overview. Use for 'open my blueprint', 'show the blueprint', 'go to <step>'.")},
    {"name": "show_workflows", "handler": show_workflows, "ui": True,
     "description": (
         "Render the workflows — Pega Case Types — generated for the application, each with its "
         "description and stage/step counts. Use for 'show the workflows', 'what case types did we "
         "create', 'list the workflows'.")},
    {"name": "show_workflow", "handler": show_workflow, "ui": True,
     "description": (
         "Drill into a single workflow and render its Case Lifecycle: primary and alternate stages, "
         "the steps inside each (and their step types: Collect information, Automation, Decision, Send "
         "notification, Generate document, AI Agent, Approve/Reject). Provide 'case' as a workflow name "
         "(e.g. 'Employee Onboarding') or id. Use for 'show the Employee Onboarding lifecycle', 'open "
         "the <workflow> stages'.")},
    {"name": "show_data", "handler": show_data, "ui": True,
     "description": (
         "Render the Data & Integrations step: the application's Data Objects (local vs external and "
         "their system of record), external system Integrations, inbound event channels, and user "
         "identity. Use for 'show the data model', 'what data objects', 'show integrations'.")},
    {"name": "show_personas", "handler": show_personas, "ui": True,
     "description": (
         "Render the worker personas involved in the workflows (name + description). Use for 'show the "
         "personas', 'who uses this app', 'what roles'.")},
    {"name": "show_summary", "handler": show_summary, "ui": True,
     "description": (
         "Render the blueprint summary: application architecture counts (workflows, stages, steps, data "
         "objects, personas), an illustrative delivery-acceleration estimate, Pega Cloud capabilities, "
         "and download options (PDF, Excel, importable Blueprint file). Use for 'summarize the "
         "blueprint', 'show the summary', 'how much faster', 'download/export the blueprint'.")},
    {"name": "get_blueprint_summary", "handler": get_blueprint_summary, "ui": False,
     "description": (
         "Return headline blueprint metrics as data only (no widget) for quick factual answers such as "
         "'how many workflows are there?' or 'what's the application about?'.")},
]

PROMPT_SPECS: list[dict[str, Any]] = [
    {"name": "open_blueprint", "handler": overview_prompt,
     "description": "Open the Pega Blueprint application-design overview."},
]
