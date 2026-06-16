// Shared types for the blueprint widget. These mirror the structuredContent
// payloads produced by the Python MCP server (server/pega_mcp/store.py).

export type Theme = "light" | "dark";

export type Phase =
  | "context" | "setup" | "personas" | "brand" | "experiences" | "summary";

export interface BrandColors {
  headerColor: string;
  backgroundColor: string;
  footerColor: string;
}

export interface Header {
  blueprintId: string;
  title: string;
  industry: string;
  phase: Phase;
  phases: Phase[];
  brand: BrandColors;
  counts: { actions: number; treatments: number; channels: number };
}

export interface ContextBlock {
  orgName: string;
  website: string;
  objective: string;
  objectiveDetails: string;
  language: string;
  location: string;
}

export interface SetupBlock {
  industry: string;
  products: string[];
  outcomes: string[];
  channels: string[];
  features: string[];
  allOutcomes: string[];
  allChannels: string[];
  allFeatures: string[];
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  gender?: string;
  ageBand?: string;
  imageUrl?: string;
}

export interface VoiceCharacteristic {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface Treatment {
  id: string;
  name: string;
  channel: string;
  headline: string;
  body: string;
  cta: string;
  imageUrl?: string;
  marketingPrinciple?: string;
}

export interface Action {
  id: string;
  name: string;
  description: string;
  product: string;
  objective: string;
  treatments: Treatment[];
}

export interface ActionSummary {
  id: string;
  name: string;
  objective: string;
  description: string;
  treatmentCount: number;
  imageUrl?: string;
}

export interface ProductGroup {
  product: string;
  actions: ActionSummary[];
}

export interface ValueResult {
  numCustomers: number;
  annualValue: number;
  assumptions: string[];
}

export interface Preview {
  imageUrl: string;
  headline: string;
  greeting: string;
  body: string;
  cta: string;
  voiceApplied: string[];
}

export interface OverviewData extends Header {
  view: "overview";
  context: ContextBlock;
  setup: SetupBlock;
  personaCount: number;
  resumePhase: Phase;
}
export interface ContextData extends Header { view: "context"; context: ContextBlock; }
export interface SetupData extends Header { view: "setup"; setup: SetupBlock; }
export interface PersonasData extends Header { view: "personas"; personas: Persona[]; }
export interface BrandData extends Header {
  view: "brand";
  voice: VoiceCharacteristic[];
  visual: { logoUrl?: string } & BrandColors;
  preview: Preview;
}
export interface ExperiencesData extends Header { view: "experiences"; groups: ProductGroup[]; }
export interface ActionData extends Header { view: "action"; action: Action; }
export interface SummaryData extends Header {
  view: "summary";
  context: ContextBlock;
  setup: SetupBlock;
  value: ValueResult;
  exports: { pdf: string; excel: string; blueprint: string };
  sections: { phase: Phase; label: string; summary: string }[];
}
export interface ErrorData extends Header { view: "error"; message: string; }

export type ToolData =
  | OverviewData | ContextData | SetupData | PersonasData
  | BrandData | ExperiencesData | ActionData | SummaryData | ErrorData;
