// Dev-only mock data so `npm run dev` renders all views without an MCP host.
// Mirrors the shapes produced by server/pega_mcp/store.py.
import type { ToolData } from "./types";

const PHASES = ["context", "workflows", "workflow-details", "data", "personas", "summary"] as const;

const counts = {
  caseTypes: 3, stages: 15, steps: 58, automations: 25,
  dataObjects: 6, personas: 6, integrations: 4,
};

function header(phase: string) {
  return {
    blueprintId: "BP-2027437",
    title: "Employee Onboarding",
    industry: "Cross Industry",
    subIndustry: "Human Resources",
    phase,
    phases: PHASES,
    counts,
  };
}

const context = {
  orgName: "Microsoft",
  description:
    "Manage employee onboarding, coordinating HR, IT, managers, and support teams to ensure every new hire is ready for Day One. Primary Employee Onboarding workflow manages workflows for system access, orientation, training, desk assignment, and device provisioning including separate workflows for laptop and mobile device provisioning. The app tracks progress, approvals, and completion across all onboarding activities.",
  industry: "Cross Industry",
  subIndustry: "Human Resources",
  purpose: "Employee Onboarding",
  language: "English",
  location: "United States",
};

const caseSummaries = [
  { id: "employee-onboarding", name: "Employee Onboarding", primary: true, description: "Manage the complete onboarding process for new hires by coordinating across HR, IT, managers, and support teams.", stageCount: 6, stepCount: 30, automations: 13 },
  { id: "laptop-provisioning", name: "Laptop Provisioning", primary: false, description: "Facilitate the end-to-end process of assigning, configuring, and delivering laptops to new employees.", stageCount: 5, stepCount: 16, automations: 8 },
  { id: "mobile-device-provisioning", name: "Mobile Device Provisioning", primary: false, description: "Oversee the procurement, configuration, and assignment of mobile devices for new hires.", stageCount: 4, stepCount: 12, automations: 4 },
];

const step = (name: string, type: string, n: number) => ({ id: `s${n}`, name, type });

const employeeOnboardingStages = [
  { id: "st1", name: "Preboarding", kind: "primary", processes: [], steps: [
    step("Receive Offer Acceptance", "collect", 1), step("Validate Personal Data", "automation", 2),
    step("Verify Work Eligibility", "decision", 3), step("Initiate Background Check", "automation", 4),
    step("Acknowledge Preboarding", "notification", 5),
  ]},
  { id: "st2", name: "Day One Prep", kind: "primary", steps: [], processes: [
    { id: "p1", name: "Systems Setup", steps: [
      step("Provision IT Accounts", "automation", 6), step("Assign Devices", "automation", 7),
      step("Prepare Desk Assignment", "collect", 8), step("Configure System Access", "automation", 9),
      step("Send Setup Confirmations", "notification", 10),
    ]},
    { id: "p2", name: "Logistics", steps: [
      step("Order Access Badge", "automation", 11), step("Schedule Orientation", "collect", 12),
    ]},
  ]},
  { id: "st3", name: "Welcome & Orientation", kind: "primary", processes: [], steps: [
    step("Conduct Welcome Session", "collect", 13), step("Manager Introduction", "collect", 14),
    step("Complete Compliance Training", "automation", 15), step("Provide Policy Documents", "notification", 16),
    step("Generate Onboarding Checklist", "document", 17),
  ]},
  { id: "st4", name: "Progress Tracking", kind: "primary", processes: [], steps: [
    step("Track Activity Completion", "automation", 18), step("Escalate Pending Tasks", "automation", 19),
    step("Collect Manager Feedback", "collect", 20), step("Send Completion Survey", "notification", 21),
    step("Archive Onboarding Docs", "automation", 22),
  ]},
  { id: "st5", name: "Rework", kind: "alternate", processes: [], steps: [
    step("Identify Missing Data", "automation", 23), step("Request Data Update", "collect", 24),
    step("Escalate Delayed Tasks", "automation", 25), step("Notify Rework Needed", "notification", 26),
  ]},
  { id: "st6", name: "Exception Approval", kind: "alternate", processes: [], steps: [
    step("Flag Exception Incident", "decision", 27), step("Summarize Exception AI", "ai-agent", 28),
    step("Manager Decision", "approve", 29), step("Notify Outcome", "notification", 30),
  ]},
];

