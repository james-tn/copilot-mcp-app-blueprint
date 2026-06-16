"""In-memory blueprint store + view payload builders (the "MCP tool surface").

Every public ``view_*`` function returns a ``structuredContent`` dict with a
``view`` discriminator the widget routes on (overview | context | workflows |
workflow-details | data | personas | summary | error).
"""

from __future__ import annotations

from typing import Any

from . import data
from .settings import get_settings

_store: dict[str, dict[str, Any]] = {}
_current_id: str | None = None
# The app's *live* UI state — the "shared body part" the agent stays aware of.
# Every view builder updates this so a separate MCP session (the agent) can ask
# what the user is currently looking at via ``app_state()`` / get_app_state.
_current_phase: str = "overview"
_current_case: str | None = None

_AUTOMATED_TYPES = {"automation", "ai-agent"}

# Friendly labels for each design step (used in agent-facing state summaries).
_PHASE_LABELS = {
    "overview": "Overview",
    "create": "Create a Blueprint (new application wizard)",
    "context": "Application Context",
    "workflows": "Workflows",
    "workflow-details": "Workflow Details (case lifecycle)",
    "data": "Data & Integrations",
    "personas": "Personas",
    "summary": "Summary",
}


def _public_base() -> str:
    """Public base URL for download links (no trailing slash). Falls back to localhost."""
    s = get_settings()
    if s.public_url:
        return s.public_url.rstrip("/")
    return f"http://localhost:{s.port}"


def _set_current(phase: str, case_id: str | None = None) -> None:
    """Record the live UI state so the agent (a different session) stays in sync."""
    global _current_phase, _current_case
    _current_phase = phase
    _current_case = case_id



def _ensure_seed() -> None:
    global _current_id
    if not _store:
        bp = data.make_seed_blueprint()
        _store[bp["id"]] = bp
        _current_id = bp["id"]


def _first() -> dict[str, Any]:
    _ensure_seed()
    if _current_id and _current_id in _store:
        return _store[_current_id]
    return next(iter(_store.values()))


def get(blueprint_id: str | None = None) -> dict[str, Any]:
    _ensure_seed()
    if blueprint_id and blueprint_id in _store:
        return _store[blueprint_id]
    return _first()


def create_blueprint(industry: str, sub_industry: str, purpose: str,
                     description: str = "") -> dict[str, Any]:
    """Generate, store, and make current a new blueprint from a wizard selection."""
    global _current_id
    _ensure_seed()
    bp = data.generate_blueprint(industry, sub_industry, purpose, description)
    _store[bp["id"]] = bp
    _current_id = bp["id"]
    _set_current("overview")
    return bp


def app_state() -> dict[str, Any]:
    """A compact snapshot of what the user is currently doing in the app.

    This is the agent's window into the live UI. Because the widget calls the
    same server (shared in-memory state) as it navigates, the agent can read this
    to ground its replies in what the user is actually looking at — instead of
    guessing or over-explaining.
    """
    bp = get()
    c = blueprint_counts(bp)
    phase = _current_phase
    case_name = None
    if _current_case:
        case = get_case(bp, _current_case)
        case_name = case["name"] if case else None
    where = _PHASE_LABELS.get(phase, phase)
    if case_name:
        where = f"{where} → {case_name}"
    summary = (
        f"The user is viewing the '{where}' step of the blueprint "
        f"'{bp['title']}' ({bp['subIndustry']} · {bp['id']}). "
        f"It has {c['caseTypes']} workflows, {c['stages']} stages, {c['steps']} steps, "
        f"{c['dataObjects']} data objects and {c['personas']} personas."
    )
    return {
        "view": "app-state",
        "blueprintId": bp["id"],
        "title": bp["title"],
        "industry": bp["industry"],
        "subIndustry": bp["subIndustry"],
        "purpose": bp["purpose"],
        "phase": phase,
        "phaseLabel": _PHASE_LABELS.get(phase, phase),
        "activeCase": case_name,
        "counts": c,
        "summary": summary,
    }



# ── Lifecycle helpers ────────────────────────────────────────────────────────

