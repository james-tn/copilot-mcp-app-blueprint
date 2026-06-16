// In-memory mock of the Pega Customer Engagement Blueprint backend.
//
// In production this module would be replaced by calls to the Pega MCP server
// (see ../../docs/mcp-tools.md). For the POC it holds the data captured from the
// live app (blueprint CDHBP-335041) and exposes the same operations in-process.

export type Outcome =
  | "Acquire" | "Grow" | "Nurture" | "Onboard"
  | "Resilience & Collections" | "Retain" | "Service";

export type Channel =
  | "Agent Assisted" | "Call Center" | "Email" | "IVR" | "Mobile"
  | "Paid Media" | "Push Notifications" | "SMS" | "Web";

export type Feature = "Customer Journeys" | "Data Model";

export const OUTCOMES: Outcome[] = [
  "Acquire", "Grow", "Nurture", "Onboard",
  "Resilience & Collections", "Retain", "Service",
];
export const CHANNELS: Channel[] = [
  "Agent Assisted", "Call Center", "Email", "IVR", "Mobile",
  "Paid Media", "Push Notifications", "SMS", "Web",
];

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
  channel: Channel;
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
  objective: Outcome;
  treatments: Treatment[];
}

export interface Blueprint {
  id: string;
  title: string;
  industry: string;
  // Context
  orgName: string;
  website: string;
  objective: string;
  objectiveDetails: string;
  language: string;
  location: string;
  // Setup
  products: string[];
  outcomes: Outcome[];
  channels: Channel[];
  features: Feature[];
  // Personas / Brand / Experiences
  personas: Persona[];
  voice: VoiceCharacteristic[];
  logoUrl?: string;
  headerColor: string;
  backgroundColor: string;
  footerColor: string;
  actions: Action[];
}

// Deterministic placeholder image so cards render without auth-gated Pega assets.
export function img(seed: string, w = 600, h = 300): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// Public base URL for serving generated files (export links).
// On Azure App Service WEBSITE_HOSTNAME is set automatically.
export function publicBaseUrl(): string {
  const host = process.env.WEBSITE_HOSTNAME;
  if (host) return `https://${host}`;
  const port = process.env.PORT || 3978;
  return `http://localhost:${port}`;
}

let counter = 1000;
const newId = (prefix: string) => `${prefix}-${++counter}`;

// ---------------------------------------------------------------------------
// Seed data (captured from the live blueprint CDHBP-335041)
// ---------------------------------------------------------------------------

function seedPersonas(): Persona[] {
  return [
    {
      id: "chloe",
      name: "Connected Chloe",
      gender: "Female",
      ageBand: "Career Builders",
      imageUrl: img("chloe", 96, 96),
      description:
        "Late 30s, balancing a full-time job, a partner, and school-age kids while managing most of the household's tech decisions. Frustrated by juggling too many bills, limited storage, and family members on mismatched plans. Looking for simpler bundling, stronger security, and better value. Responds best to practical messaging about convenience, family protection, and clear monthly value.",
    },
    {
      id: "ulysses",
      name: "Upgrading Ulysses",
      gender: "Male",
      ageBand: "Established",
      imageUrl: img("ulysses", 96, 96),
      description:
        "Mid-40s, runs a small business or side hustle and relies heavily on his phone, laptop, and collaboration tools. Frustrated by outdated devices, storage limits, and tools that don't work together. Looking for premium upgrades that save time and improve reliability. Trusts brands that lead with performance, productivity gains, and transparent upgrade economics.",
    },
    {
      id: "aaliyah",
      name: "Aspirational Aaliyah",
      gender: "Female",
      ageBand: "Career Builders",
      imageUrl: img("aaliyah", 96, 96),
      description:
        "Late 20s, building her career and social life, using her phone as the center of work, entertainment, shopping, and organization. Frustrated by feeling capped by her current plan and running out of cloud space. Shops mobile-first, influenced by social proof and creator recommendations, responds to modern, benefit-led messaging that makes premium feel accessible.",
    },
    {
      id: "carlos",
      name: "Cautious Carlos",
      gender: "Male",
      ageBand: "Established",
      imageUrl: img("carlos", 96, 96),
      description:
        "Early 50s, loyal customer for years with a steady middle-income household, mainly wants services to work without surprises. Frustrated by confusing add-ons and unclear pricing. Looking for selective upgrades that protect devices and simplify communication. Trusts brands that use plain language and explain exactly why an upgrade is relevant.",
    },
    {
      id: "indigo",
      name: "Independent Indigo",
      gender: "Non-binary",
      ageBand: "Gen Z / Students",
      imageUrl: img("indigo", 96, 96),
      description:
        "Early 20s, in college or first job, budget-conscious with strong reliance on mobile connectivity and entertainment subscriptions. Frustrated by fragmented services and aging hardware. Looking for flexible upgrades, device financing, and add-ons with visible everyday utility. Responds best to messaging about affordability and monthly flexibility.",
    },
  ];
}