const laptopStages = [
  { id: "l1", name: "Request", kind: "primary", processes: [], steps: [
    step("Capture Device Requirements", "collect", 31), step("Validate Eligibility", "decision", 32), step("Approve Allocation", "approve", 33)]},
  { id: "l2", name: "Procurement", kind: "primary", processes: [], steps: [
    step("Reserve Inventory", "automation", 34), step("Order Laptop", "automation", 35), step("Track Shipment", "automation", 36)]},
  { id: "l3", name: "Configuration", kind: "primary", processes: [], steps: [
    step("Image Device", "automation", 37), step("Install Software", "automation", 38), step("Apply Security Policies", "automation", 39), step("Quality Check", "collect", 40)]},
  { id: "l4", name: "Handover", kind: "primary", processes: [], steps: [
    step("Schedule Delivery", "collect", 41), step("Confirm Receipt", "notification", 42), step("Activate Asset Record", "automation", 43)]},
  { id: "l5", name: "Out of Stock", kind: "alternate", processes: [], steps: [
    step("Notify Delay", "notification", 44), step("Offer Loaner Device", "collect", 45), step("Reorder Stock", "automation", 46)]},
];

const mobileStages = [
  { id: "m1", name: "Request", kind: "primary", processes: [], steps: [
    step("Select Device & Plan", "collect", 47), step("Verify Policy Eligibility", "decision", 48), step("Approve Request", "approve", 49)]},
  { id: "m2", name: "Provisioning", kind: "primary", processes: [], steps: [
    step("Reserve Device", "automation", 50), step("Configure MDM Enrollment", "automation", 51), step("Assign Phone Number", "automation", 52)]},
  { id: "m3", name: "Activation", kind: "primary", processes: [], steps: [
    step("Install Work Apps", "automation", 53), step("Verify Connectivity", "collect", 54), step("Send Activation Guide", "notification", 55)]},
  { id: "m4", name: "Exception", kind: "alternate", processes: [], steps: [
    step("Flag Compliance Issue", "decision", 56), step("Manager Review", "approve", 57), step("Notify Outcome", "notification", 58)]},
];

const CASES: Record<string, { name: string; description: string; primary: boolean; stages: any[] }> = {
  "employee-onboarding": { name: "Employee Onboarding", primary: true, description: caseSummaries[0].description, stages: employeeOnboardingStages },
  "laptop-provisioning": { name: "Laptop Provisioning", primary: false, description: caseSummaries[1].description, stages: laptopStages },
  "mobile-device-provisioning": { name: "Mobile Device Provisioning", primary: false, description: caseSummaries[2].description, stages: mobileStages },
};

const caseList = caseSummaries.map((c) => ({ id: c.id, name: c.name, primary: c.primary }));

function caseCounts(stages: any[]) {
  const steps = stages.flatMap((st: any) => [...st.steps, ...st.processes.flatMap((p: any) => p.steps)]);
  return {
    stages: stages.length,
    primaryStages: stages.filter((s: any) => s.kind === "primary").length,
    alternateStages: stages.filter((s: any) => s.kind === "alternate").length,
    steps: steps.length,
    automations: steps.filter((s: any) => s.type === "automation" || s.type === "ai-agent").length,
  };
}

function workflowDetails(caseId: string) {
  const id = CASES[caseId] ? caseId : "employee-onboarding";
  const c = CASES[id];
  return {
    view: "workflow-details", ...header("workflow-details"),
    caseList, activeCaseId: id,
    case: { id, name: c.name, description: c.description, primary: c.primary, stages: c.stages, counts: caseCounts(c.stages) },
  } as unknown as ToolData;
}

const personas = [
  { id: "new-hire", name: "New Hire", imageUrl: "https://i.pravatar.cc/160?u=new-hire", description: "A newly hired employee undergoing onboarding who completes required tasks, reviews orientation materials, and tracks their onboarding progress." },
  { id: "hr-specialist", name: "HR Specialist", imageUrl: "https://i.pravatar.cc/160?u=hr-specialist", description: "A human resources professional responsible for initiating onboarding, managing documentation, coordinating orientation, and resolving issues." },
  { id: "hiring-manager", name: "Hiring Manager", imageUrl: "https://i.pravatar.cc/160?u=hiring-manager", description: "The direct supervisor overseeing onboarding, approving desk assignments, scheduling orientation, and ensuring departmental requirements are met." },
  { id: "it-support", name: "IT Support", imageUrl: "https://i.pravatar.cc/160?u=it-support", description: "An IT staff member who manages system and software access, provisions laptops and mobile devices, and resolves technical issues during onboarding." },
  { id: "facilities-coordinator", name: "Facilities Coordinator", imageUrl: "https://i.pravatar.cc/160?u=facilities-coordinator", description: "Responsible for workspace allocation, desk setup, and facility orientation for new hires ahead of their start date." },
  { id: "training-coordinator", name: "Training Coordinator", imageUrl: "https://i.pravatar.cc/160?u=training-coordinator", description: "Organizes and schedules onboarding training sessions, monitors completion of mandatory learning, and supports new hires with guidance." },
];

