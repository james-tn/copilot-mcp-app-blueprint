import React, { useCallback, useEffect, useState } from "react";
import { ProgressBar, Text, Button, tokens } from "@fluentui/react-components";
import { ErrorCircle24Regular } from "@fluentui/react-icons";
import { useBridge } from "./mcp/McpBridge";
import { Loading, Shell, TitleBar, Stepper, Card, TipBar, PromptChip } from "./components/ui";
import { Overview } from "./views/Overview";
import { ContextView } from "./views/Context";
import { WorkflowsView } from "./views/Workflows";
import { WorkflowDetailsView } from "./views/WorkflowDetails";
import { DataView } from "./views/Data";
import { PersonasView } from "./views/Personas";
import { SummaryView } from "./views/Summary";
import { NewBlueprint, type CreateArgs } from "./views/NewBlueprint";
import type { Phase, ToolData } from "./types";

const PHASE_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Pega Blueprint", subtitle: "Overview" },
  context: { title: "Application Context", subtitle: "Step 1 · Context" },
  workflows: { title: "Workflows", subtitle: "Step 2 · Case Types" },
  "workflow-details": { title: "Workflow Details", subtitle: "Step 3 · Case Lifecycle" },
  data: { title: "Data & Integrations", subtitle: "Step 4 · Data" },
  personas: { title: "Personas", subtitle: "Step 5 · Personas" },
  summary: { title: "Summary", subtitle: "Step 6 · Summary" },
};

// Map a phase to the MCP tool that renders it.
function phaseTool(phase: Phase): { name: string; args?: Record<string, unknown> } {
  switch (phase) {
    case "context": return { name: "show_blueprint", args: { phase: "context" } };
    case "workflows": return { name: "show_workflows" };
    case "workflow-details": return { name: "show_workflow" };
    case "data": return { name: "show_data" };
    case "personas": return { name: "show_personas" };
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

  const openWorkflow = useCallback((caseId: string) => {
    run("show_workflow", { case: caseId });
  }, [run]);

  const openCreate = useCallback(() => run("show_create"), [run]);

  // Returns the promise so the wizard can keep its "designing…" overlay until the
  // new blueprint is generated and the view swaps to the overview.
  const generate = useCallback(
    (args: CreateArgs) => {
      setBusy(true);
      return callTool("create_blueprint", args as unknown as Record<string, unknown>)
        .then((sc) => {
          if (sc && (sc as ToolData).view) setOverride(sc);
        })
        .finally(() => setBusy(false));
    },
    [callTool],
  );

  if (!data) return <Loading connected={isConnected} />;

  // The create wizard is a standalone surface (no phase stepper).
  if (data.view === "create") {
    return (
      <Shell fullscreen={isFullscreen}>
        {busy && <ProgressBar />}
        <NewBlueprint data={data} onGenerate={generate} onCancel={() => run("show_blueprint")} />
      </Shell>
    );
  }

  const meta = PHASE_TITLES[data.view] ?? PHASE_TITLES.overview;
  const canBack = data.view === "workflow-details";

  return (
    <Shell fullscreen={isFullscreen}>
      <Stepper phases={data.phases} active={data.phase} onNavigate={navigatePhase} />
      <TitleBar
        title={meta.title}
        subtitle={`${meta.subtitle} · ${data.subIndustry} · ${data.blueprintId}`}
        onBack={canBack ? () => run("show_workflows") : undefined}
      />
      {busy && <ProgressBar />}

      {data.view === "overview" && <Overview data={data} navigate={navigatePhase} onOpenWorkflow={openWorkflow} onCreate={openCreate} />}
      {data.view === "context" && <ContextView data={data} />}
      {data.view === "workflows" && <WorkflowsView data={data} onOpenWorkflow={openWorkflow} />}
      {data.view === "workflow-details" && <WorkflowDetailsView data={data} onSelectCase={openWorkflow} />}
      {data.view === "data" && <DataView data={data} />}
      {data.view === "personas" && <PersonasView data={data} />}
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
        <Button appearance="primary" size="small" shape="circular" onClick={openCreate}>
          + Create a Blueprint
        </Button>
        <PromptChip label="Workflows" prompt="Show the workflows" />
        <PromptChip label="Data model" prompt="Show the data objects and integrations" />
        <PromptChip label="Personas" prompt="Show the personas" />
        <PromptChip label="Summary" prompt="Summarize the blueprint" />
      </TipBar>
    </Shell>
  );
}
