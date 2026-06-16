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

async def get_app_state() -> types.CallToolResult:
    """Return what the user is currently doing in the app (data only, no widget)."""
    data = store.app_state()
    return _result(data["summary"], data, ui=False)


async def list_blueprints() -> types.CallToolResult:
    """List all blueprints in the app (the user's created ones + the default sample). Data only."""
    data = store.list_blueprints()
    return _result(data["summary"], data, ui=False)


async def show_create() -> types.CallToolResult:
    """Render the 'Create a Blueprint' wizard (industry → sub-industry → purpose)."""
    data = store.view_create()
    return _result("Opening the new-blueprint wizard in the app.", data)


async def create_blueprint(industry: str = "", sub_industry: str = "",
                           purpose: str = "", description: str = "") -> types.CallToolResult:
    """Generate a brand-new blueprint from an industry / sub-industry / purpose."""
    if not purpose.strip():
        data = store.view_create()
        return _result(
            "I need an application purpose to generate (e.g. 'Access Request'). "
            "The wizard is open in the app.",
            data,
        )
    bp = store.create_blueprint(industry, sub_industry, purpose, description)
    data = store.view_overview(bp["id"])
    c = store.blueprint_counts(bp)
    text = (
        f"Created '{bp['title']}' ({bp['subIndustry']}) — {c['caseTypes']} workflows, "
        f"{c['steps']} steps, {c['personas']} personas. Its overview is open in the app."
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
    text = f"Showing the {data['view']} step of '{bp['title']}' in the app."
    return _result(text, data)


async def show_workflows() -> types.CallToolResult:
    """Render the workflows (Pega Case Types) generated for the application."""
    data = store.view_workflows()
    bp = store.get()
    whose = "the blueprint you created" if bp.get("origin") == "created" else "the sample blueprint"
    names = ", ".join(c["name"] for c in data["caseTypes"])
    text = f"{len(data['caseTypes'])} workflows in {whose} '{bp['title']}', shown in the app: {names}."
    return _result(text, data)


async def show_workflow(case: str = "") -> types.CallToolResult:
    """Drill into one workflow and render its Case Lifecycle (stages & steps)."""
    data = store.view_workflow_details(None, case or None)
    if data["view"] == "error":
        return _result(data["message"], data)
    cs = data["case"]
    cc = cs["counts"]
    text = (
        f"'{cs['name']}' lifecycle is open in the app: {cc['stages']} stages, "
        f"{cc['steps']} steps ({cc['automations']} automated)."
    )
    return _result(text, data)


async def show_data() -> types.CallToolResult:
    """Render the Data & Integrations: data objects, integrations, inbound events, identity."""
    data = store.view_data()
    local = data["dataObjects"]["local"]
    text = (
        f"Data & Integrations shown in the app: {len(local)} data objects, "
        f"{len(data['integrations'])} integrations, identity via {data['identity']}."
    )
    return _result(text, data)


async def show_personas() -> types.CallToolResult:
    """Render the worker personas involved in the workflows."""
    data = store.view_personas()
    names = ", ".join(p["name"] for p in data["personas"])
    text = f"{len(data['personas'])} personas shown in the app: {names}."
    return _result(text, data)


async def show_summary() -> types.CallToolResult:
    """Render the summary: application architecture counts, value, and export options."""
    data = store.view_summary()
    a = data["architecture"]
    v = data["value"]
    text = (
        f"Summary of '{data['title']}' is open in the app: {a['caseTypes']} workflows, "
        f"{a['steps']} steps, {a['personas']} personas; ~{v['blueprintDays']} days with "
        f"Blueprint vs ~{v['traditionalMonths']} months hand-built. Export available there."
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
    {"name": "get_app_state", "handler": get_app_state, "ui": False,
     "description": (
         "Return what the user is CURRENTLY doing in the Blueprint app — the active blueprint, whether "
         "the user CREATED it this session or it's the default sample (origin/createdThisSession), "
         "which design step they are viewing, the active workflow, recent activity, and counts. Data "
         "only (no widget). CALL THIS FIRST whenever the user refers to what's on screen or to their "
         "own work ('this', 'here', 'the/this blueprint', 'the workflows I created', 'what I'm looking "
         "at', 'add a …', 'change …') so your answer matches the live app. TRUST its provenance: if "
         "createdThisSession is true, the blueprint IS the user's own creation — never call it "
         "pre-built/default/sample, and never guess the user's role or unrelated intent. Cheap to call.")},
    {"name": "list_blueprints", "handler": list_blueprints, "ui": False,
     "description": (
         "List every blueprint in the app — the ones the USER created this session (origin=created) "
         "plus the default sample — each with its title, industry, sub-industry, purpose, counts, and "
         "whether it's the current one. Data only (no widget). Use whenever the user asks to enumerate "
         "their work: 'list the blueprints I created', 'what blueprints do I have', 'show my blueprints', "
         "'how many blueprints did I make'. Trust the provenance — created blueprints ARE the user's own "
         "work, not samples.")},
]

PROMPT_SPECS: list[dict[str, Any]] = [
    {"name": "open_blueprint", "handler": overview_prompt,
     "description": "Open the Pega Blueprint application-design overview."},
]