def stage_steps(stage: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten a stage's steps (direct steps + steps nested under processes)."""
    out = list(stage.get("steps") or [])
    for proc in stage.get("processes") or []:
        out.extend(proc.get("steps") or [])
    return out


def case_step_count(case: dict[str, Any]) -> int:
    return sum(len(stage_steps(st)) for st in case["stages"])


def case_counts(case: dict[str, Any]) -> dict[str, int]:
    stages = case["stages"]
    steps = [s for st in stages for s in stage_steps(st)]
    return {
        "stages": len(stages),
        "primaryStages": sum(1 for st in stages if st["kind"] == "primary"),
        "alternateStages": sum(1 for st in stages if st["kind"] == "alternate"),
        "steps": len(steps),
        "automations": sum(1 for s in steps if s["type"] in _AUTOMATED_TYPES),
    }


def blueprint_counts(bp: dict[str, Any]) -> dict[str, int]:
    cases = bp["caseTypes"]
    steps = sum(case_step_count(c) for c in cases)
    stages = sum(len(c["stages"]) for c in cases)
    automations = sum(
        1 for c in cases for st in c["stages"] for s in stage_steps(st)
        if s["type"] in _AUTOMATED_TYPES
    )
    return {
        "caseTypes": len(cases),
        "stages": stages,
        "steps": steps,
        "automations": automations,
        "dataObjects": len(bp["dataObjects"]),
        "personas": len(bp["personas"]),
        "integrations": len(bp["integrations"]),
    }


def get_case(bp: dict[str, Any], case_id: str | None) -> dict[str, Any] | None:
    if not case_id:
        # Default to the primary case type (or the first one).
        for c in bp["caseTypes"]:
            if c.get("primary"):
                return c
        return bp["caseTypes"][0] if bp["caseTypes"] else None
    cid = case_id.lower()
    for c in bp["caseTypes"]:
        if c["id"] == case_id or cid in c["name"].lower() or cid in c["id"]:
            return c
    return None


def latest_phase(bp: dict[str, Any]) -> str:
    if bp["caseTypes"] and any(c["stages"] for c in bp["caseTypes"]):
        return "workflow-details"
    if bp["caseTypes"]:
        return "workflows"
    return "context"


def calculate_acceleration(bp: dict[str, Any], scope: str = "Department") -> dict[str, Any]:
    """Illustrative delivery-acceleration model for the Summary value tile.

    Traditional hand-build time scales with the number of lifecycle steps; Pega
    Blueprint compresses design-to-app dramatically. Numbers are illustrative.
    """
    mult = {"Pilot": 0.6, "Department": 1.0, "Enterprise": 1.8}.get(scope, 1.0)
    c = blueprint_counts(bp)
    steps = c["steps"]
    traditional_weeks = max(1, round(steps * 0.6 * mult))
    traditional_months = round(traditional_weeks / 4.0, 1)
    blueprint_days = max(3, round(steps * 0.4 * mult))
    faster_x = max(2, round((traditional_weeks * 5) / blueprint_days))
    return {
        "scope": scope,
        "scopes": ["Pilot", "Department", "Enterprise"],
        "traditionalWeeks": traditional_weeks,
        "traditionalMonths": traditional_months,
        "blueprintDays": blueprint_days,
        "fasterX": faster_x,
        "assumptions": [
            f"{steps} steps across {c['caseTypes']} workflows ({c['automations']} automated)",
            "Traditional hand-build estimated at ~0.6 week per lifecycle step",
            "Illustrative estimate for the POC — not a Pega-validated figure",
        ],
    }


# ── Mutations ────────────────────────────────────────────────────────────────

def generate_case_types(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    if not bp["caseTypes"]:
        bp["caseTypes"] = data.seed_case_types()
    return bp


def generate_personas(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    if not bp["personas"]:
        bp["personas"] = data.seed_personas()
    return bp


# ── Shared header carried in every view so the widget renders the stepper ─────

def _header(bp: dict[str, Any], phase: str) -> dict[str, Any]:
    return {
        "blueprintId": bp["id"],
        "title": bp["title"],
        "industry": bp["industry"],
        "subIndustry": bp["subIndustry"],
        "phase": phase,
        "phases": data.PHASES,
        "counts": blueprint_counts(bp),
    }


def _context_block(bp: dict[str, Any]) -> dict[str, Any]:
    return {
        "orgName": bp["orgName"], "description": bp["description"],
        "industry": bp["industry"], "subIndustry": bp["subIndustry"],
        "purpose": bp["purpose"], "language": bp["language"], "location": bp["location"],
    }


def _case_summary(c: dict[str, Any]) -> dict[str, Any]:
    cc = case_counts(c)
    return {
        "id": c["id"], "name": c["name"], "primary": c.get("primary", False),
        "description": c["description"],
        "stageCount": cc["stages"], "stepCount": cc["steps"], "automations": cc["automations"],
    }


# ── View payload builders ────────────────────────────────────────────────────

def view_create() -> dict[str, Any]:
    """The create-a-blueprint wizard payload (industry/sub-industry/purpose catalog)."""
    _set_current("create")
    return {"view": "create", "catalog": data.catalog()}


def view_overview(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    _set_current("overview")
    return {
        "view": "overview",
        **_header(bp, "context"),
        "context": _context_block(bp),
        "caseTypes": [_case_summary(c) for c in bp["caseTypes"]],
        "resumePhase": latest_phase(bp),
    }


def view_context(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    _set_current("context")
    return {"view": "context", **_header(bp, "context"), "context": _context_block(bp)}


def view_workflows(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = generate_case_types(blueprint_id)
    _set_current("workflows")
    return {
        "view": "workflows", **_header(bp, "workflows"),
        "caseTypes": [_case_summary(c) for c in bp["caseTypes"]],
    }


def view_workflow_details(blueprint_id: str | None, case_id: str | None = None) -> dict[str, Any]:
    bp = generate_case_types(blueprint_id)
    case = get_case(bp, case_id)
    if not case:
        _set_current("workflow-details")
        return {"view": "error", **_header(bp, "workflow-details"),
                "message": f"No workflow found matching '{case_id}'."}
    _set_current("workflow-details", case["id"])
    return {
        "view": "workflow-details", **_header(bp, "workflow-details"),
        "caseList": [{"id": c["id"], "name": c["name"], "primary": c.get("primary", False)}
                     for c in bp["caseTypes"]],
        "activeCaseId": case["id"],
        "case": {
            "id": case["id"], "name": case["name"], "description": case["description"],
            "primary": case.get("primary", False),
            "stages": case["stages"],
            "counts": case_counts(case),
        },
    }


def view_data(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    _set_current("data")
    objs = bp["dataObjects"]
    return {
        "view": "data", **_header(bp, "data"),
        "identity": bp["identity"],
        "inboundEvents": bp["inboundEvents"],
        "dataObjects": {
            "local": [o for o in objs if o["sor"] == "local"],
            "external": [o for o in objs if o["sor"] == "external"],
        },
        "integrations": bp["integrations"],
    }


def view_personas(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = generate_personas(blueprint_id)
    _set_current("personas")
    return {"view": "personas", **_header(bp, "personas"), "personas": bp["personas"]}


def view_summary(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    _set_current("summary")
    base = _public_base()
    exports = {
        "pdf": f"{base}/export/{bp['id']}/pdf",
        "excel": f"{base}/export/{bp['id']}/excel",
        "blueprint": f"{base}/export/{bp['id']}/blueprint",
    }
    c = blueprint_counts(bp)
    sections = [
        {"phase": "context", "label": "Application Context",
         "summary": f"{bp['orgName']} · {bp['subIndustry']} · {bp['purpose']}"},
        {"phase": "workflows", "label": "Workflows",
         "summary": f"{c['caseTypes']} case types · {c['stages']} stages"},
        {"phase": "workflow-details", "label": "Workflow Details",
         "summary": f"{c['steps']} steps · {c['automations']} automated"},
        {"phase": "data", "label": "Data & Integrations",
         "summary": f"{c['dataObjects']} data objects · {c['integrations']} integrations"},
        {"phase": "personas", "label": "Personas",
         "summary": f"{c['personas']} personas"},
    ]
    return {
        "view": "summary", **_header(bp, "summary"),
        "context": _context_block(bp),
        "architecture": c,
        "cloudCapabilities": data.CLOUD_CAPABILITIES,
        "value": calculate_acceleration(bp),
        "exports": exports,
        "sections": sections,
    }


def summary_data(blueprint_id: str | None = None) -> dict[str, Any]:
    """Data-only headline metrics (no widget) for quick factual answers."""
    bp = get(blueprint_id)
    c = blueprint_counts(bp)
    return {
        "view": "summary-data",
        "blueprintId": bp["id"], "title": bp["title"],
        "industry": bp["industry"], "subIndustry": bp["subIndustry"],
        "organization": bp["orgName"], "purpose": bp["purpose"],
        "caseTypes": [c2["name"] for c2 in bp["caseTypes"]],
        "personaCount": c["personas"], "caseTypeCount": c["caseTypes"],
        "stageCount": c["stages"], "stepCount": c["steps"],
        "dataObjectCount": c["dataObjects"],
    }
