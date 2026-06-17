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
    "wait": "Wait",
    "resolve": "Resolve",
}

# Synonyms the agent may emit (labels, verbs) → canonical step-type id. Anything
# unrecognized falls back to "collect" so authored input never breaks the widget.
_STEP_TYPE_ALIASES: dict[str, str] = {
    "collect information": "collect", "collect": "collect", "capture": "collect",
    "intake": "collect", "form": "collect", "gather": "collect", "input": "collect",
    "automation": "automation", "automate": "automation", "integration": "automation",
    "service": "automation", "api": "automation", "robotic": "automation", "task": "automation",
    "decision": "decision", "decide": "decision", "gateway": "decision",
    "evaluate": "decision", "check": "decision", "branch": "decision", "condition": "decision",
    "send notification": "notification", "notification": "notification", "notify": "notification",
    "email": "notification", "alert": "notification", "message": "notification",
    "generate document": "document", "document": "document", "generate": "document", "report": "document",
    "ai agent": "ai-agent", "ai-agent": "ai-agent", "aiagent": "ai-agent",
    "agent": "ai-agent", "ai": "ai-agent", "genai": "ai-agent",
    "approve/reject": "approve", "approve": "approve", "approval": "approve",
    "reject": "approve", "review": "approve", "sign-off": "approve", "signoff": "approve",
    "wait": "wait", "delay": "wait", "pause": "wait", "hold": "wait", "timer": "wait",
    "resolve": "resolve", "resolution": "resolve", "close": "resolve",
    "complete": "resolve", "completion": "resolve", "finish": "resolve", "done": "resolve",
}


def normalize_step_type(value: str) -> str:
    """Map a free-form step-type label/verb to a canonical id (fallback: 'collect')."""
    key = (value or "").strip().lower()
    if key in STEP_TYPES:
        return key
    return _STEP_TYPE_ALIASES.get(key, "collect")


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


# ── "Create a Blueprint" catalog (industry → sub-industry → purpose) ──────────
# Mirrors the choices Pega Blueprint offers in its create wizard. The widget uses
# this to drive dependent pickers; ``create_blueprint`` generates from a selection.

INDUSTRIES = [
    "Banking", "Communications", "Consumer Services",
    "Cross Industry (e.g. HR, IT, Finance, etc.)", "Energy & Utilities",
    "Government", "Healthcare", "Insurance", "Manufacturing",
    "Transportation & Logistics", "Just for fun", "Other",
]

SUB_INDUSTRIES: dict[str, list[str]] = {
    "Cross Industry (e.g. HR, IT, Finance, etc.)": [
        "Facilities", "Finance", "Human Resources", "Information Technology", "Procurement", "Other"],
    "Banking": ["Retail Banking", "Asset Management", "Lending", "Payments", "Other"],
    "Insurance": ["Claims", "Underwriting", "Policy Servicing", "Other"],
    "Healthcare": ["Patient Services", "Claims & Billing", "Care Management", "Other"],
    "Government": ["Citizen Services", "Permits & Licensing", "Benefits", "Other"],
    "Communications": ["Customer Service", "Order Management", "Field Service", "Other"],
    "Manufacturing": ["Order Management", "Quality", "Supply Chain", "Other"],
    "Energy & Utilities": ["Customer Service", "Field Service", "Metering", "Other"],
    "Consumer Services": ["Customer Service", "Order Management", "Other"],
    "Transportation & Logistics": ["Shipment Management", "Fleet", "Customer Service", "Other"],
}
DEFAULT_SUB_INDUSTRIES = ["Operations", "Customer Service", "Other"]

PURPOSES: dict[str, list[str]] = {
    "Human Resources": ["Employee Onboarding", "Employee Self-Service", "Performance Management",
                        "Recruiting", "Training and Development"],
    "Information Technology": ["Access Request", "Incident Management", "Service Request", "Change Management"],
    "Finance": ["Invoice Processing", "Expense Approval", "Vendor Onboarding", "Budget Request"],
    "Procurement": ["Purchase Requisition", "Supplier Onboarding", "Contract Approval"],
    "Facilities": ["Workspace Request", "Maintenance Request", "Move Management"],
    "Claims": ["Claims Intake", "Claims Adjudication", "Fraud Investigation"],
    "Underwriting": ["New Business Underwriting", "Risk Assessment", "Policy Issuance"],
    "Lending": ["Loan Origination", "Credit Review", "Loan Servicing"],
    "Retail Banking": ["Account Opening", "Dispute Resolution", "Card Servicing"],
    "Citizen Services": ["Service Request", "Case Management", "Benefits Enrollment"],
    "Permits & Licensing": ["License Application", "Permit Renewal", "Inspection Scheduling"],
    "Patient Services": ["Patient Intake", "Appointment Scheduling", "Care Coordination"],
    "Order Management": ["Order Fulfillment", "Returns Management", "Order Intake"],
    "Customer Service": ["Case Management", "Complaint Handling", "Service Request"],
}
DEFAULT_PURPOSES = ["Case Intake", "Service Request", "Approval Workflow", "Investigation"]


