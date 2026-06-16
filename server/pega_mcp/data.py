"""In-memory demo dataset for **Pega Blueprint** (workflow / application design).

Models the artifact Pega Blueprint generates from a prompt: an application made of
**Case Types** (workflows), each with a **Case Lifecycle** of primary and alternate
**Stages** that group **Steps** (optionally under **Processes**), plus **Data
Objects**, **Personas**, **Integrations** and inbound events.

The seeded blueprint mirrors one generated live in Pega Blueprint
(BP-2027437 "Employee Onboarding", Cross Industry · Human Resources). Swap this
module for real Pega Blueprint MCP calls to go live.
"""

from __future__ import annotations

import itertools
from typing import Any
from urllib.parse import quote

# ── The six design steps (replaces the old CE "phases") ──────────────────────
PHASES = ["context", "workflows", "workflow-details", "data", "personas", "summary"]

# ── Step types (the building blocks of a Pega Case Lifecycle step) ────────────
# id -> human label. Colors live in the widget (theme.ts) keyed by the same id.
STEP_TYPES: dict[str, str] = {
    "collect": "Collect information",
    "automation": "Automation",
    "decision": "Decision",
    "notification": "Send notification",
    "document": "Generate document",
    "ai-agent": "AI Agent",
    "approve": "Approve/Reject",
}

# Inbound event channels offered by Pega Blueprint (Data & Integrations step).
INBOUND_EVENTS = [
    "Pega DX API", "Pega Desktop", "File received", "Email received",
    "MCP Service", "Inbound API", "A2A (Agent request)", "Kafka message",
]

# Pega Cloud capability chips shown on the Summary (illustrative).
CLOUD_CAPABILITIES = [
    "Security", "Connectivity", "Laws & Regs", "Compliance", "Gov Cloud",
    "AI & Analytics", "Observability", "Disaster Recovery", "Channel", "DevOps",
]

_counter = itertools.count(1000)


def _id(prefix: str) -> str:
    return f"{prefix}-{next(_counter)}"


def img(seed: str, w: int = 160, h: int = 160) -> str:
    """Deterministic placeholder avatar so the widget renders without auth-gated assets."""
    return f"https://i.pravatar.cc/{w}?u={quote(seed)}"


def _step(name: str, type_: str) -> dict[str, Any]:
    return {"id": _id("step"), "name": name, "type": type_}


def _stage(name: str, kind: str, *, steps: list[dict] | None = None,
           processes: list[dict] | None = None) -> dict[str, Any]:
    """A lifecycle stage. ``kind`` is 'primary' or 'alternate'. A stage holds either
    a flat list of steps or one or more named processes that each hold steps."""
    return {
        "id": _id("stage"), "name": name, "kind": kind,
        "steps": steps or [],
        "processes": processes or [],
    }


def _process(name: str, steps: list[dict]) -> dict[str, Any]:
    return {"id": _id("proc"), "name": name, "steps": steps}


# ── Case Type 1: Employee Onboarding (captured verbatim from Pega Blueprint) ──

def _case_employee_onboarding() -> dict[str, Any]:
    return {
        "id": "employee-onboarding",
        "name": "Employee Onboarding",
        "primary": True,
        "description": (
            "Manage the complete onboarding process for new hires by coordinating across HR, IT, "
            "managers, and support teams, ensuring all required activities (orientation, system "
            "access, desk assignment, training, approvals) are completed before Day One for a "
            "successful start."
        ),
        "stages": [
            _stage("Preboarding", "primary", steps=[
                _step("Receive Offer Acceptance", "collect"),
                _step("Validate Personal Data", "automation"),
                _step("Verify Work Eligibility", "decision"),
                _step("Initiate Background Check", "automation"),
                _step("Acknowledge Preboarding", "notification"),
            ]),
            _stage("Day One Prep", "primary", processes=[
                _process("Systems Setup", [
                    _step("Provision IT Accounts", "automation"),
                    _step("Assign Devices", "automation"),
                    _step("Prepare Desk Assignment", "collect"),
                    _step("Configure System Access", "automation"),
                    _step("Send Setup Confirmations", "notification"),
                ]),
                _process("Logistics", [
                    _step("Order Access Badge", "automation"),
                    _step("Schedule Orientation", "collect"),
                ]),
            ]),
            _stage("Welcome & Orientation", "primary", steps=[
                _step("Conduct Welcome Session", "collect"),
                _step("Manager Introduction", "collect"),
                _step("Complete Compliance Training", "automation"),
                _step("Provide Policy Documents", "notification"),
                _step("Generate Onboarding Checklist", "document"),
            ]),
            _stage("Progress Tracking", "primary", steps=[
                _step("Track Activity Completion", "automation"),
                _step("Escalate Pending Tasks", "automation"),
                _step("Collect Manager Feedback", "collect"),
                _step("Send Completion Survey", "notification"),
                _step("Archive Onboarding Docs", "automation"),
            ]),
            _stage("Rework", "alternate", steps=[
                _step("Identify Missing Data", "automation"),
                _step("Request Data Update", "collect"),
                _step("Escalate Delayed Tasks", "automation"),
                _step("Notify Rework Needed", "notification"),
            ]),
            _stage("Exception Approval", "alternate", steps=[
                _step("Flag Exception Incident", "decision"),
                _step("Summarize Exception AI", "ai-agent"),
                _step("Manager Decision", "approve"),
                _step("Notify Outcome", "notification"),
            ]),
        ],
    }


