# Adaptive Card samples

Drop-in samples that demonstrate the UI for each phase. Test any of them by pasting the JSON
into the **Adaptive Cards Designer**: https://adaptivecards.io/designer (target host: Microsoft Teams).

| File | Phase | What it shows |
|------|-------|---------------|
| [01-dashboard.json](01-dashboard.json) | Entry | "My Blueprints" list + Create |
| [02-context-form.json](02-context-form.json) | 1 · Context | Org, objective, language, location form |
| [03-setup-focus.json](03-setup-focus.json) | 2 · Setup | Outcomes/channels multi-select + feature toggles |
| [04-persona.json](04-persona.json) | 3 · Personas | Persona card + inline Edit / Regenerate / Delete |
| [05-brand-voice.json](05-brand-voice.json) | 4 · Brand | Voice characteristic toggles |
| [06-treatment-message.json](06-treatment-message.json) | 5 · Experiences | The marketing message (treatment) card + inline editor |
| [07-generation-progress.json](07-generation-progress.json) | 5 · Experiences | Live multi-agent generation status |
| [08-summary.json](08-summary.json) | 6 · Summary | Stats, export, share, value calculator |

## Action conventions

- **`Action.Submit`** — form submits (Context, Setup, Share). Payload carries a `verb` + ids.
- **`Action.Execute`** (Universal Action) — server-handled actions that **refresh the card in
  place** (Regenerate persona/treatment, Calculate value, Export). Requires a bot/agent backend.
- **`Action.ShowCard`** — inline edit forms (persona edit, treatment edit) without leaving the thread.

The same `verb`s are produced by chat intents, so the planner routes chat and card actions
through one set of handlers (see [../docs/conversation-flows.md](../docs/conversation-flows.md)).

## Notes
- Images use placeholder URLs (`picsum.photos`); the real agent binds Pega-generated image URLs.
- `Input.Toggle` is used for voice characteristics and optional features to mirror Pega's on/off cards.
- For production, render these via **Adaptive Cards Templating** with data binding instead of hard-coded values.