function seedVoice(): VoiceCharacteristic[] {
  return [
    { id: "value-led", name: "Value-Led", description: "Lead with the benefit, then the recommendation.", enabled: true },
    { id: "plainspoken", name: "Plainspoken Precision", description: "Clear, specific, easy to act on. Plain words, concrete numbers.", enabled: true },
    { id: "life-aware", name: "Life-Aware", description: "Tie every offer to a real-life moment.", enabled: true },
    { id: "guided-confidence", name: "Guided Confidence", description: "Recommend the next best step with a reason. Never aggressive.", enabled: true },
  ];
}

function t(name: string, channel: Channel, headline: string, body: string, cta: string, seed: string, principle = "Value framing"): Treatment {
  return { id: newId("t"), name, channel, headline, body, cta, imageUrl: img(seed), marketingPrinciple: principle };
}

function seedActions(): Action[] {
  return [
    {
      id: "surface-pro-accessory-bundle",
      name: "Surface Pro Accessory Bundle",
      product: "Device Purchase",
      objective: "Grow",
      description:
        "Targets existing Surface Pro owners who use their device for work, school, or multitasking. Offers a Surface Pro accessory attach with Surface Pro Keyboard and Surface Slim Pen to turn their current device into a more complete work-anywhere setup.",
      treatments: [
        t("Pro Setup Upgrade", "Mobile", "Complete your Surface Pro", "Add Surface Pro Keyboard and Surface Slim Pen to unlock a more productive, flexible setup wherever your day takes you.", "Shop Pro Bundle", "surfacepro1"),
        t("Surface Pro Boost", "Mobile", "Built for Surface Pro", "Get the accessories designed to match your Surface Pro — keyboard, pen, and more, ready to go.", "Upgrade Pro Today", "surfacepro2"),
      ],
    },
    {
      id: "surface-laptop-premium-upgrade",
      name: "Surface Laptop Premium Upgrade",
      product: "Device Purchase",
      objective: "Grow",
      description:
        "Encourages customers with aging laptops to step up to a premium Surface Laptop with better performance, battery life, and display for demanding work.",
      treatments: [
        t("Power Through Your Day", "Mobile", "More power, less waiting", "Step up to a premium Surface Laptop built for all-day battery and effortless multitasking.", "Explore Laptops", "surfacelaptop1"),
        t("Premium Performance", "Mobile", "Your best work, faster", "Upgrade to a Surface Laptop that keeps up with everything you do — at work and at home.", "See Upgrade Offers", "surfacelaptop2"),
      ],
    },
    {
      id: "m365-family-upgrade",
      name: "Microsoft 365 Family Upgrade",
      product: "Mobile Plans",
      objective: "Grow",
      description:
        "Targets households on mismatched plans. Offers a Microsoft 365 Family plan with more cloud storage, security, and shared benefits across family members.",
      treatments: [
        t("One Plan for the Whole Family", "Mobile", "Bring the family together", "Share premium apps, 1 TB of storage each, and advanced security across up to 6 people — one simple plan.", "Upgrade to Family", "m365family1"),
        t("Family Value", "Mobile", "More for everyone, less to manage", "Consolidate your household onto Microsoft 365 Family and save versus separate plans.", "See Family Plan", "m365family2"),
      ],
    },
    {
      id: "m365-personal-plus",
      name: "Microsoft 365 Personal Plus",
      product: "Mobile Plans",
      objective: "Grow",
      description:
        "For individuals running low on storage or wanting premium features. Offers more cloud storage and advanced security on a personal plan.",
      treatments: [
        t("Never Run Out of Space", "Mobile", "Room for everything", "Get 1 TB of secure cloud storage plus premium apps — perfect for work, photos, and everything in between.", "Go Personal Plus", "m365personal1"),
        t("Premium, Just for You", "Mobile", "Upgrade your everyday", "Unlock advanced security and more storage with Microsoft 365 Personal — built around how you work.", "Upgrade Now", "m365personal2"),
      ],
    },
    {
      id: "value-added-security",
      name: "Value-Added Security Pack",
      product: "Value-Added Services",
      objective: "Grow",
      description:
        "Targets security-conscious customers. Offers an add-on bundle of identity protection, device security, and family safety features.",
      treatments: [
        t("Protect What Matters", "Mobile", "Security that travels with you", "Add identity protection and device security to keep your family safe online — for less than you'd expect.", "Add Protection", "security1"),
        t("Peace of Mind Bundle", "Mobile", "Stay safe, stay simple", "One add-on covers identity, device, and family safety — clear value, no hidden catches.", "Add Security Pack", "security2"),
      ],
    },
  ];
}

