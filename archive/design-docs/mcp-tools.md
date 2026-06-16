# Pega MCP Server — Tool Surface

The custom agent never stores blueprint data itself. It calls a **Pega MCP server** that wraps
the Customer Engagement Blueprint backend. Below is the proposed tool surface, derived from the
live app's observed capabilities. Types are shown in TypeScript-ish notation for clarity.

> For the POC, this server can return **fixtures** (the data captured during research:
> blueprint `CDHBP-335041`, 5 personas, 9 actions / 18 treatments) and later swap to real Pega APIs.

## Shared types

```ts
type Outcome = "Acquire" | "Grow" | "Nurture" | "Onboard"
             | "Resilience & Collections" | "Retain" | "Service";

type Channel = "Agent Assisted" | "Call Center" | "Email" | "IVR" | "Mobile"
             | "Paid Media" | "Push Notifications" | "SMS" | "Web";

type Feature = "Customer Journeys" | "Data Model";

interface Blueprint {
  id: string;            // e.g. "CDHBP-335041"
  title: string;         // "Increase ARPU/ARPA / Maximize customer lifetime value"
  industry: string;      // "Communications"
  context: Context;
  setup: Setup;
  personas: Persona[];
  brand: Brand;
  actions: Action[];
}

interface Context {
  orgName: string; website: string; objective: string;
  objectiveDetails: string; language: string; location: string;
}
interface Setup {
  industry: string; products: string[]; outcomes: Outcome[];
  channels: Channel[]; features: Feature[];
}
interface Persona {
  id: string; name: string; description: string;
  gender?: string; ageBand?: string; imageUrl?: string;
}
interface VoiceCharacteristic { id: string; name: string; bullets: string[]; enabled: boolean; }
interface Brand {
  voice: VoiceCharacteristic[];
  logoUrl?: string; headerColor?: string; backgroundColor?: string; footerColor?: string;
}
interface Action {
  id: string; name: string; description: string;
  product: string; objective: Outcome; treatments: Treatment[];
}
interface Treatment {
  id: string; name: string; channel: Channel;
  headline: string; body: string; cta: string;
  imageUrl?: string; marketingPrinciple?: string;
}
interface Job { jobId: string; kind: "personas" | "experiences"; steps: JobStep[]; done: boolean; }
interface JobStep { agent: string; label: string; status: "pending" | "running" | "completed"; }
```

## Blueprints

```ts
list_blueprints(): { id: string; title: string; industry: string }[]
create_blueprint(input: {
  objective: string; industry?: string; orgName?: string; website?: string;
}): { blueprintId: string; context: Context }
get_blueprint(blueprintId: string): Blueprint
delete_blueprint(blueprintId: string): { ok: boolean }
```

## Context & Setup

```ts
update_context(blueprintId: string, patch: Partial<Context>): Context
set_focus(blueprintId: string, input: {
  industry?: string; products?: string[];
  outcomes?: Outcome[]; channels?: Channel[]; features?: Feature[];
}): Setup
```

## Personas

```ts
generate_personas(blueprintId: string): { jobId: string }          // async
list_personas(blueprintId: string): Persona[]
upsert_persona(blueprintId: string, persona: Partial<Persona> & { id?: string }): Persona
delete_persona(blueprintId: string, personaId: string): { ok: boolean }
generate_more_personas(blueprintId: string, count?: number): { jobId: string }
```

## Brand

```ts
get_brand(blueprintId: string): Brand
update_voice(blueprintId: string, characteristics: VoiceCharacteristic[]): Brand
update_visual_identity(blueprintId: string, input: {
  logoUrl?: string; headerColor?: string; backgroundColor?: string; footerColor?: string;
}): Brand
preview_treatment(blueprintId: string, personaId: string): Treatment  // live sample
```

## Experiences (Actions & Treatments)

```ts
generate_experiences(blueprintId: string): { jobId: string }         // async, 5-step pipeline
list_actions(blueprintId: string, filter?: { product?: string; objective?: Outcome }): Action[]
get_action(blueprintId: string, actionId: string): Action
upsert_action(blueprintId: string, action: Partial<Action> & { id?: string }): Action
delete_action(blueprintId: string, actionId: string): { ok: boolean }

list_treatments(blueprintId: string, actionId: string): Treatment[]
generate_treatment(blueprintId: string, actionId: string, input: {
  channel: Channel; marketingPrinciple?: string;
}): Treatment
update_treatment(blueprintId: string, actionId: string, treatment: Partial<Treatment> & { id: string }): Treatment
delete_treatment(blueprintId: string, actionId: string, treatmentId: string): { ok: boolean }
```

## Summary

```ts
get_summary(blueprintId: string): {
  counts: { actions: number; treatments: number; channels: number };
  context: Context; setup: Setup; personas: Persona[];
}
export_blueprint(blueprintId: string, format: "pdf" | "excel" | "blueprint"): { url: string }
share_blueprint(blueprintId: string, recipients: string[]): { ok: boolean }
calculate_value(blueprintId: string, numCustomers: number): {
  annualValue: number; assumptions: string[];
}
```

## Jobs (async progress)

```ts
get_job_status(jobId: string): Job
```

Example `get_job_status` payload during Experiences generation (drives the progress card):

```json
{
  "jobId": "job_exp_8842",
  "kind": "experiences",
  "done": false,
  "steps": [
    { "agent": "Strategy Agent",   "label": "Outline Action Strategy",      "status": "completed" },
    { "agent": "Marketing Analyst","label": "Establishing Marketing Plan",  "status": "running"   },
    { "agent": "Creative Agent",   "label": "Imagining New Copy & Image",   "status": "pending"   },
    { "agent": "Brand Agent",      "label": "Critiquing New Actions",       "status": "pending"   },
    { "agent": "Creative Agent",   "label": "Updating Actions",             "status": "pending"   }
  ]
}
```

## Intent → tool routing (chat *and* card actions share these)

| User intent (chat or card) | Tool(s) |
|----------------------------|---------|
| "Create a blueprint for …" | `create_blueprint` → `get_blueprint` |
| Edit a Context field | `update_context` |
| "Only Grow + Mobile" | `set_focus` |
| "Generate personas" | `generate_personas` + poll `get_job_status` → `list_personas` |
| "Add a persona for …" / edit / remove | `upsert_persona` / `delete_persona` |
| Toggle a voice trait | `update_voice` |
| "Generate the experiences" | `generate_experiences` + poll → `list_actions` |
| "Show treatments for X" | `get_action` / `list_treatments` |
| "Rewrite/regenerate this message …" | `generate_treatment` or `update_treatment` |
| "Export PDF" / "Share with …" | `export_blueprint` / `share_blueprint` |
| "What's the value for N customers?" | `calculate_value` |
