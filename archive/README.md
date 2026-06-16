# Archived — Adaptive Cards / Custom Engine Agent (v1)

> **This folder is archived and not maintained.** It is kept for reference only.
> The active project is the **MCP App** at the repository root — see the
> top-level [README](../README.md).

This was the first approach: recreate the Pega Customer Engagement Blueprint as a
**Custom Engine Agent (CEA)** in Teams/Copilot, using **Adaptive Cards** as the UI
and chat as the NLP surface, talking to a Pega MCP backend.

We moved to the **MCP App** model (a remote MCP server that renders a rich,
interactive React/Fluent widget inline in Copilot) because it gives a far richer,
single-surface UX than card-by-card Adaptive Cards, while keeping the same data
and tool model.

| Path | What it was |
|------|-------------|
| `agent/` | The CEA bot project (TypeScript) |
| `cards/` | Standalone Adaptive Card JSON samples |
| `design-docs/` | The original concept/design docs (DESIGN.md, mcp-tools, conversation-flows) |
| `README-original.md` | The original top-level README |

For the current, supported solution and its end-to-end setup, start at the
[repository README](../README.md).