const dataObjects = {
  local: [
    { id: "employee", name: "Employee", sor: "local", systemOfRecord: "Pega (Local)" },
    { id: "onboarding-checklist", name: "Onboarding Checklist", sor: "local", systemOfRecord: "Pega (Local)" },
    { id: "system-access-request", name: "System Access Request", sor: "local", systemOfRecord: "Pega (Local)" },
    { id: "device-assignment", name: "Device Assignment", sor: "local", systemOfRecord: "Pega (Local)" },
    { id: "workspace-assignment", name: "Workspace Assignment", sor: "local", systemOfRecord: "Pega (Local)" },
    { id: "training-enrollment", name: "Training Enrollment", sor: "local", systemOfRecord: "Pega (Local)" },
  ],
  external: [] as any[],
};

const integrations = [
  { id: "workday", name: "Workday HRIS", purpose: "Source of record for employee profiles" },
  { id: "entra-id", name: "Microsoft Entra ID", purpose: "Identity, accounts and access provisioning" },
  { id: "servicenow", name: "ServiceNow ITSM", purpose: "IT fulfilment for devices and access" },
  { id: "background-check", name: "Background Check Provider", purpose: "Pre-hire screening results" },
];

const inboundEvents = [
  { name: "Pega DX API", enabled: true }, { name: "Pega Desktop", enabled: true },
  { name: "File received", enabled: false }, { name: "Email received", enabled: false },
  { name: "MCP Service", enabled: false }, { name: "Inbound API", enabled: false },
  { name: "A2A (Agent request)", enabled: false }, { name: "Kafka message", enabled: false },
];

const value = {
  scope: "Department", scopes: ["Pilot", "Department", "Enterprise"],
  traditionalWeeks: 35, traditionalMonths: 8.8, blueprintDays: 23, fasterX: 8,
  assumptions: [
    "58 steps across 3 workflows (25 automated)",
    "Traditional hand-build estimated at ~0.6 week per lifecycle step",
    "Illustrative estimate for the POC — not a Pega-validated figure",
  ],
};

const devExports = {
  pdf: "http://localhost:3978/export/BP-2027437/pdf",
  excel: "http://localhost:3978/export/BP-2027437/excel",
  blueprint: "http://localhost:3978/export/BP-2027437/blueprint",
};

const sections = [
  { phase: "context", label: "Application Context", summary: "Microsoft · Human Resources · Employee Onboarding" },
  { phase: "workflows", label: "Workflows", summary: "3 case types · 15 stages" },
  { phase: "workflow-details", label: "Workflow Details", summary: "58 steps · 25 automated" },
  { phase: "data", label: "Data & Integrations", summary: "6 data objects · 4 integrations" },
  { phase: "personas", label: "Personas", summary: "6 personas" },
];

const cloudCapabilities = ["Security", "Connectivity", "Laws & Regs", "Compliance", "Gov Cloud", "AI & Analytics", "Observability", "Disaster Recovery", "Channel", "DevOps"];

const devCatalog = {
  industries: ["Banking", "Communications", "Consumer Services", "Cross Industry (e.g. HR, IT, Finance, etc.)", "Energy & Utilities", "Government", "Healthcare", "Insurance", "Manufacturing", "Transportation & Logistics", "Just for fun", "Other"],
  subIndustries: {
    "Cross Industry (e.g. HR, IT, Finance, etc.)": ["Facilities", "Finance", "Human Resources", "Information Technology", "Procurement", "Other"],
    "Banking": ["Retail Banking", "Asset Management", "Lending", "Payments", "Other"],
    "Insurance": ["Claims", "Underwriting", "Policy Servicing", "Other"],
    "Healthcare": ["Patient Services", "Claims & Billing", "Care Management", "Other"],
    "Government": ["Citizen Services", "Permits & Licensing", "Benefits", "Other"],
    "Communications": ["Customer Service", "Order Management", "Field Service", "Other"],
    "Manufacturing": ["Order Management", "Quality", "Supply Chain", "Other"],
    "Energy & Utilities": ["Customer Service", "Field Service", "Metering", "Other"],
    "Consumer Services": ["Customer Service", "Order Management", "Other"],
    "Transportation & Logistics": ["Shipment Management", "Fleet", "Customer Service", "Other"],
  },
  defaultSubIndustries: ["Operations", "Customer Service", "Other"],
  purposes: {
    "Human Resources": ["Employee Onboarding", "Employee Self-Service", "Performance Management", "Recruiting", "Training and Development"],
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
  },
  defaultPurposes: ["Case Intake", "Service Request", "Approval Workflow", "Investigation"],
};

