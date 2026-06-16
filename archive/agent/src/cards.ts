// Adaptive Card builders for the Pega Blueprint POC.
//
// Every interactive control uses Action.Execute with an action-level `verb`,
// which the Agents SDK routes to a handler (agent.ts) and whose returned card
// replaces the current one in place — mirroring Pega's live, in-place updates.

import { Blueprint, Action, Persona, OUTCOMES, CHANNELS, pega, publicBaseUrl } from "./pega/store";

type Card = { type: "AdaptiveCard"; [key: string]: any };

const SCHEMA = "http://adaptivecards.io/schemas/adaptive-card.json";
const VERSION = "1.5";

function card(body: any[], actions: any[] = []): Card {
  return { $schema: SCHEMA, type: "AdaptiveCard", version: VERSION, body, ...(actions.length ? { actions } : {}) };
}

// Persistent 1-6 workflow indicator rendered at the top of every phase card.
// This is the Teams/Copilot analog of the iOS app's persistent progress bar:
// because chat has no fixed chrome, the stepper travels inside each card.
// Kept compact (dots + numbers, no per-cell labels) so it never wraps on mobile;
// the phase name is carried by the stepHeader line just below it.
// Each cell is tappable (Action.Execute "gotoStep") so users can jump phases.
const PHASE_NAMES = ["Context", "Setup", "Personas", "Brand", "Experiences", "Summary"];
const PHASE_KEYS = ["context", "setup", "personas", "brand", "experiences", "summary"];
function stepper(active: number, blueprintId: string): any {
  return {
    type: "ColumnSet",
    spacing: "Small",
    columns: PHASE_NAMES.map((nm, i) => ({
      type: "Column",
      width: "stretch",
      verticalContentAlignment: "Center",
      selectAction: {
        type: "Action.Execute",
        verb: "gotoStep",
        title: nm,
        data: { verb: "gotoStep", blueprintId, phase: PHASE_KEYS[i] },
      },
      items: [
        {
          type: "TextBlock",
          text: i < active ? "●" : String(i + 1),
          horizontalAlignment: "Center",
          weight: "Bolder",
          color: i === active ? "Accent" : i < active ? "Good" : "Default",
          isSubtle: i > active,
        },
      ],
    })),
  };
}

const stepHeader = (n: number, name: string): any => ({
  type: "TextBlock", text: `Step ${n} of 6 · ${name}`, size: "Small", weight: "Bolder", color: "Accent", isSubtle: true,
});
const title = (text: string): any => ({ type: "TextBlock", text, size: "Large", weight: "Bolder", wrap: true });
const sub = (text: string): any => ({ type: "TextBlock", text, wrap: true, isSubtle: true, spacing: "None" });
const label = (text: string): any => ({ type: "TextBlock", text, weight: "Bolder", size: "Small", spacing: "Medium" });
const exec = (titleText: string, verb: string, data: Record<string, any> = {}, style?: string): any => ({
  type: "Action.Execute", title: titleText, verb, data: { verb, ...data }, ...(style ? { style } : {}),
});

// ---------------------------------------------------------------------------
// Welcome / Dashboard
// ---------------------------------------------------------------------------

export function dashboardCard(): Card {
  const blueprints = pega.listBlueprints();
  const body: any[] = [
    title("My Customer Engagement Blueprints"),
    sub("Open an existing blueprint or create a new one. You can also just tell me what you want to do."),
  ];
  for (const bp of blueprints) {
    body.push({
      type: "Container",
      separator: true,
      spacing: "Medium",
      selectAction: { type: "Action.Execute", verb: "openBlueprint", data: { verb: "openBlueprint", blueprintId: bp.id } },
      items: [
        { type: "TextBlock", text: bp.title, weight: "Bolder", color: "Accent", wrap: true },
        { type: "TextBlock", text: `${bp.industry}  •  ${bp.id}`, isSubtle: true, size: "Small", spacing: "None" },
      ],
    });
  }
  return card(body, [
    exec("Open", "openBlueprint", { blueprintId: blueprints[0]?.id }, "positive"),
    exec("+ Create a Blueprint", "newBlueprint"),
  ]);
}

// ---------------------------------------------------------------------------
// Step 1 — Context
// ---------------------------------------------------------------------------