def catalog() -> dict[str, Any]:
    """The full create-wizard catalog the widget renders."""
    return {
        "industries": INDUSTRIES,
        "subIndustries": SUB_INDUSTRIES,
        "defaultSubIndustries": DEFAULT_SUB_INDUSTRIES,
        "purposes": PURPOSES,
        "defaultPurposes": DEFAULT_PURPOSES,
    }


# ── Blueprint generator (the "AI" that designs an app from a prompt) ──────────

_bp_counter = itertools.count(2027438)


def _new_bp_id() -> str:
    return f"BP-{next(_bp_counter)}"


def _slug(s: str) -> str:
    out = "-".join("".join(c for c in w if c.isalnum()) for w in s.lower().split())
    return out.strip("-") or "case"


def _primary_entity(purpose: str) -> str:
    stop = {"management", "processing", "request", "requests", "approval",
            "services", "service", "and", "intake"}
    words = [w for w in purpose.split() if w.lower() not in stop]
    return (words[0] if words else purpose.split()[0]).capitalize()


_PERSONAS_BY_SUB: dict[str, list[tuple[str, str]]] = {
    "Finance": [
        ("Requester", "Submits financial requests and supporting documentation, and tracks them to approval."),
        ("Finance Analyst", "Reviews submissions, validates figures and policy compliance, and processes transactions."),
        ("Approver", "Approves or rejects requests within delegated authority and handles escalations."),
        ("Controller", "Owns financial controls, audit readiness and exception oversight."),
    ],
    "Information Technology": [
        ("Requester", "Raises IT requests and incidents and tracks them to resolution."),
        ("IT Specialist", "Triages, fulfils and resolves requests, provisioning access and assets."),
        ("IT Manager", "Approves higher-risk changes and access, and oversees SLAs."),
        ("Security Reviewer", "Reviews access and changes for security and compliance."),
    ],
    "Procurement": [
        ("Requester", "Raises purchase requests and tracks them through approval and ordering."),
        ("Buyer", "Sources suppliers, negotiates and places orders."),
        ("Category Manager", "Approves spend, manages supplier relationships and contracts."),
        ("Supplier", "Receives orders and provides goods, services and documentation."),
    ],
    "Facilities": [
        ("Requester", "Submits workspace and facility requests and tracks fulfilment."),
        ("Facilities Coordinator", "Plans and executes workspace, desk and facility tasks."),
        ("Facilities Manager", "Approves requests and oversees resourcing and scheduling."),
    ],
    "Claims": [
        ("Claimant", "Submits a claim and supporting evidence and tracks its progress."),
        ("Claims Handler", "Assesses claims, gathers information and determines outcomes."),
        ("Claims Manager", "Approves settlements, handles exceptions and oversees SLAs."),
        ("Fraud Investigator", "Investigates suspicious claims and escalates findings."),
    ],
    "Patient Services": [
        ("Patient", "Provides information and engages with care and scheduling tasks."),
        ("Intake Coordinator", "Captures patient details and routes work to care teams."),
        ("Care Coordinator", "Coordinates appointments, care plans and follow-ups."),
        ("Clinician", "Reviews clinical information and approves care decisions."),
    ],
}
_DEFAULT_PERSONAS: list[tuple[str, str]] = [
    ("Requester", "Initiates and submits requests, provides required information, and tracks progress to completion."),
    ("Case Specialist", "Owns day-to-day case work — gathers information, performs assessments, and moves work through the lifecycle."),
    ("Manager", "Reviews and approves key decisions, handles exceptions, and oversees team workload and SLAs."),
    ("Reviewer", "Performs quality and compliance checks before work is finalized."),
    ("Administrator", "Configures the application, manages reference data, and supports users."),
]


def _gen_personas(sub_industry: str) -> list[dict[str, Any]]:
    rows = _PERSONAS_BY_SUB.get(sub_industry, _DEFAULT_PERSONAS)
    return [{"id": _slug(name), "name": name, "imageUrl": img(_slug(name)), "description": desc}
            for name, desc in rows]


