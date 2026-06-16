import React, { useCallback, useEffect, useState } from "react";
import { ProgressBar, Text, tokens } from "@fluentui/react-components";
import { ErrorCircle24Regular } from "@fluentui/react-icons";
import { useBridge } from "./mcp/McpBridge";
import { Loading, Shell, TitleBar, Stepper, Card, TipBar, PromptChip } from "./components/ui";
import { Overview } from "./views/Overview";
import { ContextView, SetupView, PersonasView } from "./views/Phases";
import { BrandView } from "./views/Brand";
import { ExperiencesView } from "./views/Experiences";
import { ActionView } from "./views/Action";
import { SummaryView } from "./views/Summary";
import type { Phase, ToolData } from "./types";

const PHASE_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Customer Engagement Blueprint", subtitle: "Overview" },
  context: { title: "Let's review your context", subtitle: "Step 1 · Context" },
  setup: { title: "Let's set the focus", subtitle: "Step 2 · Setup" },
  personas: { title: "Your customer personas", subtitle: "Step 3 · Personas" },
  brand: { title: "Validate your brand voice", subtitle: "Step 4 · Brand" },
  experiences: { title: "Review your experiences", subtitle: "Step 5 · Experiences" },
  action: { title: "Action treatments", subtitle: "Step 5 · Experiences" },
  summary: { title: "Summary", subtitle: "Step 6 · Summary" },
};

// Map a phase to the MCP tool that renders it.
function phaseTool(phase: Phase): { name: string; args?: Record<string, unknown> } {
  switch (phase) {
    case "context": return { name: "show_blueprint", args: { phase: "context" } };
    case "setup": return { name: "show_blueprint", args: { phase: "setup" } };
    case "personas": return { name: "show_personas" };
    case "brand": return { name: "show_brand" };
    case "experiences": return { name: "show_experiences" };
    case "summary": return { name: "show_summary" };
    default: return { name: "show_blueprint" };
  }
}

export function App() {
  const { toolData, callTool, isConnected, isFullscreen } = useBridge();
  const [override, setOverride] = useState<ToolData | null>(null);
  const [busy, setBusy] = useState(false);

  // A fresh result from the host (a new tool call) resets any local drill-down.
  useEffect(() => {
    setOverride(null);
  }, [toolData]);

  const data = override ?? toolData;

  const run = useCallback(
    (name: string, args?: Record<string, unknown>) => {
      setBusy(true);
      callTool(name, args)
        .then((sc) => {
          if (sc && (sc as ToolData).view) setOverride(sc);
        })
        .catch(() => {
          /* host surfaces tool errors in chat */
        })
        .finally(() => setBusy(false));
    },
    [callTool],
  );

  const navigatePhase = useCallback((phase: Phase) => {
    const { name, args } = phaseTool(phase);
    run(name, args);
  }, [run]);

  const openAction = useCallback((actionId: string) => {
    run("show_action", { action: actionId });
  }, [run]);

  if (!data) return <Loading connected={isConnected} />;

  const meta = PHASE_TITLES[data.view] ?? PHASE_TITLES.overview;
  const canBack = !!override && data.view === "action";

  return (
    <Shell fullscreen={isFullscreen}>
      <Stepper phases={data.phases} active={data.phase} onNavigate={navigatePhase} />
      <TitleBar
        title={meta.title}
        subtitle={`${meta.subtitle} · ${data.industry} · ${data.blueprintId}`}
        onBack={canBack ? () => run("show_experiences") : undefined}
      />
      {busy && <ProgressBar />}

      {data.view === "overview" && <Overview data={data} navigate={navigatePhase} />}
      {data.view === "context" && <ContextView data={data} />}
      {data.view === "setup" && <SetupView data={data} />}
      {data.view === "personas" && <PersonasView data={data} />}
      {data.view === "brand" && <BrandView data={data} />}
      {data.view === "experiences" && <ExperiencesView data={data} onOpenAction={openAction} />}
      {data.view === "action" && <ActionView data={data} />}
      {data.view === "summary" && <SummaryView data={data} navigate={navigatePhase} />}
      {data.view === "error" && (
        <Card>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ErrorCircle24Regular style={{ color: tokens.colorPaletteRedForeground1 }} />
            <Text>{data.message}</Text>
          </div>
        </Card>
      )}

      <TipBar>
        <PromptChip label="Personas" prompt="Show the personas" />
        <PromptChip label="Experiences" prompt="Show the experiences" />
        <PromptChip label="Summary" prompt="Show the summary" />
      </TipBar>
    </Shell>
  );
}
