"""MCP tool + prompt handlers for the Pega Blueprint MCP App.

Every UI tool returns a :class:`mcp.types.CallToolResult` carrying:

* ``content``           – a short text summary Copilot can read aloud / ground on.
* ``structuredContent`` – the payload the widget renders. Each payload includes a
  ``view`` discriminator so the single widget routes to the right phase view.

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

async def show_blueprint(phase: str = "") -> types.CallToolResult:
    """Open the blueprint and render the requested phase (default: overview)."""
    p = (phase or "").strip().lower()
    if p == "context":
        data = store.view_context()
    elif p == "setup":
        data = store.view_setup()
    elif p == "personas":
        data = store.view_personas()
    elif p == "brand":
        data = store.view_brand()
    elif p == "experiences":
        data = store.view_experiences()
    elif p == "summary":
        data = store.view_summary()
    else:
        data = store.view_overview()
    bp = store.get()
    c = store.summary_counts(bp)
    text = (
        f"{bp['title']} ({bp['industry']} · {bp['id']}). "
        f"{len(bp['personas'])} personas, {c['actions']} actions, {c['treatments']} messages. "
        f"Showing the {data['view']} view."
    )
    return _result(text, data)


async def show_personas() -> types.CallToolResult:
    """Render the customer personas grid."""
    data = store.view_personas()
    names = ", ".join(p["name"] for p in data["personas"])
    text = f"{len(data['personas'])} customer personas: {names}."
    return _result(text, data)


async def show_brand() -> types.CallToolResult:
    """Render the brand voice characteristics, visual identity and a live message preview."""
    data = store.view_brand()
    enabled = ", ".join(v["name"] for v in data["voice"] if v["enabled"]) or "none"
    text = f"Brand voice characteristics in effect: {enabled}. A sample treatment preview is shown."
    return _result(text, data)


async def show_experiences() -> types.CallToolResult:
    """Render the generated Actions (offers) grouped by product, each with channel messages."""
    data = store.view_experiences()
    bp = store.get()
    c = store.summary_counts(bp)
    products = ", ".join(g["product"] for g in data["groups"])
    text = (
        f"{c['actions']} actions and {c['treatments']} messages across {c['channels']} channel(s), "
        f"grouped by product: {products}."
    )
    return _result(text, data)


async def show_action(action: str) -> types.CallToolResult:
    """Drill into one Action and render its channel treatments (message mockups)."""
    data = store.view_action(None, action)
    if data["view"] == "error":
        return _result(data["message"], data)
    a = data["action"]
    text = (
        f"{a['name']} ({a['product']} · {a['objective']}) has {len(a['treatments'])} "
        f"treatment(s): {', '.join(t['name'] for t in a['treatments'])}."
    )
    return _result(text, data)


async def show_summary() -> types.CallToolResult:
    """Render the summary: counts, who it's for, value calculator and export options."""
    data = store.view_summary()
    bp = store.get()
    c = store.summary_counts(bp)
    v = data["value"]
    text = (
        f"Summary of {bp['title']}: {c['actions']} actions, {c['treatments']} messages. "
        f"Illustrative value ~${v['annualValue']:,} per year for {v['numCustomers']:,} customers. "
        f"You can download the blueprint as PDF, Excel, or an importable Blueprint file."
    )
    return _result(text, data)


async def get_blueprint_summary() -> types.CallToolResult:
    """Return headline blueprint metrics as data only (no widget) for quick text answers."""
    data = store.summary_data()
    text = (
        f"{data['title']} — {data['organization']} ({data['industry']}). "
        f"Objective: {data['objective']}. {data['personaCount']} personas, "
        f"{data['actionCount']} actions, {data['treatmentCount']} messages. "
        f"Outcomes: {', '.join(data['outcomes']) or '—'}; channels: {', '.join(data['channels']) or '—'}."
    )
    return _result(text, data, ui=False)


# ── Prompt handlers (conversation starters surfaced by some hosts) ───────────

async def overview_prompt() -> list[types.PromptMessage]:
    return [types.PromptMessage(
        role="user",
        content=types.TextContent(type="text", text="Open my customer engagement blueprint."),
    )]


# ── Registries consumed by server.py ─────────────────────────────────────────

TOOL_SPECS: list[dict[str, Any]] = [
    {"name": "show_blueprint", "handler": show_blueprint, "ui": True,
     "description": (
         "Open the Customer Engagement Blueprint and render it inline. Optional 'phase' selects which "
         "step to show: 'context' (business & objective), 'setup' (industry, outcomes, channels), "
         "'personas', 'brand' (voice & visual identity), 'experiences' (actions & messages), or "
         "'summary'. Omit phase for the overview. Use for 'open my blueprint', 'show the blueprint', "
         "'go to <phase>'.")},
    {"name": "show_personas", "handler": show_personas, "ui": True,
     "description": (
         "Render the AI-generated customer personas grid (name, age band, description). Use for "
         "'show the personas', 'who are our audiences', 'review customers'.")},
    {"name": "show_brand", "handler": show_brand, "ui": True,
     "description": (
         "Render the brand voice characteristics, visual identity (logo, brand colors) and a live "
         "sample message preview. Use for 'show brand voice', 'what's our tone', 'brand settings'.")},
    {"name": "show_experiences", "handler": show_experiences, "ui": True,
     "description": (
         "Render the generated Actions (offers) grouped by product, each with a count of channel "
         "messages (treatments). Use for 'show the experiences', 'what offers did we create', "
         "'show the actions/messages'.")},
    {"name": "show_action", "handler": show_action, "ui": True,
     "description": (
         "Drill into a single Action and render its channel treatments as message mockups (image, "
         "headline, body, CTA). Provide 'action' as a name (e.g. 'Surface Pro Accessory Bundle') or id. "
         "Use for 'show the Surface Pro treatments', 'open the <action> offer'.")},
    {"name": "show_summary", "handler": show_summary, "ui": True,
     "description": (
         "Render the blueprint summary: action/message counts, who it's for, the Customer Decision "
         "Hub value calculator, and download options (PDF, Excel, importable Blueprint file). Use for "
         "'summarize the blueprint', 'show the summary', 'what's the value', 'download/export the blueprint'.")},
    {"name": "get_blueprint_summary", "handler": get_blueprint_summary, "ui": False,
     "description": (
         "Return headline blueprint metrics as data only (no widget) for quick factual answers such as "
         "'how many personas are there?' or 'what's the objective?'.")},
]

PROMPT_SPECS: list[dict[str, Any]] = [
    {"name": "open_blueprint", "handler": overview_prompt,
     "description": "Open the customer engagement blueprint overview."},
]