# ── Case Type 2: Laptop Provisioning ─────────────────────────────────────────

def _case_laptop_provisioning() -> dict[str, Any]:
    return {
        "id": "laptop-provisioning",
        "name": "Laptop Provisioning",
        "primary": False,
        "description": (
            "Facilitate the end-to-end process of assigning, configuring, and delivering laptops to "
            "new employees, tracking asset allocation, setup, and completion to ensure device readiness."
        ),
        "stages": [
            _stage("Request", "primary", steps=[
                _step("Capture Device Requirements", "collect"),
                _step("Validate Eligibility", "decision"),
                _step("Approve Allocation", "approve"),
            ]),
            _stage("Procurement", "primary", steps=[
                _step("Reserve Inventory", "automation"),
                _step("Order Laptop", "automation"),
                _step("Track Shipment", "automation"),
            ]),
            _stage("Configuration", "primary", steps=[
                _step("Image Device", "automation"),
                _step("Install Software", "automation"),
                _step("Apply Security Policies", "automation"),
                _step("Quality Check", "collect"),
            ]),
            _stage("Handover", "primary", steps=[
                _step("Schedule Delivery", "collect"),
                _step("Confirm Receipt", "notification"),
                _step("Activate Asset Record", "automation"),
            ]),
            _stage("Out of Stock", "alternate", steps=[
                _step("Notify Delay", "notification"),
                _step("Offer Loaner Device", "collect"),
                _step("Reorder Stock", "automation"),
            ]),
        ],
    }


# ── Case Type 3: Mobile Device Provisioning ──────────────────────────────────

def _case_mobile_provisioning() -> dict[str, Any]:
    return {
        "id": "mobile-device-provisioning",
        "name": "Mobile Device Provisioning",
        "primary": False,
        "description": (
            "Oversee the procurement, configuration, and assignment of mobile devices, ensuring new "
            "hires receive required equipment, setup, and support as part of the onboarding process."
        ),
        "stages": [
            _stage("Request", "primary", steps=[
                _step("Select Device & Plan", "collect"),
                _step("Verify Policy Eligibility", "decision"),
                _step("Approve Request", "approve"),
            ]),
            _stage("Provisioning", "primary", steps=[
                _step("Reserve Device", "automation"),
                _step("Configure MDM Enrollment", "automation"),
                _step("Assign Phone Number", "automation"),
            ]),
            _stage("Activation", "primary", steps=[
                _step("Install Work Apps", "automation"),
                _step("Verify Connectivity", "collect"),
                _step("Send Activation Guide", "notification"),
            ]),
            _stage("Exception", "alternate", steps=[
                _step("Flag Compliance Issue", "decision"),
                _step("Manager Review", "approve"),
                _step("Notify Outcome", "notification"),
            ]),
        ],
    }


def _seed_case_types() -> list[dict[str, Any]]:
    return [
        _case_employee_onboarding(),
        _case_laptop_provisioning(),
        _case_mobile_provisioning(),
    ]


# ── Personas (worker personas, not customers) ────────────────────────────────

