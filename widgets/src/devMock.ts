// Dev-only mock data so `npm run dev` renders all views without an MCP host.
// Mirrors the shapes produced by server/pega_mcp/store.py.
import type { ToolData } from "./types";

const PHASES = ["context", "setup", "personas", "brand", "experiences", "summary"] as const;
const brand = { headerColor: "#f25022", backgroundColor: "#000000", footerColor: "#000000" };
const counts = { actions: 5, treatments: 10, channels: 1 };

function header(phase: string) {
  return {
    blueprintId: "CDHBP-335041",
    title: "Increase ARPU/ARPA / Maximize customer lifetime value",
    industry: "Communications",
    phase,
    phases: PHASES,
    brand,
    counts,
  };
}

const context = {
  orgName: "Microsoft",
  website: "microsoft.com",
  objective: "Increase ARPU/ARPA / Maximize customer lifetime value",
  objectiveDetails:
    "Maximize revenue potential from the existing customer base by identifying expansion opportunities and preventing value leakage. Cross-sell and upsell premium services, device upgrades and add-ons. Target 25-35% increase in ARPU while keeping CSAT above 8.5.",
  language: "English",
  location: "United States",
};

const setup = {
  industry: "Communications",
  products: ["Mobile Plans", "Device Purchase", "Value-Added Services"],
  outcomes: ["Grow"],
  channels: ["Mobile"],
  features: [],
  allOutcomes: ["Acquire", "Grow", "Nurture", "Onboard", "Resilience & Collections", "Retain", "Service"],
  allChannels: ["Agent Assisted", "Call Center", "Email", "IVR", "Mobile", "Paid Media", "Push Notifications", "SMS", "Web"],
  allFeatures: ["Customer Journeys", "Data Model"],
};

const personas = [
  { id: "chloe", name: "Connected Chloe", gender: "Female", ageBand: "Career Builders", imageUrl: "https://picsum.photos/seed/chloe/160/160", description: "Late 30s, managing the household's tech decisions. Wants simpler bundling, stronger security and clear monthly value." },
  { id: "ulysses", name: "Upgrading Ulysses", gender: "Male", ageBand: "Established", imageUrl: "https://picsum.photos/seed/ulysses/160/160", description: "Mid-40s small-business owner. Wants premium upgrades that save time and improve reliability." },
  { id: "aaliyah", name: "Aspirational Aaliyah", gender: "Female", ageBand: "Career Builders", imageUrl: "https://picsum.photos/seed/aaliyah/160/160", description: "Late 20s, mobile-first, influenced by social proof. Wants premium that feels accessible." },
  { id: "carlos", name: "Cautious Carlos", gender: "Male", ageBand: "Established", imageUrl: "https://picsum.photos/seed/carlos/160/160", description: "Early 50s, loyal, wants services to work without surprises and plain-language value." },
  { id: "indigo", name: "Independent Indigo", gender: "Non-binary", ageBand: "Gen Z / Students", imageUrl: "https://picsum.photos/seed/indigo/160/160", description: "Early 20s, budget-conscious, wants flexible upgrades and monthly flexibility." },
];

const voice = [
  { id: "value-led", name: "Value-Led", enabled: true, description: "Lead with the benefit, then the recommendation." },
  { id: "plainspoken", name: "Plainspoken Precision", enabled: true, description: "Clear, specific, easy to act on." },
  { id: "life-aware", name: "Life-Aware", enabled: true, description: "Tie every offer to a real-life moment." },
  { id: "guided-confidence", name: "Guided Confidence", enabled: true, description: "Recommend the next best step with a reason." },
];

const action = {
  id: "surface-pro-accessory-bundle",
  name: "Surface Pro Accessory Bundle",
  product: "Device Purchase",
  objective: "Grow",
  description: "Targets existing Surface Pro owners. Offers a keyboard + Slim Pen attach to complete a work-anywhere setup.",
  treatments: [
    { id: "t1", name: "Pro Setup Upgrade", channel: "Mobile", headline: "Complete your Surface Pro", body: "Add Surface Pro Keyboard and Surface Slim Pen to unlock a more productive setup.", cta: "Shop Pro Bundle", imageUrl: "https://picsum.photos/seed/surfacepro1/600/300", marketingPrinciple: "Value framing" },
    { id: "t2", name: "Surface Pro Boost", channel: "Mobile", headline: "Built for Surface Pro", body: "Get the accessories designed to match your Surface Pro — ready to go.", cta: "Upgrade Pro Today", imageUrl: "https://picsum.photos/seed/surfacepro2/600/300", marketingPrinciple: "Value framing" },
  ],
};