export const devOverview = {
  view: "overview", ...header("context"), context, caseTypes: caseSummaries, resumePhase: "workflow-details",
} as unknown as ToolData;

// Dev-only: remember the last created blueprint so navigation after a create stays
// consistent (the real server keeps this as the "current" blueprint server-side).
let devCurrent: {
  title: string; subIndustry: string; industry: string;
  context: any; counts: any; caseTypes: any[];
} | null = null;

function devHeader(phase: string) {
  const h = header(phase) as any;
  if (devCurrent) {
    h.title = devCurrent.title;
    h.subIndustry = devCurrent.subIndustry;
    h.industry = devCurrent.industry;
    h.counts = devCurrent.counts;
  }
  return h;
}

function devGenLifecycle(name: string, primary: boolean) {
  const step = (n: string, type: string, i: number) => ({ id: `g${i}`, name: n, type });
  const stages = primary
    ? [
        { id: "g-intake", name: "Intake", kind: "primary", processes: [], steps: [step("Receive Request", "collect", 1), step("Validate Details", "automation", 2), step("Confirm Eligibility", "decision", 3)] },
        { id: "g-assess", name: "Assessment", kind: "primary", processes: [], steps: [step("Gather Information", "collect", 4), step("Analyze Requirements", "automation", 5), step("Policy Check", "decision", 6)] },
        { id: "g-proc", name: "Processing", kind: "primary", steps: [], processes: [{ id: "g-exec", name: "Execution", steps: [step(`Perform ${name} Tasks`, "automation", 7), step("Coordinate Stakeholders", "collect", 8), step("Update Records", "automation", 9)] }] },
        { id: "g-review", name: "Review & Approval", kind: "primary", processes: [], steps: [step("Quality Review", "collect", 10), step("Manager Approval", "approve", 11), step("Generate Summary", "document", 12)] },
        { id: "g-done", name: "Completion", kind: "primary", processes: [], steps: [step("Notify Outcome", "notification", 13), step("Archive Records", "automation", 14), step("Send Survey", "notification", 15)] },
        { id: "g-rework", name: "Rework", kind: "alternate", processes: [], steps: [step("Identify Gaps", "automation", 16), step("Request Updates", "collect", 17), step("Resubmit", "notification", 18)] },
        { id: "g-exc", name: "Exception Handling", kind: "alternate", processes: [], steps: [step("Flag Exception", "decision", 19), step("Summarize with AI", "ai-agent", 20), step("Manager Decision", "approve", 21), step("Notify Outcome", "notification", 22)] },
      ]
    : [
        { id: "g-req", name: "Request", kind: "primary", processes: [], steps: [step("Capture Request", "collect", 1), step("Validate", "automation", 2), step("Approve", "approve", 3)] },
        { id: "g-ful", name: "Fulfilment", kind: "primary", processes: [], steps: [step("Execute Task", "automation", 4), step("Verify Completion", "collect", 5), step("Confirm", "notification", 6)] },
        { id: "g-exc2", name: "Exception", kind: "alternate", processes: [], steps: [step("Flag Issue", "decision", 7), step("Resolve", "collect", 8), step("Notify Outcome", "notification", 9)] },
      ];
  return stages;
}

