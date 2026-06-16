"""In-memory blueprint store + view payload builders (the "MCP tool surface").

Every public ``view_*`` function returns a ``structuredContent`` dict with a
``view`` discriminator the widget routes on (overview | context | setup |
personas | brand | experiences | action | summary | error).
"""

from __future__ import annotations

from typing import Any

from . import data
from .settings import get_settings

_store: dict[str, dict[str, Any]] = {}


def _public_base() -> str:
    """Public base URL for download links (no trailing slash). Falls back to localhost."""
    s = get_settings()
    if s.public_url:
        return s.public_url.rstrip("/")
    return f"http://localhost:{s.port}"


def _ensure_seed() -> None:
    if not _store:
        bp = data.make_seed_blueprint()
        _store[bp["id"]] = bp


def _first() -> dict[str, Any]:
    _ensure_seed()
    return next(iter(_store.values()))


def get(blueprint_id: str | None = None) -> dict[str, Any]:
    _ensure_seed()
    if blueprint_id and blueprint_id in _store:
        return _store[blueprint_id]
    return _first()


def summary_counts(bp: dict[str, Any]) -> dict[str, int]:
    treatments = sum(len(a["treatments"]) for a in bp["actions"])
    channels = len({t["channel"] for a in bp["actions"] for t in a["treatments"]})
    return {"actions": len(bp["actions"]), "treatments": treatments, "channels": channels}


def latest_phase(bp: dict[str, Any]) -> str:
    if bp["actions"]:
        return "experiences"
    if bp["personas"]:
        return "personas"
    return "context"


# ── Mutations ───────────────────────────────────────────────────────────────