def _seed_personas() -> list[dict[str, Any]]:
    return [
        {"id": "new-hire", "name": "New Hire", "imageUrl": img("new-hire"),
         "description": (
             "A newly hired employee undergoing onboarding who interacts with the application to "
             "complete required tasks, review orientation materials, provide necessary information, "
             "and track their onboarding progress. Their active participation is critical to ensure "
             "readiness for their first day.")},
        {"id": "hr-specialist", "name": "HR Specialist", "imageUrl": img("hr-specialist"),
         "description": (
             "A human resources professional responsible for initiating onboarding, managing "
             "documentation, coordinating orientation, monitoring progress, and resolving issues. "
             "This persona ensures compliance and assists new hires throughout the onboarding cycle.")},
        {"id": "hiring-manager", "name": "Hiring Manager", "imageUrl": img("hiring-manager"),
         "description": (
             "The direct supervisor overseeing the onboarding of the new employee, approving desk "
             "assignments, scheduling orientation, and ensuring departmental requirements are met. "
             "They collaborate closely with HR and other support teams.")},
        {"id": "it-support", "name": "IT Support", "imageUrl": img("it-support"),
         "description": (
             "An IT staff member who manages system and software access, provisions laptops and "
             "mobile devices, and resolves technical issues during onboarding. They coordinate device "
             "setup to ensure new employees have required tools from Day One.")},
        {"id": "facilities-coordinator", "name": "Facilities Coordinator", "imageUrl": img("facilities-coordinator"),
         "description": (
             "A team member responsible for workspace allocation, desk setup, and facility orientation "
             "for new hires. They ensure all physical resources and workspace arrangements are in place "
             "ahead of the employee's start date.")},
        {"id": "training-coordinator", "name": "Training Coordinator", "imageUrl": img("training-coordinator"),
         "description": (
             "The individual who organizes and schedules onboarding training sessions, monitors "
             "completion of mandatory learning, and supports new hires with guidance. They coordinate "
             "training logistics and track new employee compliance.")},
    ]


# ── Data objects + integrations (Data & Integrations step) ───────────────────

def _seed_data_objects() -> list[dict[str, Any]]:
    return [
        {"id": "employee", "name": "Employee", "sor": "local", "systemOfRecord": "Pega (Local)"},
        {"id": "onboarding-checklist", "name": "Onboarding Checklist", "sor": "local", "systemOfRecord": "Pega (Local)"},
        {"id": "system-access-request", "name": "System Access Request", "sor": "local", "systemOfRecord": "Pega (Local)"},
        {"id": "device-assignment", "name": "Device Assignment", "sor": "local", "systemOfRecord": "Pega (Local)"},
        {"id": "workspace-assignment", "name": "Workspace Assignment", "sor": "local", "systemOfRecord": "Pega (Local)"},
        {"id": "training-enrollment", "name": "Training Enrollment", "sor": "local", "systemOfRecord": "Pega (Local)"},
    ]


def _seed_integrations() -> list[dict[str, Any]]:
    # Illustrative external systems an onboarding app typically connects to.
    return [
        {"id": "workday", "name": "Workday HRIS", "purpose": "Source of record for employee profiles"},
        {"id": "entra-id", "name": "Microsoft Entra ID", "purpose": "Identity, accounts and access provisioning"},
        {"id": "servicenow", "name": "ServiceNow ITSM", "purpose": "IT fulfilment for devices and access"},
        {"id": "background-check", "name": "Background Check Provider", "purpose": "Pre-hire screening results"},
    ]


def _seed_inbound_events() -> list[dict[str, Any]]:
    enabled = {"Pega DX API", "Pega Desktop"}
    return [{"name": n, "enabled": n in enabled} for n in INBOUND_EVENTS]


def make_seed_blueprint() -> dict[str, Any]:
    return {
        "id": "BP-2027437",
        "title": "Employee Onboarding",
        "industry": "Cross Industry",
        "subIndustry": "Human Resources",
        "purpose": "Employee Onboarding",
        "description": (
            "Manage employee onboarding, coordinating HR, IT, managers, and support teams to ensure "
            "every new hire is ready for Day One. Primary Employee Onboarding workflow manages "
            "workflows for system access, orientation, training, desk assignment, and device "
            "provisioning including separate workflows for laptop and mobile device provisioning. The "
            "app tracks progress, approvals, and completion across all onboarding activities."
        ),
        "orgName": "Microsoft",
        "location": "United States",
        "language": "English",
        # Workflows (case types) + supporting model
        "caseTypes": _seed_case_types(),
        "personas": _seed_personas(),
        "dataObjects": _seed_data_objects(),
        "integrations": _seed_integrations(),
        "inboundEvents": _seed_inbound_events(),
        "identity": "OpenID Connect (OIDC)",
    }


# Re-exported so the store can lazily (re)seed generated sections.
seed_case_types = _seed_case_types
seed_personas = _seed_personas
seed_data_objects = _seed_data_objects
new_id = _id