def _gen_data_objects(purpose: str) -> list[dict[str, Any]]:
    entity = _primary_entity(purpose)
    names = [entity, "Case", "Party", "Document", "Task", "Notification"]
    seen: list[str] = []
    for n in names:
        if n not in seen:
            seen.append(n)
    return [{"id": _slug(n), "name": n, "sor": "local", "systemOfRecord": "Pega (Local)"} for n in seen]


def _gen_integrations(industry: str) -> list[dict[str, Any]]:
    return [
        {"id": "entra-id", "name": "Microsoft Entra ID", "purpose": "Identity, accounts and access provisioning"},
        {"id": "system-of-record", "name": "System of Record", "purpose": f"Core {industry} data integration"},
        {"id": "notification-gateway", "name": "Email/SMS Gateway", "purpose": "Outbound notifications to participants"},
    ]


def _primary_case(purpose: str) -> dict[str, Any]:
    return {
        "id": _slug(purpose), "name": purpose, "primary": True,
        "description": (
            f"End-to-end {purpose} workflow that coordinates intake, assessment, processing, review "
            f"and completion — with the right approvals, data and notifications at each step."
        ),
        "stages": [
            _stage("Intake", "primary", steps=[
                _step("Receive Request", "collect"),
                _step("Validate Details", "automation"),
                _step("Confirm Eligibility", "decision"),
            ]),
            _stage("Assessment", "primary", steps=[
                _step("Gather Information", "collect"),
                _step("Analyze Requirements", "automation"),
                _step("Policy Check", "decision"),
            ]),
            _stage("Processing", "primary", processes=[
                _process("Execution", [
                    _step(f"Perform {purpose} Tasks", "automation"),
                    _step("Coordinate Stakeholders", "collect"),
                    _step("Update Records", "automation"),
                ]),
            ]),
            _stage("Review & Approval", "primary", steps=[
                _step("Quality Review", "collect"),
                _step("Manager Approval", "approve"),
                _step("Generate Summary", "document"),
            ]),
            _stage("Completion", "primary", steps=[
                _step("Notify Outcome", "notification"),
                _step("Archive Records", "automation"),
                _step("Send Survey", "notification"),
            ]),
            _stage("Rework", "alternate", steps=[
                _step("Identify Gaps", "automation"),
                _step("Request Updates", "collect"),
                _step("Resubmit", "notification"),
            ]),
            _stage("Exception Handling", "alternate", steps=[
                _step("Flag Exception", "decision"),
                _step("Summarize with AI", "ai-agent"),
                _step("Manager Decision", "approve"),
                _step("Notify Outcome", "notification"),
            ]),
        ],
    }


def _support_case(name: str, purpose: str) -> dict[str, Any]:
    return {
        "id": _slug(name), "name": name, "primary": False,
        "description": f"Supporting workflow that handles {name.lower()} as part of {purpose}.",
        "stages": [
            _stage("Request", "primary", steps=[
                _step("Capture Request", "collect"),
                _step("Validate", "automation"),
                _step("Approve", "approve"),
            ]),
            _stage("Fulfilment", "primary", steps=[
                _step("Execute Task", "automation"),
                _step("Verify Completion", "collect"),
                _step("Confirm", "notification"),
            ]),
            _stage("Exception", "alternate", steps=[
                _step("Flag Issue", "decision"),
                _step("Resolve", "collect"),
                _step("Notify Outcome", "notification"),
            ]),
        ],
    }


def generate_blueprint(industry: str, sub_industry: str, purpose: str,
                       description: str = "") -> dict[str, Any]:
    """Generate a new blueprint from a create-wizard selection.

    The curated "Employee Onboarding" seed is returned (with a fresh id) when that
    exact purpose is chosen, so re-creating the showcase looks rich; any other
    selection produces a structurally faithful generated application.
    """
    industry = (industry or "Cross Industry (e.g. HR, IT, Finance, etc.)").strip()
    sub_industry = (sub_industry or "Operations").strip()
    purpose = (purpose or "Case Intake").strip()

    if sub_industry == "Human Resources" and purpose == "Employee Onboarding":
        bp = make_seed_blueprint()
        bp["id"] = _new_bp_id()
        if description:
            bp["description"] = description
        return bp

    desc = description or (
        f"Manage {purpose.lower()} for a {sub_industry} team in the {industry.split(' (')[0]} "
        f"industry — coordinating intake, processing, review and completion with the right "
        f"approvals, data objects and notifications."
    )
    case_types = [
        _primary_case(purpose),
        _support_case("Document Verification", purpose),
        _support_case("Approval Management", purpose),
    ]
    return {
        "id": _new_bp_id(),
        "title": purpose,
        "industry": industry.split(" (")[0],
        "subIndustry": sub_industry,
        "purpose": purpose,
        "description": desc,
        "orgName": "Microsoft",
        "location": "United States",
        "language": "English",
        "caseTypes": case_types,
        "personas": _gen_personas(sub_industry),
        "dataObjects": _gen_data_objects(purpose),
        "integrations": _gen_integrations(industry.split(" (")[0]),
        "inboundEvents": _seed_inbound_events(),
        "identity": "OpenID Connect (OIDC)",
    }


