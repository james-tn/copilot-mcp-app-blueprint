# Pega Blueprint → Teams/Copilot Agent (POC)

A concept and design POC that recreates the **Pega Customer Engagement Blueprint**
experience as a **custom agent for Microsoft Teams / Microsoft 365 Copilot**, where:

- **Chat** is the natural-language (NLP) surface to drive the whole flow, and
- **Adaptive Cards** are the interactive UI (forms, persona cards, message previews, progress, summary).

The agent talks to the Pega backend through an **MCP server**, so the same data and
generation capabilities power both the official web UI and this conversational experience.

> Goal: same functionality as the Pega web app, a **simpler** UX that lives inside Teams/Copilot.

## What's inside

| Path | Purpose |
|------|---------|
| [docs/DESIGN.md](docs/DESIGN.md) | The full design: concept, architecture, UX mapping, phase-by-phase flows, build plan |
| [docs/mcp-tools.md](docs/mcp-tools.md) | The Pega MCP server tool surface the agent calls |
| [docs/conversation-flows.md](docs/conversation-flows.md) | Example NLP dialogs mapped to cards + tool calls |
| [cards/](cards/) | Ready-to-test Adaptive Card JSON samples (paste into https://adaptivecards.io/designer) |

## The 6 phases (mirrors Pega)

1. **Context** — business, objective, language, location
2. **Setup** — industry, products, outcomes, channels, optional features
3. **Personas** — AI-generated audience personas
4. **Brand** — brand voice characteristics + visual identity
5. **Experiences** — Actions (offers) → Treatments (channel messages)
6. **Summary** — review, export, share, value calculator

## Key idea

Every place the Pega web app shows a *panel, form, or card on the right* becomes an
**Adaptive Card** in the chat thread. Every place it shows the *left-hand AI Assistant*
becomes the **normal Teams/Copilot chat** with the agent. Long-running, multi-agent
generation (Strategy → Marketing Analyst → Creative → Brand agents) is surfaced as a
**live-updating progress card**.

See [docs/DESIGN.md](docs/DESIGN.md) to start.