def generate_personas(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    if not bp["personas"]:
        bp["personas"] = data.seed_personas()
    return bp


def generate_experiences(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    if not bp["actions"]:
        bp["actions"] = data.seed_actions()
    return bp


def set_focus(bp: dict[str, Any], outcomes: list[str] | None = None,
              channels: list[str] | None = None) -> dict[str, Any]:
    if outcomes:
        bp["outcomes"] = outcomes
    if channels:
        bp["channels"] = channels
    return bp


def set_voice_enabled(bp: dict[str, Any], toggles: dict[str, bool]) -> dict[str, Any]:
    for v in bp["voice"]:
        if v["id"] in toggles:
            v["enabled"] = toggles[v["id"]]
    return bp


def get_action(bp: dict[str, Any], action_id: str) -> dict[str, Any] | None:
    aid = (action_id or "").lower()
    for a in bp["actions"]:
        if a["id"] == action_id or aid in a["name"].lower() or aid in a["id"]:
            return a
    return None


def calculate_value(num_customers: int) -> dict[str, Any]:
    uplift_per_customer = 18
    adoption = 0.12
    annual_value = round(num_customers * adoption * uplift_per_customer)
    return {
        "numCustomers": num_customers,
        "annualValue": annual_value,
        "assumptions": [
            f"{round(adoption * 100)}% of customers adopt at least one recommended action",
            f"${uplift_per_customer} average annual ARPU uplift per adopting customer",
            "Illustrative estimate for the POC — not a Pega-validated figure",
        ],
    }


# ── Shared header carried in every view so the widget can render the stepper ──

def _header(bp: dict[str, Any], phase: str) -> dict[str, Any]:
    return {
        "blueprintId": bp["id"],
        "title": bp["title"],
        "industry": bp["industry"],
        "phase": phase,
        "phases": data.PHASES,
        "brand": {
            "headerColor": bp["headerColor"],
            "backgroundColor": bp["backgroundColor"],
            "footerColor": bp["footerColor"],
        },
        "counts": summary_counts(bp),
    }


# ── View payload builders ────────────────────────────────────────────────────

def view_overview(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    return {
        "view": "overview",
        **_header(bp, "context"),
        "context": _context_block(bp),
        "setup": _setup_block(bp),
        "personaCount": len(bp["personas"]),
        "resumePhase": latest_phase(bp),
    }


def _context_block(bp: dict[str, Any]) -> dict[str, Any]:
    return {
        "orgName": bp["orgName"], "website": bp["website"], "objective": bp["objective"],
        "objectiveDetails": bp["objectiveDetails"], "language": bp["language"],
        "location": bp["location"],
    }


def _setup_block(bp: dict[str, Any]) -> dict[str, Any]:
    return {
        "industry": bp["industry"], "products": bp["products"], "outcomes": bp["outcomes"],
        "channels": bp["channels"], "features": bp["features"],
        "allOutcomes": data.OUTCOMES, "allChannels": data.CHANNELS, "allFeatures": data.FEATURES,
    }


def view_context(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    return {"view": "context", **_header(bp, "context"), "context": _context_block(bp)}


def view_setup(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    return {"view": "setup", **_header(bp, "setup"), "setup": _setup_block(bp)}


def view_personas(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = generate_personas(blueprint_id)
    return {"view": "personas", **_header(bp, "personas"), "personas": bp["personas"]}


def view_brand(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    persona = bp["personas"][0] if bp["personas"] else None
    enabled = [v["name"] for v in bp["voice"] if v["enabled"]]
    preview = {
        "imageUrl": data.img("preview", 600, 280),
        "headline": "A smarter mobile plan, recommended by experts",
        "greeting": f"Hi {persona['name'].split()[-1] if persona else 'there'},",
        "body": (
            "When work, streaming, and everyday sharing happen across all your devices, the right "
            f"plan matters. {bp['orgName']} recommends plans built for real daily use, with "
            "dependable coverage and clear value."
        ),
        "cta": "See Plans",
        "voiceApplied": enabled,
    }
    return {
        "view": "brand", **_header(bp, "brand"),
        "voice": bp["voice"],
        "visual": {"logoUrl": bp["logoUrl"], "headerColor": bp["headerColor"],
                   "backgroundColor": bp["backgroundColor"], "footerColor": bp["footerColor"]},
        "preview": preview,
    }


def view_experiences(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = generate_experiences(blueprint_id)
    # Group actions by product (mirrors Pega's Product > Objective columns).
    groups: dict[str, list[dict[str, Any]]] = {}
    for a in bp["actions"]:
        groups.setdefault(a["product"], []).append({
            "id": a["id"], "name": a["name"], "objective": a["objective"],
            "description": a["description"], "treatmentCount": len(a["treatments"]),
            "imageUrl": a["treatments"][0]["imageUrl"] if a["treatments"] else None,
        })
    grouped = [{"product": p, "actions": items} for p, items in groups.items()]
    return {"view": "experiences", **_header(bp, "experiences"), "groups": grouped}


def view_action(blueprint_id: str | None, action_id: str) -> dict[str, Any]:
    bp = generate_experiences(blueprint_id)
    a = get_action(bp, action_id)
    if not a:
        return {"view": "error", **_header(bp, "experiences"),
                "message": f"No action found matching '{action_id}'."}
    return {"view": "action", **_header(bp, "experiences"), "action": a}


def view_summary(blueprint_id: str | None = None) -> dict[str, Any]:
    bp = get(blueprint_id)
    base = _public_base()
    exports = {
        "pdf": f"{base}/export/{bp['id']}/pdf",
        "excel": f"{base}/export/{bp['id']}/excel",
        "blueprint": f"{base}/export/{bp['id']}/blueprint",
    }
    # Read-only section review with "edit this section" navigation (mirrors Pega's
    # consolidated summary review).
    sections = [
        {"phase": "context", "label": "Context", "summary": f"{bp['orgName']} · {bp['objective']}"},
        {"phase": "setup", "label": "Setup", "summary": f"{bp['industry']} · {', '.join(bp['outcomes']) or '—'} · {', '.join(bp['channels']) or '—'}"},
        {"phase": "personas", "label": "Personas", "summary": f"{len(bp['personas'])} personas"},
        {"phase": "brand", "label": "Brand", "summary": f"{sum(1 for v in bp['voice'] if v['enabled'])} voice traits enabled"},
        {"phase": "experiences", "label": "Experiences", "summary": f"{len(bp['actions'])} actions · {summary_counts(bp)['treatments']} messages"},
    ]
    return {
        "view": "summary", **_header(bp, "summary"),
        "context": _context_block(bp),
        "setup": _setup_block(bp),
        "value": calculate_value(10_000_000),
        "exports": exports,
        "sections": sections,
    }


def summary_data(blueprint_id: str | None = None) -> dict[str, Any]:
    """Data-only headline metrics (no widget) for quick factual answers."""
    bp = get(blueprint_id)
    c = summary_counts(bp)
    return {
        "view": "summary-data",
        "blueprintId": bp["id"], "title": bp["title"], "industry": bp["industry"],
        "organization": bp["orgName"], "objective": bp["objective"],
        "outcomes": bp["outcomes"], "channels": bp["channels"],
        "personaCount": len(bp["personas"]),
        "actionCount": c["actions"], "treatmentCount": c["treatments"],
    }