export function makeSeedBlueprint(): Blueprint {
  return {
    id: "CDHBP-335041",
    title: "Increase ARPU/ARPA / Maximize customer lifetime value",
    industry: "Communications",
    orgName: "Microsoft",
    website: "microsoft.com",
    objective: "Increase ARPU/ARPA / Maximize customer lifetime value",
    objectiveDetails:
      "Maximize revenue potential from the existing customer base by identifying expansion opportunities and preventing value leakage. Cross-sell and upsell premium services, device upgrades, add-on features, and service tier migrations. Target 25-35% increase in ARPU while keeping CSAT above 8.5.",
    language: "English",
    location: "United States",
    products: ["Mobile Plans", "Device Purchase", "Value-Added Services"],
    outcomes: ["Grow"],
    channels: ["Mobile"],
    features: [],
    personas: seedPersonas(),
    voice: seedVoice(),
    logoUrl: undefined,
    headerColor: "#f25022",
    backgroundColor: "#000000",
    footerColor: "#000000",
    actions: seedActions(),
  };
}

// ---------------------------------------------------------------------------
// In-memory store + operations (the "MCP tool" surface)
// ---------------------------------------------------------------------------

const store = new Map<string, Blueprint>();

function ensureSeed() {
  if (store.size === 0) {
    const bp = makeSeedBlueprint();
    store.set(bp.id, bp);
  }
}

// ---------------------------------------------------------------------------
// Async generation jobs (the real "backend work status" model)
//
// A job is a sequence of named-agent steps, each with its own duration. Status
// is computed from elapsed wall-clock time, so get_job_status() reports steps
// transitioning pending -> running -> completed exactly as the backend "works".
// When the final step elapses, the generated artifacts are committed to the
// blueprint. This mirrors the Pega MCP get_job_status() contract.
// ---------------------------------------------------------------------------

export type JobKind = "personas" | "experiences";
export type StepStatus = "pending" | "running" | "completed";

interface JobStepDef {
  agent: string;
  label: string;
  durationMs: number;
}
export interface JobStepStatus {
  agent: string;
  label: string;
  status: StepStatus;
}
export interface JobStatus {
  jobId: string;
  kind: JobKind;
  done: boolean;
  steps: JobStepStatus[];
}

const PERSONA_STEPS: JobStepDef[] = [
  { agent: "Marketing Analyst", label: "Identifying audience needs", durationMs: 1000 },
  { agent: "Marketing Analyst", label: "Creating personas", durationMs: 1100 },
];
const EXPERIENCE_STEPS: JobStepDef[] = [
  { agent: "Strategy Agent", label: "Outline Action Strategy", durationMs: 1000 },
  { agent: "Marketing Analyst", label: "Establishing Marketing Plan", durationMs: 1100 },
  { agent: "Creative Agent", label: "Imagining New Copy & Image", durationMs: 1300 },
  { agent: "Brand Agent", label: "Critiquing New Actions", durationMs: 1000 },
  { agent: "Creative Agent", label: "Updating Actions", durationMs: 1000 },
];

