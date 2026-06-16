import { ActivityTypes } from "@microsoft/agents-activity";
import {
  AgentApplication,
  MemoryStorage,
  TurnContext,
  CardFactory,
  MessageFactory,
  StreamingResponse,
} from "@microsoft/agents-hosting";

import { pega, Blueprint, Channel, Outcome } from "./pega/store";
import * as C from "./cards";
import { classifyIntent } from "./nlp";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const storage = new MemoryStorage();
export const agentApp = new AgentApplication({ storage });

// Track the "current" blueprint per conversation (single-process POC store).
const currentByConversation = new Map<string, string>();
function convId(context: TurnContext): string {
  return context.activity?.conversation?.id ?? "default";
}
function setCurrent(context: TurnContext, blueprintId: string) {
  currentByConversation.set(convId(context), blueprintId);
}
function resolveBp(context: TurnContext, explicitId?: string): Blueprint | undefined {
  const id = explicitId || currentByConversation.get(convId(context)) || pega.listBlueprints()[0]?.id;
  if (id) {
    const bp = pega.get(id);
    if (bp) setCurrent(context, bp.id);
    return bp;
  }
  return undefined;
}

function asAttachment(card: Record<string, any>) {
  return MessageFactory.attachment(CardFactory.adaptiveCard(card));
}
function chipActions(titles: string[]) {
  return titles.map((t) => ({ type: "imBack", title: t, value: t }));
}
async function sendCard(context: TurnContext, card: Record<string, any>, chips?: string[]) {
  const activity = asAttachment(card);
  if (chips && chips.length) (activity as any).suggestedActions = { actions: chipActions(chips), to: [] };
  await context.sendActivity(activity);
}
async function sendChips(context: TurnContext, text: string, chips: string[]) {
  await context.sendActivity(MessageFactory.suggestedActions(chipActions(chips), text));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Drives the REAL backend job: starts an async generation job and polls
// get_job_status(), emitting a live update as each named agent transitions to
// "running". On Teams these animate in one evolving bubble; on non-streaming
// channels it resolves to a single final card. Labels/timing come from the
// backend job status, not a hardcoded client sequence.
async function streamJob(
  context: TurnContext,
  blueprintId: string,
  kind: "personas" | "experiences",
  kindLabel: string,
  buildFinalCard: () => Record<string, any>,
  attachResult: boolean,
): Promise<void> {
  let stream: StreamingResponse | undefined;
  try {
    const { jobId } = pega.startJob(blueprintId, kind);
    stream = new StreamingResponse(context);
    stream.setGeneratedByAILabel(true);
    stream.queueInformativeUpdate(`Generating your ${kindLabel.toLowerCase()}…`);

    const seen = new Set<string>();
    const startedAt = Date.now();
    let iterations = 0;
    for (;;) {
      const status = pega.getJobStatus(jobId);
      if (!status) break;
      for (const s of status.steps) {
        const key = `${s.agent}|${s.label}`;
        if (s.status !== "pending" && !seen.has(key)) {
          seen.add(key);
          stream.queueInformativeUpdate(`${s.agent} — ${s.label}…`);
        }
      }
      if (status.done) break;
      if (Date.now() - startedAt > 15000) break;
      await sleep(350);
      iterations++;
      // Non-streaming channel: no live updates render, so don't sit and wait.
      if (iterations === 1 && !stream.isStreamingChannel) break;
    }

    // Guarantee artifacts are committed even if timing was cut short.
    if (kind === "personas") pega.generatePersonas(blueprintId);
    else pega.generateExperiences(blueprintId);

    if (attachResult) {
      stream.setAttachments([CardFactory.adaptiveCard(buildFinalCard())]);
    } else {
      stream.queueTextChunk(`✓ Your ${kindLabel.toLowerCase()} are ready.`);
    }
    await stream.endStream();
  } catch (err) {
    console.error("streamJob failed; falling back to single card", err);
    if (kind === "personas") pega.generatePersonas(blueprintId);
    else pega.generateExperiences(blueprintId);
    try { if (stream) await stream.endStream(); } catch { /* already ended */ }
    if (attachResult) await sendCard(context, buildFinalCard());
  }
}

const HELP =
  "I'm your **Customer Engagement Blueprint** assistant. I can help you design 1:1 customer engagement, step by step:\n\n" +
  "1. **Context** · 2. **Setup** · 3. **Personas** · 4. **Brand** · 5. **Experiences** · 6. **Summary**\n\n" +
  "Try: *“open my blueprint”*, *“go to personas”*, *“add a persona for budget students”*, " +
  "*“generate the experiences”*, or *“what's the value for 5 million customers?”* " +
  "You can also use the buttons on each card.";

// ---------------------------------------------------------------------------
// Welcome
// ---------------------------------------------------------------------------

agentApp.onConversationUpdate("membersAdded", async (context: TurnContext) => {
  await sendChips(
    context,
    "👋 Welcome to the **Pega-style Customer Engagement Blueprint** agent. Use chat or the cards — both do the same thing.",
    ["Open my blueprint", "Create a blueprint"],
  );
  await sendCard(context, C.dashboardCard());
});

// ---------------------------------------------------------------------------
// Free-text NLP routing
// ---------------------------------------------------------------------------

agentApp.onActivity(ActivityTypes.Message, async (context: TurnContext) => {
  const text = (context.activity.text || "").trim();
  // Card actions arrive as invokes handled below; ignore empty-text value posts.
  if (!text) return;

  const { intent, args } = await classifyIntent(text);

  switch (intent) {
    case "dashboard":
      await sendCard(context, C.dashboardCard());
      return;

    case "create_blueprint": {
      const bp = pega.createBlueprint({
        objective: args.objective,
        orgName: args.orgName,
        website: args.website,
        industry: args.industry,
      });
      setCurrent(context, bp.id);
      await context.sendActivity(`Created **${bp.title}** (${bp.id}). Let's review the context.`);
      await sendCard(context, C.contextCard(bp));
      return;
    }

    case "open_blueprint": {
      const bp = resolveBp(context, args.blueprintId);
      if (bp) await sendCard(context, phaseCard(bp, latestPhase(bp)));
      else await sendCard(context, C.dashboardCard());
      return;
    }

    case "goto_phase": {
      const bp = resolveBp(context);
      if (!bp) { await sendCard(context, C.dashboardCard()); return; }
      await sendCard(context, phaseCard(bp, String(args.phase || "context")));
      return;
    }

    case "generate_personas": {
      const bp = resolveBp(context);
      if (!bp) { await sendCard(context, C.dashboardCard()); return; }
      await streamJob(context, bp.id, "personas", "Personas", () => C.personasCard(pega.get(bp.id)!), true);
      return;
    }

    case "add_persona": {
      const bp = resolveBp(context);
      if (!bp) { await sendCard(context, C.dashboardCard()); return; }
      if (args.name || args.description) {
        pega.upsertPersona(bp.id, { name: args.name, description: args.description });
      }
      await sendCard(context, C.personasCard(bp));
      return;
    }

    case "generate_experiences": {
      const bp = resolveBp(context);
      if (!bp) { await sendCard(context, C.dashboardCard()); return; }
      await streamJob(context, bp.id, "experiences", "Experiences", () => C.experiencesCard(pega.get(bp.id)!), true);
      return;
    }

    case "calculate_value": {
      const bp = resolveBp(context);
      if (!bp) { await sendCard(context, C.dashboardCard()); return; }
      const n = Number(args.numCustomers) || 10000000;
      const { annualValue, assumptions } = pega.calculateValue(bp.id, n);
      await context.sendActivity(
        `**Estimated additional annual value:** $${annualValue.toLocaleString()} for ${n.toLocaleString()} customers.\n\n` +
          assumptions.map((a) => `- ${a}`).join("\n"),
      );
      return;
    }

    case "smalltalk":
      await context.sendActivity(String(args.reply || HELP));
      return;

    case "help":
    default:
      await context.sendActivity(HELP);
      await sendCard(context, C.dashboardCard());
      return;
  }
});

function phaseCard(bp: Blueprint, phase: string): { type: "AdaptiveCard"; [key: string]: any } {
  switch (phase) {
    case "setup": return C.setupCard(bp);
    case "personas": pega.generatePersonas(bp.id); return C.personasCard(bp);
    case "brand": return C.brandVoiceCard(bp);
    case "experiences": pega.generateExperiences(bp.id); return C.experiencesCard(bp);
    case "summary": return C.summaryCard(bp);
    case "context":
    default: return C.contextCard(bp);
  }
}

// Resume an existing blueprint at the furthest phase it has data for, so opening
// a generated blueprint shows what you built instead of resetting to Context.
function latestPhase(bp: Blueprint): string {
  if (bp.actions.length > 0) return "experiences";
  if (bp.personas.length > 0) return "personas";
  return "context";
}

// ---------------------------------------------------------------------------
// Adaptive Card actions (Action.Execute) — returned card replaces in place
// ---------------------------------------------------------------------------

type ExecData = { verb: string; data?: Record<string, any> };
const d = (action: ExecData) => action?.data ?? {};

agentApp.adaptiveCards.actionExecute("openBlueprint", async (context, _state, action: ExecData) => {
  const bp = resolveBp(context, d(action).blueprintId);
  return bp ? phaseCard(bp, latestPhase(bp)) : C.dashboardCard();
});

// Tappable stepper: jump directly to any phase.
agentApp.adaptiveCards.actionExecute("gotoStep", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  return bp ? phaseCard(bp, String(f.phase || "context")) : C.dashboardCard();
});

