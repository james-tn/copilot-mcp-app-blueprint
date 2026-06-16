// Color helpers for outcomes, channels and the phase stepper.

export const OUTCOME_COLORS: Record<string, string> = {
  Acquire: "#5b8def",
  Grow: "#2bb673",
  Nurture: "#8a6ded",
  Onboard: "#0e7490",
  "Resilience & Collections": "#b45309",
  Retain: "#d65db1",
  Service: "#e0902f",
};
export function outcomeColor(outcome: string): string {
  return OUTCOME_COLORS[outcome] ?? "#8a8886";
}

export const CHANNEL_COLORS: Record<string, string> = {
  Mobile: "#0a66c2",
  Email: "#7c3aed",
  SMS: "#0e7490",
  Web: "#2bb673",
  "Push Notifications": "#d65db1",
  "Paid Media": "#b45309",
  "Call Center": "#e0563f",
  IVR: "#5b8def",
  "Agent Assisted": "#8a6ded",
};
export function channelColor(channel: string): string {
  return CHANNEL_COLORS[channel] ?? "#8a8886";
}

// Translucent tint for pill backgrounds (hex + alpha).
export function tint(hex: string, alpha = "22"): string {
  return `${hex}${alpha}`;
}