def _build_step(spec: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": _id("step"),
        "name": (spec.get("name") or "Step").strip(),
        "type": normalize_step_type(spec.get("type", "")),
    }


def _build_stage(spec: dict[str, Any]) -> dict[str, Any]:
    kind = (spec.get("kind") or "primary").strip().lower()
    if kind not in ("primary", "alternate"):
        kind = "primary"
    steps = [_build_step(s) for s in (spec.get("steps") or []) if (s.get("name") or "").strip()]
    processes: list[dict[str, Any]] = []
    for p in (spec.get("processes") or []):
        psteps = [_build_step(s) for s in (p.get("steps") or []) if (s.get("name") or "").strip()]
        if psteps:
            processes.append({"id": _id("proc"), "name": (p.get("name") or "Process").strip(),
                              "steps": psteps})
    return {"id": _id("stage"), "name": (spec.get("name") or "Stage").strip(), "kind": kind,
            "steps": steps, "processes": processes}


def _build_case(spec: dict[str, Any], *, primary_default: bool) -> dict[str, Any]:
    name = (spec.get("name") or "Workflow").strip()
    stages = [_build_stage(s) for s in (spec.get("stages") or []) if (s.get("name") or "").strip()]
    return {
        "id": _slug(name),
        "name": name,
        "primary": bool(spec.get("primary", primary_default)),
        "description": (spec.get("description") or f"{name} workflow.").strip(),
        "stages": stages,
    }


def build_blueprint(case_types: list[dict[str, Any]], *, title: str = "",
                    industry: str = "", sub_industry: str = "", purpose: str = "",
                    description: str = "") -> dict[str, Any]:
    """Build a blueprint from an explicit, caller-provided lifecycle (the *author* path).

    The agent supplies the rich part — the case types, stages and typed steps it
    parsed from the user's request or work context — and this fills in the surrounding
    scaffolding (personas, data objects, integrations, identity, org metadata) exactly
    the way ``generate_blueprint`` does, so an authored blueprint is as complete as a
    generated one. Caller input is normalized (step-type synonyms coerced, stage kind
    defaulted, ids generated) so messy input never breaks the widget.
    """
    industry = (industry or "Cross Industry").split(" (")[0].strip() or "Cross Industry"
    sub_industry = (sub_industry or "Operations").strip()

    norm_cases: list[dict[str, Any]] = []
    for i, c in enumerate(case_types or []):
        case = _build_case(c, primary_default=(i == 0))
        if case["stages"]:
            norm_cases.append(case)
    if not norm_cases:
        raise ValueError(
            "author_blueprint needs at least one case type with stages and steps")
    # exactly one primary case
    seen_primary = False
    for c in norm_cases:
        if c["primary"] and not seen_primary:
            seen_primary = True
        elif c["primary"]:
            c["primary"] = False
    if not seen_primary:
        norm_cases[0]["primary"] = True

    primary = next(c for c in norm_cases if c["primary"])
    title = (title or primary["name"]).strip()
    purpose = (purpose or primary["name"]).strip()
    desc = (description or
            f"{purpose} application with {len(norm_cases)} workflow(s), authored from a "
            f"described process.").strip()
    return {
        "id": _new_bp_id(),
        "title": title,
        "industry": industry,
        "subIndustry": sub_industry,
        "purpose": purpose,
        "description": desc,
        "orgName": "Microsoft",
        "location": "United States",
        "language": "English",
        "caseTypes": norm_cases,
        "personas": _gen_personas(sub_industry),
        "dataObjects": _gen_data_objects(purpose),
        "integrations": _gen_integrations(industry),
        "inboundEvents": _seed_inbound_events(),
        "identity": "OpenID Connect (OIDC)",
    }


# Re-exported so the store can lazily (re)seed generated sections.
seed_case_types = _seed_case_types
seed_personas = _seed_personas
seed_data_objects = _seed_data_objects
new_id = _id