export function contextCard(bp: Blueprint): Card {
  return card(
    [
      stepper(0, bp.id),
      stepHeader(1, "Context"),
      title("Let's review your context"),
      sub("What is your business and objective? Edit anything, then confirm."),
      label("Organization name"),
      { type: "Input.Text", id: "orgName", value: bp.orgName },
      label("Organization website"),
      { type: "Input.Text", id: "website", value: bp.website },
      label("Engagement objective"),
      { type: "Input.Text", id: "objective", value: bp.objective },
      label("Objective details for your messaging"),
      { type: "Input.Text", id: "objectiveDetails", isMultiline: true, value: bp.objectiveDetails },
      {
        type: "ColumnSet", spacing: "Small", columns: [
          { type: "Column", width: "stretch", items: [label("Language"), { type: "Input.ChoiceSet", id: "language", value: bp.language, choices: ["English", "Spanish", "French"].map((c) => ({ title: c, value: c })) }] },
          { type: "Column", width: "stretch", items: [label("Location"), { type: "Input.ChoiceSet", id: "location", value: bp.location, choices: ["United States", "United Kingdom", "Australia"].map((c) => ({ title: c, value: c })) }] },
        ],
      },
    ],
    [exec("Confirm & continue", "saveContext", { blueprintId: bp.id }, "positive")],
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Setup (Focus)
// ---------------------------------------------------------------------------

export function setupCard(bp: Blueprint): Card {
  return card(
    [
      stepper(1, bp.id),
      stepHeader(2, "Setup"),
      title("Let's set the focus"),
      sub("Choose outcomes, channels and features. The AI uses these to shape what it generates next."),
      { type: "FactSet", spacing: "Medium", facts: [{ title: "Industry", value: bp.industry }] },
      label("Products and services"),
      { type: "Input.Text", id: "products", value: bp.products.join(", ") },
      label("What outcomes would you like to achieve?"),
      { type: "Input.ChoiceSet", id: "outcomes", isMultiSelect: true, style: "expanded", value: bp.outcomes.join(","), choices: OUTCOMES.map((o) => ({ title: o, value: o })) },
      label("What channels will you communicate on?"),
      { type: "Input.ChoiceSet", id: "channels", isMultiSelect: true, style: "expanded", value: bp.channels.join(","), choices: CHANNELS.map((c) => ({ title: c, value: c })) },
      label("Optional features"),
      { type: "Input.Toggle", id: "featureJourneys", title: "Customer Journeys", value: bp.features.includes("Customer Journeys") ? "true" : "false", valueOn: "true", valueOff: "false" },
      { type: "Input.Toggle", id: "featureDataModel", title: "Data Model", value: bp.features.includes("Data Model") ? "true" : "false", valueOn: "true", valueOff: "false" },
    ],
    [exec("Save focus & generate personas", "setFocus", { blueprintId: bp.id }, "positive")],
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Personas
// ---------------------------------------------------------------------------

function personaEditForm(bp: Blueprint, p?: Persona): any {
  return {
    type: "AdaptiveCard",
    body: [
      label("Name"), { type: "Input.Text", id: "name", value: p?.name ?? "" },
      label("Description"), { type: "Input.Text", id: "description", isMultiline: true, value: p?.description ?? "" },
      {
        type: "ColumnSet", columns: [
          { type: "Column", width: "stretch", items: [label("Gender"), { type: "Input.ChoiceSet", id: "gender", value: p?.gender ?? "Female", choices: ["Female", "Male", "Non-binary"].map((c) => ({ title: c, value: c })) }] },
          { type: "Column", width: "stretch", items: [label("Age band"), { type: "Input.ChoiceSet", id: "ageBand", value: p?.ageBand ?? "Career Builders", choices: ["Gen Z / Students", "Career Builders", "Established"].map((c) => ({ title: c, value: c })) }] },
        ],
      },
    ],
    actions: [exec(p ? "Save persona" : "Add persona", "savePersona", { blueprintId: bp.id, personaId: p?.id }, "positive")],
  };
}

export function personasCard(bp: Blueprint): Card {
  const body: any[] = [stepper(2, bp.id), stepHeader(3, "Personas"), title("Review your customer personas"), sub("Edit, regenerate, remove, or add personas. The agent uses them to tailor experiences.")];
  for (const p of bp.personas) {
    body.push({
      type: "Container", separator: true, spacing: "Medium", items: [
        {
          type: "ColumnSet", columns: [
            { type: "Column", width: "auto", items: [{ type: "Image", url: p.imageUrl, size: "Small", style: "Person", altText: p.name }] },
            { type: "Column", width: "stretch", verticalContentAlignment: "Center", items: [
              { type: "TextBlock", text: p.name, weight: "Bolder", size: "Medium", wrap: true },
              { type: "TextBlock", text: [p.gender, p.ageBand].filter(Boolean).join(" · "), isSubtle: true, size: "Small", spacing: "None" },
            ] },
          ],
        },
        { type: "TextBlock", text: p.description, wrap: true, spacing: "Small", maxLines: 4 },
        { type: "ActionSet", actions: [
          { type: "Action.ShowCard", title: "Edit", card: personaEditForm(bp, p) },
          exec("Regenerate", "regeneratePersona", { blueprintId: bp.id, personaId: p.id }),
          exec("Delete", "deletePersona", { blueprintId: bp.id, personaId: p.id }, "destructive"),
        ] },
      ],
    });
  }
  return card(body, [
    { type: "Action.ShowCard", title: "+ Add persona", card: personaEditForm(bp) },
    exec("Generate more", "generateMorePersonas", { blueprintId: bp.id }),
    exec("Next: Brand →", "gotoBrand", { blueprintId: bp.id }, "positive"),
  ]);
}

// ---------------------------------------------------------------------------
// Step 4 — Brand (Voice)
// ---------------------------------------------------------------------------

export function brandVoiceCard(bp: Blueprint): Card {
  const body: any[] = [stepper(3, bp.id), stepHeader(4, "Brand"), title("Validate your brand voice"), sub("Toggle the voice characteristics the AI applies to every generated message.")];
  for (const v of bp.voice) {
    body.push({
      type: "Container", style: "emphasis", spacing: "Small", items: [
        { type: "Input.Toggle", id: `voice_${v.id}`, title: v.name, value: v.enabled ? "true" : "false", valueOn: "true", valueOff: "false" },
        { type: "TextBlock", text: v.description, wrap: true, isSubtle: true, size: "Small", spacing: "None" },
      ],
    });
  }
  return card(body, [
    exec("Save voice", "saveVoice", { blueprintId: bp.id }, "positive"),
    exec("Preview sample message", "previewTreatment", { blueprintId: bp.id }),
    exec("Next: Experiences →", "generateExperiences", { blueprintId: bp.id }, "positive"),
  ]);
}

// ---------------------------------------------------------------------------
// Step 5 — Experiences
// ---------------------------------------------------------------------------

export function experiencesCard(bp: Blueprint): Card {
  const s = pega.summary(bp.id);
  const statCol = (n: number, lbl: string): any => ({
    type: "Column", width: "stretch", style: "emphasis", items: [
      { type: "TextBlock", text: String(n), size: "ExtraLarge", weight: "Bolder", color: "Accent", horizontalAlignment: "Center" },
      { type: "TextBlock", text: lbl, size: "Small", isSubtle: true, horizontalAlignment: "Center", spacing: "None" },
    ],
  });
  const body: any[] = [
    stepper(4, bp.id),
    stepHeader(5, "Experiences"),
    title("Review your experiences"),
    { type: "ColumnSet", spacing: "Medium", columns: [statCol(s.actions, "Actions"), statCol(s.treatments, "Messages"), statCol(s.channels, "Channels")] },
  ];
  // Group actions by product (mirrors Pega's Product > Objective columns).
  const products = [...new Set(bp.actions.map((a) => a.product))];
  for (const product of products) {
    body.push({ type: "TextBlock", text: product, weight: "Bolder", color: "Accent", spacing: "Medium", separator: true });
    for (const a of bp.actions.filter((x) => x.product === product)) {
      body.push({
        type: "Container", spacing: "Small",
        selectAction: { type: "Action.Execute", verb: "viewAction", data: { verb: "viewAction", blueprintId: bp.id, actionId: a.id } },
        items: [
          {
            type: "ColumnSet", columns: [
              { type: "Column", width: "stretch", items: [
                { type: "TextBlock", text: a.name, weight: "Bolder", wrap: true },
                { type: "TextBlock", text: `${a.objective} · ${a.treatments.length} messages`, isSubtle: true, size: "Small", spacing: "None" },
              ] },
              { type: "Column", width: "auto", verticalContentAlignment: "Center", items: [{ type: "TextBlock", text: "View →", color: "Accent", size: "Small" }] },
            ],
          },
        ],
      });
    }
  }
  return card(body, [exec("Next: Summary →", "gotoSummary", { blueprintId: bp.id }, "positive")]);
}

function treatmentEditForm(bp: Blueprint, actionId: string, tr: any): any {
  return {
    type: "AdaptiveCard",
    body: [
      label("Treatment name"), { type: "Input.Text", id: "name", value: tr.name },
      label("Headline"), { type: "Input.Text", id: "headline", value: tr.headline },
      label("Message body"), { type: "Input.Text", id: "body", isMultiline: true, value: tr.body },
      label("Call to action"), { type: "Input.Text", id: "cta", value: tr.cta },
      label("Marketing principle"),
      { type: "Input.ChoiceSet", id: "marketingPrinciple", value: tr.marketingPrinciple ?? "Value framing", choices: ["Value framing", "Social proof", "Scarcity", "Reciprocity"].map((c) => ({ title: c, value: c })) },
    ],
    actions: [exec("Save changes", "updateTreatment", { blueprintId: bp.id, actionId, treatmentId: tr.id }, "positive")],
  };
}

// Action header card (shown when drilling into an Action). The individual
// treatments are sent as their own cards so each can be edited/regenerated
// in place — a card-per-screen pattern that suits mobile and mirrors the
// iOS app's swipeable treatment mockups.
export function actionHeaderCard(bp: Blueprint, a: Action): Card {
  return card(
    [
      { type: "TextBlock", text: a.name, size: "Large", weight: "Bolder", wrap: true },
      { type: "TextBlock", text: `${a.product} · ${a.objective} · ${a.treatments.length} messages`, isSubtle: true, size: "Small", spacing: "None" },
      { type: "TextBlock", text: a.description, wrap: true, spacing: "Small" },
    ],
    [
      exec("+ Add SMS treatment", "addTreatment", { blueprintId: bp.id, actionId: a.id, channel: "SMS" }),
      exec("← Back to experiences", "gotoExperiences", { blueprintId: bp.id }),
    ],
  );
}

// A single treatment rendered as a channel message mockup.
export function treatmentCard(bp: Blueprint, actionId: string, tr: any): Card {
  return card([
    { type: "TextBlock", text: `${tr.name}  ·  ${tr.channel}`, weight: "Bolder", size: "Small", wrap: true, color: "Accent" },
    { type: "Image", url: tr.imageUrl, size: "Stretch", altText: tr.headline, spacing: "Small" },
    { type: "TextBlock", text: tr.headline, size: "Medium", weight: "Bolder", wrap: true, spacing: "Small" },
    { type: "TextBlock", text: tr.body, wrap: true, spacing: "Small" },
    { type: "TextBlock", text: `▶ ${tr.cta}`, color: "Accent", weight: "Bolder", spacing: "Small" },
  ], [
    { type: "Action.ShowCard", title: "Edit", card: treatmentEditForm(bp, actionId, tr) },
    exec("Regenerate", "regenerateTreatment", { blueprintId: bp.id, actionId, treatmentId: tr.id }),
  ]);
}

// ---------------------------------------------------------------------------
// Step 6 — Summary
// ---------------------------------------------------------------------------

export function summaryCard(bp: Blueprint): Card {
  const s = pega.summary(bp.id);
  const statCol = (n: number, lbl: string): any => ({
    type: "Column", width: "stretch", style: "emphasis", items: [
      { type: "TextBlock", text: String(n), size: "ExtraLarge", weight: "Bolder", color: "Accent", horizontalAlignment: "Center" },
      { type: "TextBlock", text: lbl, size: "Small", isSubtle: true, horizontalAlignment: "Center", spacing: "None" },
    ],
  });
  return card(
    [
      stepper(5, bp.id),
      stepHeader(6, "Summary"),
      title(bp.title),
      { type: "TextBlock", text: `${bp.industry} · ${bp.id}`, isSubtle: true, size: "Small", spacing: "None" },
      { type: "ColumnSet", spacing: "Medium", columns: [statCol(s.actions, "Actions"), statCol(s.treatments, "Messages"), statCol(s.channels, "Channels")] },
      label("Who is this for?"),
      { type: "FactSet", facts: [
        { title: "Organization", value: bp.orgName },
        { title: "Website", value: bp.website },
        { title: "Industry", value: bp.industry },
        { title: "Outcomes", value: bp.outcomes.join(", ") || "—" },
        { title: "Channels", value: bp.channels.join(", ") || "—" },
      ] },
      label("Potential value of Pega Customer Decision Hub"),
      sub("How many customers does your organization have?"),
      { type: "Input.Number", id: "numCustomers", value: 10000000, min: 0 },
    ],
    [
      exec("Calculate value", "calculateValue", { blueprintId: bp.id }),
      { type: "Action.OpenUrl", title: "Download PDF", url: `${publicBaseUrl()}/api/export/${bp.id}/pdf` },
      { type: "Action.OpenUrl", title: "Download Excel", url: `${publicBaseUrl()}/api/export/${bp.id}/excel` },
      {
        type: "Action.ShowCard", title: "Share", card: {
          type: "AdaptiveCard",
          body: [label("Share with (comma-separated emails)"), { type: "Input.Text", id: "recipients", placeholder: "maria@contoso.com" }],
          actions: [exec("Send", "shareBlueprint", { blueprintId: bp.id }, "positive")],
        },
      },
    ],
  );
}

export function attachment(c: any) {
  return c;
}