interface Job {
  jobId: string;
  blueprintId: string;
  kind: JobKind;
  steps: JobStepDef[];
  startedAt: number;
  committed: boolean;
}
const jobs = new Map<string, Job>();

export const pega = {
  listBlueprints(): Pick<Blueprint, "id" | "title" | "industry">[] {
    ensureSeed();
    return [...store.values()].map(({ id, title, industry }) => ({ id, title, industry }));
  },

  get(blueprintId: string): Blueprint | undefined {
    ensureSeed();
    return store.get(blueprintId);
  },

  // Kick off an async generation job. Returns immediately with a jobId.
  startJob(blueprintId: string, kind: JobKind): { jobId: string } {
    ensureSeed();
    const steps = kind === "personas" ? PERSONA_STEPS : EXPERIENCE_STEPS;
    const jobId = newId("job");
    jobs.set(jobId, { jobId, blueprintId, kind, steps, startedAt: Date.now(), committed: false });
    return { jobId };
  },

  // Report current job status. Steps transition by elapsed time; artifacts are
  // committed to the blueprint once the job completes.
  getJobStatus(jobId: string): JobStatus | undefined {
    const job = jobs.get(jobId);
    if (!job) return undefined;
    const elapsed = Date.now() - job.startedAt;
    let acc = 0;
    const steps: JobStepStatus[] = job.steps.map((s) => {
      const start = acc;
      const end = acc + s.durationMs;
      acc = end;
      const status: StepStatus = elapsed >= end ? "completed" : elapsed >= start ? "running" : "pending";
      return { agent: s.agent, label: s.label, status };
    });
    const done = elapsed >= acc;
    if (done && !job.committed) {
      const bp = store.get(job.blueprintId);
      if (bp) {
        if (job.kind === "personas" && bp.personas.length === 0) bp.personas = seedPersonas();
        if (job.kind === "experiences" && bp.actions.length === 0) bp.actions = seedActions();
      }
      job.committed = true;
    }
    return { jobId: job.jobId, kind: job.kind, done, steps };
  },

  createBlueprint(input: Partial<Blueprint>): Blueprint {
    ensureSeed();
    const bp = makeSeedBlueprint();
    bp.id = newId("CDHBP");
    bp.title = input.objective || bp.title;
    bp.objective = input.objective || bp.objective;
    if (input.orgName) bp.orgName = input.orgName;
    if (input.website) bp.website = input.website;
    if (input.industry) bp.industry = input.industry;
    // A brand-new blueprint starts before generation.
    bp.personas = [];
    bp.actions = [];
    store.set(bp.id, bp);
    return bp;
  },

  updateContext(blueprintId: string, patch: Partial<Blueprint>): Blueprint | undefined {
    const bp = store.get(blueprintId);
    if (!bp) return undefined;
    Object.assign(bp, patch);
    return bp;
  },

  setFocus(blueprintId: string, input: { products?: string[]; outcomes?: Outcome[]; channels?: Channel[]; features?: Feature[] }): Blueprint | undefined {
    const bp = store.get(blueprintId);
    if (!bp) return undefined;
    if (input.products) bp.products = input.products;
    if (input.outcomes) bp.outcomes = input.outcomes;
    if (input.channels) bp.channels = input.channels;
    if (input.features) bp.features = input.features;
    return bp;
  },

  generatePersonas(blueprintId: string): Persona[] {
    const bp = store.get(blueprintId);
    if (!bp) return [];
    if (bp.personas.length === 0) bp.personas = seedPersonas();
    return bp.personas;
  },

  upsertPersona(blueprintId: string, persona: Partial<Persona> & { id?: string }): Persona | undefined {
    const bp = store.get(blueprintId);
    if (!bp) return undefined;
    if (persona.id) {
      const existing = bp.personas.find((p) => p.id === persona.id);
      if (existing) { Object.assign(existing, persona); return existing; }
    }
    const created: Persona = {
      id: newId("persona"),
      name: persona.name || "New Persona",
      description: persona.description || "",
      gender: persona.gender,
      ageBand: persona.ageBand,
      imageUrl: persona.imageUrl || img(persona.name || "persona", 96, 96),
    };
    bp.personas.push(created);
    return created;
  },

  deletePersona(blueprintId: string, personaId: string): boolean {
    const bp = store.get(blueprintId);
    if (!bp) return false;
    const before = bp.personas.length;
    bp.personas = bp.personas.filter((p) => p.id !== personaId);
    return bp.personas.length < before;
  },

  setVoiceEnabled(blueprintId: string, characteristics: Record<string, boolean>): Blueprint | undefined {
    const bp = store.get(blueprintId);
    if (!bp) return undefined;
    for (const c of bp.voice) {
      if (characteristics[c.id] !== undefined) c.enabled = characteristics[c.id];
    }
    return bp;
  },

  generateExperiences(blueprintId: string): Action[] {
    const bp = store.get(blueprintId);
    if (!bp) return [];
    if (bp.actions.length === 0) bp.actions = seedActions();
    return bp.actions;
  },

  getAction(blueprintId: string, actionId: string): Action | undefined {
    return store.get(blueprintId)?.actions.find((a) => a.id === actionId);
  },

  updateTreatment(blueprintId: string, actionId: string, treatment: Partial<Treatment> & { id: string }): Treatment | undefined {
    const action = this.getAction(blueprintId, actionId);
    const existing = action?.treatments.find((tr) => tr.id === treatment.id);
    if (existing) { Object.assign(existing, treatment); return existing; }
    return undefined;
  },

  // "Regenerate": lightweight variation so the UX shows new copy without an LLM round-trip.
  regenerateTreatment(blueprintId: string, actionId: string, treatmentId: string): Treatment | undefined {
    const action = this.getAction(blueprintId, actionId);
    const tr = action?.treatments.find((x) => x.id === treatmentId);
    if (!tr) return undefined;
    const variants = [
      { headline: "Don't miss out — complete your setup", cta: "Claim Offer" },
      { headline: "Built for the way you work", cta: "See What's New" },
      { headline: "A smarter upgrade, just for you", cta: "Explore Now" },
      { headline: "Get more from what you already love", cta: "Upgrade Today" },
    ];
    const v = variants[Math.floor(Math.random() * variants.length)];
    tr.headline = v.headline;
    tr.cta = v.cta;
    tr.imageUrl = img(tr.id + ":" + Date.now());
    return tr;
  },

  addTreatment(blueprintId: string, actionId: string, channel: Channel): Treatment | undefined {
    const action = this.getAction(blueprintId, actionId);
    if (!action) return undefined;
    const created = t(
      `${action.name} — ${channel}`,
      channel,
      "Your next best upgrade",
      `A ${channel} message tailored to this action.`,
      "Learn More",
      action.id + ":" + channel,
    );
    action.treatments.push(created);
    return created;
  },

  summary(blueprintId: string): { actions: number; treatments: number; channels: number } {
    const bp = store.get(blueprintId);
    if (!bp) return { actions: 0, treatments: 0, channels: 0 };
    const treatments = bp.actions.reduce((n, a) => n + a.treatments.length, 0);
    const channels = new Set(bp.actions.flatMap((a) => a.treatments.map((tr) => tr.channel))).size;
    return { actions: bp.actions.length, treatments, channels };
  },

  calculateValue(blueprintId: string, numCustomers: number): { annualValue: number; assumptions: string[] } {
    // Illustrative model only.
    const upliftPerCustomer = 18; // $/yr average ARPU uplift assumption
    const adoption = 0.12;
    const annualValue = Math.round(numCustomers * adoption * upliftPerCustomer);
    return {
      annualValue,
      assumptions: [
        `${Math.round(adoption * 100)}% of customers adopt at least one recommended action`,
        `$${upliftPerCustomer} average annual ARPU uplift per adopting customer`,
        "Illustrative estimate for the POC — not a Pega-validated figure",
      ],
    };
  },
};