export function devResolve(name: string, args?: Record<string, unknown>): ToolData {
  const phase = (args?.phase as string) || "";
  const caseArg = (args?.case as string) || "";
  if (name === "show_create") return { view: "create", catalog: devCatalog } as unknown as ToolData;
  if (name === "create_blueprint") {
    const purpose = (args?.purpose as string) || "New Application";
    const sub = (args?.sub_industry as string) || "Operations";
    const ind = ((args?.industry as string) || "Cross Industry").split(" (")[0];
    // Mirror the server's generated shape: a primary case + 2 supporting cases.
    const genCases = [
      { id: "primary", name: purpose, primary: true, description: `End-to-end ${purpose} workflow coordinating intake, assessment, processing, review and completion.`, stageCount: 7, stepCount: 22, automations: 7 },
      { id: "doc-verification", name: "Document Verification", primary: false, description: `Supporting workflow that handles document verification as part of ${purpose}.`, stageCount: 3, stepCount: 9, automations: 4 },
      { id: "approval-management", name: "Approval Management", primary: false, description: `Supporting workflow that handles approval management as part of ${purpose}.`, stageCount: 3, stepCount: 9, automations: 4 },
    ];
    const ctx = { ...context, purpose, subIndustry: sub, industry: ind, description: `Generated ${purpose} application for a ${sub} team in the ${ind} industry.` };
    const gcounts = { ...counts, caseTypes: 3, stages: 13, steps: 40, automations: 15, personas: 5 };
    devCurrent = { title: purpose, subIndustry: sub, industry: ind, context: ctx, counts: gcounts, caseTypes: genCases };
    return { view: "overview", ...header("context"), industry: ind, subIndustry: sub, title: purpose, counts: gcounts, context: ctx, caseTypes: genCases, resumePhase: "workflows" } as unknown as ToolData;
  }
  if (name === "get_app_state") {
    const t = devCurrent?.title ?? "Employee Onboarding";
    const s = devCurrent?.subIndustry ?? "Human Resources";
    const created = !!devCurrent;
    return { view: "app-state", phase: "overview", phaseLabel: "Overview", title: t, subIndustry: s, origin: created ? "created" : "seed", createdThisSession: created, recentActivity: created ? [`Created blueprint '${t}'`] : [], counts: devCurrent?.counts ?? counts, summary: `The user is on the 'Overview' step of '${t}'. ${created ? "The user CREATED this blueprint this session." : "This is the default sample blueprint."}` } as unknown as ToolData;
  }
  if (name === "list_blueprints") {
    const created = devCurrent
      ? [{ id: "bp-created", title: devCurrent.title, industry: devCurrent.industry, subIndustry: devCurrent.subIndustry, purpose: devCurrent.title, origin: "created", createdThisSession: true, isCurrent: true, counts: devCurrent.counts }]
      : [];
    const sample = { id: "BP-2027437", title: "Employee Onboarding", industry: "Cross Industry", subIndustry: "Human Resources", purpose: "Employee Onboarding", origin: "seed", createdThisSession: false, isCurrent: !devCurrent, counts };
    const list = [...created, sample];
    const summary = created.length
      ? `You have created ${created.length} blueprint(s) this session: '${devCurrent!.title}' (${devCurrent!.subIndustry}).`
      : "No blueprints created yet this session — only the default sample is loaded. Open the create wizard to design one.";
    return { view: "blueprint-list", count: list.length, createdCount: created.length, blueprints: list, summary } as unknown as ToolData;
  }
  if (name === "show_workflows") return { view: "workflows", ...devHeader("workflows"), caseTypes: devCurrent?.caseTypes ?? caseSummaries } as unknown as ToolData;
  if (name === "show_workflow") {
    if (devCurrent) {
      const cl = devCurrent.caseTypes;
      const active = cl.find((c: any) => caseArg && (c.id === caseArg || (c.name || "").toLowerCase().includes(caseArg.toLowerCase()))) ?? cl[0];
      const stages = devGenLifecycle(active.name, !!active.primary);
      const steps = stages.flatMap((st: any) => [...st.steps, ...st.processes.flatMap((p: any) => p.steps)]);
      const cc = { stages: stages.length, primaryStages: stages.filter((s: any) => s.kind === "primary").length, alternateStages: stages.filter((s: any) => s.kind === "alternate").length, steps: steps.length, automations: steps.filter((s: any) => s.type === "automation" || s.type === "ai-agent").length };
      return { view: "workflow-details", ...devHeader("workflow-details"), caseList: cl.map((c: any) => ({ id: c.id, name: c.name, primary: c.primary })), activeCaseId: active.id, case: { id: active.id, name: active.name, description: active.description, primary: active.primary, stages, counts: cc } } as unknown as ToolData;
    }
    return workflowDetails(caseArg);
  }
  if (name === "show_data") return { view: "data", ...devHeader("data"), identity: "OpenID Connect (OIDC)", inboundEvents, dataObjects, integrations } as unknown as ToolData;
  if (name === "show_personas") return { view: "personas", ...devHeader("personas"), personas } as unknown as ToolData;
  if (name === "show_summary") return { view: "summary", ...devHeader("summary"), context: devCurrent?.context ?? context, architecture: devCurrent?.counts ?? counts, cloudCapabilities, value, exports: devExports, sections } as unknown as ToolData;
  if (name === "show_blueprint" && phase === "context") return { view: "context", ...devHeader("context"), context: devCurrent?.context ?? context } as unknown as ToolData;
  if (name === "show_blueprint" && phase === "workflows") return { view: "workflows", ...devHeader("workflows"), caseTypes: devCurrent?.caseTypes ?? caseSummaries } as unknown as ToolData;
  if (name === "show_blueprint" && (phase === "workflow-details" || phase === "data" || phase === "personas" || phase === "summary")) return devResolve(`show_${phase === "workflow-details" ? "workflow" : phase}`, args);
  return devOverview;
}
