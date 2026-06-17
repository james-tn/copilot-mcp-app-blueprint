// Shared types for the Pega Blueprint widget. These mirror the structuredContent
// payloads produced by the Python MCP server (server/pega_mcp/store.py).

export type Theme = "light" | "dark";

// The six application-design steps.
export type Phase =
  | "context" | "workflows" | "workflow-details" | "data" | "personas" | "summary";

// Lifecycle step types (the building blocks of a Pega Case Lifecycle step).
export type StepType =
  | "collect" | "automation" | "decision" | "notification"
  | "document" | "ai-agent" | "approve" | "wait" | "resolve";

export interface Counts {
  caseTypes: number;
  stages: number;
  steps: number;
  automations: number;
  dataObjects: number;
  personas: number;
  integrations: number;
}

export interface Header {
  blueprintId: string;
  title: string;
  industry: string;
  subIndustry: string;
  phase: Phase;
  phases: Phase[];
  counts: Counts;
}

export interface ContextBlock {
  orgName: string;
  description: string;
  industry: string;
  subIndustry: string;
  purpose: string;
  language: string;
  location: string;
}

export interface Step {
  id: string;
  name: string;
  type: StepType;
}

export interface Process {
  id: string;
  name: string;
  steps: Step[];
}

export interface Stage {
  id: string;
  name: string;
  kind: "primary" | "alternate";
  steps: Step[];
  processes: Process[];
}

export interface CaseCounts {
  stages: number;
  primaryStages: number;
  alternateStages: number;
  steps: number;
  automations: number;
}

export interface CaseDetail {
  id: string;
  name: string;
  description: string;
  primary: boolean;
  stages: Stage[];
  counts: CaseCounts;
}

export interface CaseSummary {
  id: string;
  name: string;
  primary: boolean;
  description: string;
  stageCount: number;
  stepCount: number;
  automations: number;
}

export interface CaseRef {
  id: string;
  name: string;
  primary: boolean;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface DataObject {
  id: string;
  name: string;
  sor: "local" | "external";
  systemOfRecord: string;
}

export interface Integration {
  id: string;
  name: string;
  purpose: string;
}

export interface InboundEvent {
  name: string;
  enabled: boolean;
}

export interface ValueResult {
  scope: string;
  scopes: string[];
  traditionalWeeks: number;
  traditionalMonths: number;
  blueprintDays: number;
  fasterX: number;
  assumptions: string[];
}

export interface OverviewData extends Header {
  view: "overview";
  context: ContextBlock;
  caseTypes: CaseSummary[];
  resumePhase: Phase;
}
export interface Catalog {
  industries: string[];
  subIndustries: Record<string, string[]>;
  defaultSubIndustries: string[];
  purposes: Record<string, string[]>;
  defaultPurposes: string[];
}
export interface CreateData {
  view: "create";
  catalog: Catalog;
}
export interface ContextData extends Header { view: "context"; context: ContextBlock; }
export interface WorkflowsData extends Header { view: "workflows"; caseTypes: CaseSummary[]; }
export interface WorkflowDetailsData extends Header {
  view: "workflow-details";
  caseList: CaseRef[];
  activeCaseId: string;
  case: CaseDetail;
}
export interface DataViewData extends Header {
  view: "data";
  identity: string;
  inboundEvents: InboundEvent[];
  dataObjects: { local: DataObject[]; external: DataObject[] };
  integrations: Integration[];
}
export interface PersonasData extends Header { view: "personas"; personas: Persona[]; }
export interface SummaryData extends Header {
  view: "summary";
  context: ContextBlock;
  architecture: Counts;
  cloudCapabilities: string[];
  value: ValueResult;
  exports: { pdf: string; excel: string; blueprint: string };
  sections: { phase: Phase; label: string; summary: string }[];
}
export interface ErrorData extends Header { view: "error"; message: string; }

export type ToolData =
  | OverviewData | ContextData | WorkflowsData | WorkflowDetailsData
  | DataViewData | PersonasData | SummaryData | CreateData | ErrorData;
