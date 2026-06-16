# Conversation Flows (NLP ⇆ Adaptive Cards)

Scripted end-to-end dialogs showing how natural language and card actions drive the same
backend tools. `→` = agent renders a card; `⚙` = MCP tool call.

---

## Flow A — Create a blueprint from scratch (happy path)

**User:** Create a blueprint to increase ARPU for a telecom called Microsoft (microsoft.com).

⚙ `create_blueprint({ objective:"Increase ARPU/ARPA / Maximize customer lifetime value", industry:"Communications", orgName:"Microsoft", website:"microsoft.com" })`
→ **Context card** (prefilled) — *"Here's your starting context. Edit anything, or say 'looks good'."*

**User:** (in card) changes Location → United States, taps **Confirm**.

⚙ `update_context(id, { location:"United States" })`
→ **Focus card** — *"What should we focus on?"* (Outcomes, Channels, Features multi-selects)

**User:** Just Grow and Retain, and only Mobile and Email. Turn on Customer Journeys.

⚙ `set_focus(id, { outcomes:["Grow","Retain"], channels:["Mobile","Email"], features:["Customer Journeys"] })`
→ chip: **Generate personas** / **Not yet**

**User:** Generate personas.

⚙ `generate_personas(id)` → `{ jobId }`
→ **Progress card**: *Marketing Analyst — Identifying audience needs … Creating personas …*
(updates in place to ✓✓)
⚙ `list_personas(id)`
→ **5 persona cards** (Connected Chloe, Upgrading Ulysses, Aspirational Aaliyah, Cautious Carlos, Independent Indigo) + **Generate more** chip.

---

## Flow B — Edit personas conversationally

**User:** Add a persona for budget-conscious college students.

⚙ `upsert_persona(id, { name:"Independent Indigo", description:"early-20s, budget-conscious, mobile-first…" })`
→ new **persona card** appended.

**User:** Make Chloe a bit younger and emphasize family security.

⚙ `upsert_persona(id, { id:"chloe", ageBand:"Career Builders", description:"…stronger emphasis on family security…" })`
→ Chloe's **persona card** updates in place (Universal Action refresh).

**User:** Remove Carlos.

⚙ `delete_persona(id, "carlos")` → card collapses with *"Removed Cautious Carlos."*

---

## Flow C — Brand voice + live preview

**User:** Next.

→ **Brand voice card** (toggles: Value-Led ✓, Plainspoken Precision ✓, Life-Aware ✓, Guided Confidence ✓) + **sample treatment preview** card.

**User:** Turn off "Guided Confidence" and add one called "Playful".

⚙ `update_voice(id, [...])`
→ voice card updates; ⚙ `preview_treatment(id, "chloe")` → **preview message card** refreshes to reflect the new tone.

---

## Flow D — Experiences: generate, browse, regenerate (core)

**User:** Generate the experiences.

⚙ `generate_experiences(id)` → `{ jobId }`
→ **Progress card** with 5 pipeline steps:
   Strategy Agent → Marketing Analyst → Creative Agent → Brand Agent → Creative Agent
   (each flips pending → running → ✓)
⚙ `list_actions(id)`
→ **Stats card**: *9 Actions · 18 Messages · 1 Channel* + **Action carousel** grouped by
   Product → Objective (Device Purchase/Grow, Mobile Plans/Grow, …).

**User:** Show the treatments for the Surface Pro Accessory Bundle.

⚙ `get_action(id, "surface-pro-accessory-bundle")`
→ two **message cards**:
   1. *Pro Setup Upgrade* — "Complete your Surface Pro" / "Shop Pro Bundle"
   2. *Surface Pro Boost* — "Built for Surface Pro" / "Upgrade Pro Today"

**User:** The first headline is too long — make it punchier and regenerate with a scarcity angle.

⚙ `update_treatment(id, actionId, { id:"t1", headline:"Finish your Pro setup" })`
   *or* ⚙ `generate_treatment(id, actionId, { channel:"Mobile", marketingPrinciple:"Scarcity" })`
→ message card #1 refreshes **in place** (new headline/body/image), no new message posted.

**User:** Add an SMS treatment for this action.

⚙ `generate_treatment(id, actionId, { channel:"SMS" })`
→ new **message card** (SMS variant) appended.

---

## Flow E — Summary, export, value

**User:** I'm done — summarize and export as PDF.

⚙ `get_summary(id)` → **Summary card** (counts + Context/Setup/Personas recap + buttons)
⚙ `export_blueprint(id, "pdf")` → *"Here's your PDF"* with download link.

**User:** What's the potential value if we have 5 million customers?

⚙ `calculate_value(id, 5_000_000)` → *"Estimated additional annual value: $… (assumptions: …)"*

**User:** Share it with maria@contoso.com.

⚙ `share_blueprint(id, ["maria@contoso.com"])` → *"Shared ✓"*

---

## Mixed control note

Every card button has an NLP twin and vice-versa. Implementation-wise both the
`Action.Execute`/`Action.Submit` payloads **and** parsed chat intents resolve to the same
handler keyed by `verb` (e.g. `regenerateTreatment`, `setFocus`, `addPersona`), so behavior is
identical regardless of entry point.