const groups = [
  { product: "Device Purchase", actions: [
    { id: "surface-pro-accessory-bundle", name: "Surface Pro Accessory Bundle", objective: "Grow", description: "", treatmentCount: 2, imageUrl: "https://picsum.photos/seed/surfacepro1/600/300" },
    { id: "surface-laptop-premium-upgrade", name: "Surface Laptop Premium Upgrade", objective: "Grow", description: "", treatmentCount: 2, imageUrl: "https://picsum.photos/seed/surfacelaptop1/600/300" },
  ]},
  { product: "Mobile Plans", actions: [
    { id: "m365-family-upgrade", name: "Microsoft 365 Family Upgrade", objective: "Grow", description: "", treatmentCount: 2, imageUrl: "https://picsum.photos/seed/m365family1/600/300" },
    { id: "m365-personal-plus", name: "Microsoft 365 Personal Plus", objective: "Grow", description: "", treatmentCount: 2, imageUrl: "https://picsum.photos/seed/m365personal1/600/300" },
  ]},
  { product: "Value-Added Services", actions: [
    { id: "value-added-security", name: "Value-Added Security Pack", objective: "Grow", description: "", treatmentCount: 2, imageUrl: "https://picsum.photos/seed/security1/600/300" },
  ]},
];

const value = {
  numCustomers: 10_000_000,
  annualValue: 21_600_000,
  assumptions: [
    "12% of customers adopt at least one recommended action",
    "$18 average annual ARPU uplift per adopting customer",
    "Illustrative estimate for the POC — not a Pega-validated figure",
  ],
};

const devExports = {
  pdf: "http://localhost:3978/export/CDHBP-335041/pdf",
  excel: "http://localhost:3978/export/CDHBP-335041/excel",
  blueprint: "http://localhost:3978/export/CDHBP-335041/blueprint",
};
const devSections = [
  { phase: "context", label: "Context", summary: "Microsoft · Increase ARPU" },
  { phase: "setup", label: "Setup", summary: "Communications · Grow · Mobile" },
  { phase: "personas", label: "Personas", summary: "5 personas" },
  { phase: "brand", label: "Brand", summary: "4 voice traits enabled" },
  { phase: "experiences", label: "Experiences", summary: "5 actions · 10 messages" },
];

const preview = {
  imageUrl: "https://picsum.photos/seed/preview/600/280",
  headline: "A smarter mobile plan, recommended by experts",
  greeting: "Hi Chloe,",
  body: "When work, streaming, and everyday sharing happen across all your devices, the right plan matters. Microsoft recommends plans built for real daily use, with dependable coverage and clear value.",
  cta: "See Plans",
  voiceApplied: ["Value-Led", "Plainspoken Precision", "Life-Aware", "Guided Confidence"],
};

export const devOverview = {
  view: "overview", ...header("context"), context, setup, personaCount: personas.length, resumePhase: "experiences",
} as unknown as ToolData;

export function devResolve(name: string, args?: Record<string, unknown>): ToolData {
  const phase = (args?.phase as string) || "";
  if (name === "show_personas") return { view: "personas", ...header("personas"), personas } as unknown as ToolData;
  if (name === "show_brand") return { view: "brand", ...header("brand"), voice, visual: { logoUrl: undefined, ...brand }, preview } as unknown as ToolData;
  if (name === "show_experiences") return { view: "experiences", ...header("experiences"), groups } as unknown as ToolData;
  if (name === "show_summary") return { view: "summary", ...header("summary"), context, setup, value, exports: devExports, sections: devSections } as unknown as ToolData;
  if (name === "show_action") return { view: "action", ...header("experiences"), action } as unknown as ToolData;
  if (name === "show_blueprint" && phase === "context") return { view: "context", ...header("context"), context } as unknown as ToolData;
  if (name === "show_blueprint" && phase === "setup") return { view: "setup", ...header("setup"), setup } as unknown as ToolData;
  return devOverview;
}