agentApp.adaptiveCards.actionExecute("newBlueprint", async (context) => {
  const bp = pega.createBlueprint({});
  setCurrent(context, bp.id);
  return C.contextCard(bp);
});

agentApp.adaptiveCards.actionExecute("saveContext", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  pega.updateContext(bp.id, {
    orgName: f.orgName, website: f.website, objective: f.objective,
    objectiveDetails: f.objectiveDetails, language: f.language, location: f.location,
  });
  return C.setupCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("setFocus", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const features: ("Customer Journeys" | "Data Model")[] = [];
  if (f.featureJourneys === "true") features.push("Customer Journeys");
  if (f.featureDataModel === "true") features.push("Data Model");
  pega.setFocus(bp.id, {
    products: splitList(f.products),
    outcomes: splitList(f.outcomes) as Outcome[],
    channels: splitList(f.channels) as Channel[],
    features,
  });
  await streamJob(context, bp.id, "personas", "Personas", () => C.personasCard(pega.get(bp.id)!), false);
  return C.personasCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("savePersona", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  pega.upsertPersona(bp.id, {
    id: f.personaId, name: f.name, description: f.description, gender: f.gender, ageBand: f.ageBand,
  });
  return C.personasCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("regeneratePersona", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const p = bp.personas.find((x) => x.id === f.personaId);
  if (p) pega.upsertPersona(bp.id, { id: p.id, imageUrl: `https://picsum.photos/seed/${encodeURIComponent(p.id + ":" + Date.now())}/96/96` });
  return C.personasCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("deletePersona", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  pega.deletePersona(bp.id, f.personaId);
  return C.personasCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("generateMorePersonas", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  pega.upsertPersona(bp.id, {
    name: "Value Seeker Val",
    gender: "Non-binary",
    ageBand: "Career Builders",
    description: "Price-sensitive, deal-driven customer who compares offers carefully and responds to clear savings, bundles, and limited-time value.",
  });
  return C.personasCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("gotoBrand", async (context, _state, action: ExecData) => {
  const bp = resolveBp(context, d(action).blueprintId);
  return bp ? C.brandVoiceCard(bp) : C.dashboardCard();
});

agentApp.adaptiveCards.actionExecute("saveVoice", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const toggles: Record<string, boolean> = {};
  for (const v of bp.voice) toggles[v.id] = f[`voice_${v.id}`] === "true";
  pega.setVoiceEnabled(bp.id, toggles);
  return C.brandVoiceCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("previewTreatment", async (context, _state, action: ExecData) => {
  const bp = resolveBp(context, d(action).blueprintId);
  if (!bp) return C.dashboardCard();
  await sendCard(context, previewCard(bp));
  return C.brandVoiceCard(bp);
});

agentApp.adaptiveCards.actionExecute("generateExperiences", async (context, _state, action: ExecData) => {
  const bp = resolveBp(context, d(action).blueprintId);
  if (!bp) return C.dashboardCard();
  await streamJob(context, bp.id, "experiences", "Experiences", () => C.experiencesCard(pega.get(bp.id)!), false);
  return C.experiencesCard(pega.get(bp.id)!);
});

agentApp.adaptiveCards.actionExecute("gotoExperiences", async (context, _state, action: ExecData) => {
  const bp = resolveBp(context, d(action).blueprintId);
  return bp ? C.experiencesCard(bp) : C.dashboardCard();
});

agentApp.adaptiveCards.actionExecute("viewAction", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  const a = bp && pega.getAction(bp.id, f.actionId);
  if (!bp || !a) return C.dashboardCard();
  // Drill in: post the action header + one card per treatment (each editable in
  // place), and leave the experiences list where it is.
  await sendCard(context, C.actionHeaderCard(bp, a));
  for (const tr of a.treatments) await sendCard(context, C.treatmentCard(bp, a.id, tr));
  return C.experiencesCard(bp);
});

agentApp.adaptiveCards.actionExecute("updateTreatment", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const tr = pega.updateTreatment(bp.id, f.actionId, {
    id: f.treatmentId, name: f.name, headline: f.headline, body: f.body, cta: f.cta, marketingPrinciple: f.marketingPrinciple,
  });
  return tr ? C.treatmentCard(bp, f.actionId, tr) : C.experiencesCard(bp);
});

agentApp.adaptiveCards.actionExecute("regenerateTreatment", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const tr = pega.regenerateTreatment(bp.id, f.actionId, f.treatmentId);
  return tr ? C.treatmentCard(bp, f.actionId, tr) : C.experiencesCard(bp);
});

agentApp.adaptiveCards.actionExecute("addTreatment", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const tr = pega.addTreatment(bp.id, f.actionId, (f.channel as Channel) || "SMS");
  if (tr) await sendCard(context, C.treatmentCard(bp, f.actionId, tr));
  const a = pega.getAction(bp.id, f.actionId);
  return a ? C.actionHeaderCard(bp, a) : C.experiencesCard(bp);
});

agentApp.adaptiveCards.actionExecute("gotoSummary", async (context, _state, action: ExecData) => {
  const bp = resolveBp(context, d(action).blueprintId);
  return bp ? C.summaryCard(bp) : C.dashboardCard();
});

agentApp.adaptiveCards.actionExecute("calculateValue", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const n = Number(f.numCustomers) || 10000000;
  const { annualValue, assumptions } = pega.calculateValue(bp.id, n);
  await context.sendActivity(
    `**Estimated additional annual value:** $${annualValue.toLocaleString()} for ${n.toLocaleString()} customers.\n\n` +
      assumptions.map((a) => `- ${a}`).join("\n"),
  );
  return C.summaryCard(bp);
});

agentApp.adaptiveCards.actionExecute("exportBlueprint", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  await context.sendActivity(`📄 Your **${String(f.format || "pdf").toUpperCase()}** export of *${bp.title}* is ready (demo link): https://example.com/${bp.id}.${f.format || "pdf"}`);
  return C.summaryCard(bp);
});

agentApp.adaptiveCards.actionExecute("shareBlueprint", async (context, _state, action: ExecData) => {
  const f = d(action);
  const bp = resolveBp(context, f.blueprintId);
  if (!bp) return C.dashboardCard();
  const recipients = String(f.recipients || "").trim();
  await context.sendActivity(recipients ? `✅ Shared *${bp.title}* with ${recipients}.` : "Add at least one email to share.");
  return C.summaryCard(bp);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitList(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function previewCard(bp: Blueprint): Record<string, any> {
  const persona = bp.personas[0];
  const enabled = bp.voice.filter((v) => v.enabled).map((v) => v.name).join(", ") || "default";
  return {
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: "Sample message preview", size: "Small", weight: "Bolder", color: "Accent" },
      { type: "Image", url: "https://picsum.photos/seed/preview/600/280", size: "Stretch", altText: "Sample" },
      { type: "TextBlock", text: "A smarter mobile plan, recommended by experts", size: "Large", weight: "Bolder", wrap: true },
      { type: "TextBlock", text: `Hi ${persona ? persona.name.split(" ").slice(-1)[0] : "there"},`, wrap: true, spacing: "Small" },
      { type: "TextBlock", text: `When work, streaming, and everyday sharing happen across all your devices, the right plan matters. ${bp.orgName} recommends plans built for real daily use, with dependable coverage and clear value.`, wrap: true },
      { type: "TextBlock", text: `▶ See Plans`, color: "Accent", weight: "Bolder", spacing: "Small" },
      { type: "TextBlock", text: `Voice applied: ${enabled}`, isSubtle: true, size: "Small", wrap: true, spacing: "Medium" },
    ],
  };
}
