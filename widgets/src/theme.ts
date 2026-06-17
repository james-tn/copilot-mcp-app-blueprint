// Color + label helpers for lifecycle step types and stages.

import type { StepType } from "./types";

// Pega brand accent (indigo/purple) used for highlights and primary actions.
export const PEGA_PURPLE = "#5a1faa";

export interface StepTypeMeta {
  label: string;
  color: string;
}

// Keyed by the server's step ``type`` (see data.STEP_TYPES).
export const STEP_TYPE_META: Record<StepType, StepTypeMeta> = {
  collect: { label: "Collect information", color: "#2bb673" },
  automation: { label: "Automation", color: "#e0902f" },
  decision: { label: "Decision", color: "#e0563f" },
  notification: { label: "Send notification", color: "#d9a514" },
  document: { label: "Generate document", color: "#0e7490" },
  "ai-agent": { label: "AI Agent", color: "#8a6ded" },
  approve: { label: "Approve/Reject", color: "#0a66c2" },
  wait: { label: "Wait", color: "#6b7280" },
  resolve: { label: "Resolve", color: "#107c41" },
};

export function stepMeta(type: StepType): StepTypeMeta {
  return STEP_TYPE_META[type] ?? { label: type, color: "#8a8886" };
}

// Stage header color. Primary stages are Pega blue; alternate stages are grey.
export function stageColor(kind: "primary" | "alternate"): string {
  return kind === "primary" ? "#2c5cc5" : "#6b7280";
}

// Translucent tint for pill backgrounds (hex + alpha).
export function tint(hex: string, alpha = "22"): string {
  return `${hex}${alpha}`;
}
