import React from "react";
import { tokens, Text, Button } from "@fluentui/react-components";
import { Card, Pill } from "../components/ui";
import { stepMeta, stageColor, PEGA_PURPLE } from "../theme";
import type { WorkflowDetailsData, Stage, Step } from "../types";

function StepRow({ step }: { step: Step }) {
  const m = stepMeta(step.type);
  return (
    <div
      title={m.label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: tokens.colorNeutralBackground1,
        borderRadius: 8,
        borderLeft: `4px solid ${m.color}`,
        boxShadow: tokens.shadow2,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 3, background: m.color, flexShrink: 0 }} />
      <Text size={200} weight="semibold" style={{ lineHeight: 1.2 }}>{step.name}</Text>
    </div>
  );
}

function StageColumn({ stage }: { stage: Stage }) {
  const color = stageColor(stage.kind);
  return (
    <div style={{ minWidth: 210, maxWidth: 240, flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Chevron-style stage header */}
      <div
        style={{
          background: color,
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
          padding: "8px 12px",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage.name}</span>
        <span aria-hidden style={{ opacity: 0.85 }}>›</span>
      </div>

      {/* Processes (sub-grouped steps) */}
      {stage.processes.map((proc) => (
        <div
          key={proc.id}
          style={{
            border: `1px dashed ${tokens.colorNeutralStroke2}`,
            borderRadius: 10,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: tokens.colorNeutralBackground2,
          }}
        >
          <Text size={100} weight="semibold" style={{ color: tokens.colorNeutralForeground3, textTransform: "uppercase", letterSpacing: 0.3 }}>
            {proc.name}
          </Text>
          {proc.steps.map((s) => <StepRow key={s.id} step={s} />)}
        </div>
      ))}

      {/* Flat steps */}
      {stage.steps.map((s) => <StepRow key={s.id} step={s} />)}
    </div>
  );
}

function StageBand({ title, stages }: { title: string; stages: Stage[] }) {
  if (stages.length === 0) return null;
  return (
    <div>
      <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 8 }}>
        {title}
      </Text>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
        {stages.map((st) => <StageColumn key={st.id} stage={st} />)}
      </div>
    </div>
  );
}

export function WorkflowDetailsView({
  data,
  onSelectCase,
}: {
  data: WorkflowDetailsData;
  onSelectCase: (caseId: string) => void;
}) {
  const cs = data.case;
  const primary = cs.stages.filter((s) => s.kind === "primary");
  const alternate = cs.stages.filter((s) => s.kind === "alternate");

  return (
    <>
      {/* Case type switcher */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {data.caseList.map((c) => (
          <Button
            key={c.id}
            size="small"
            appearance={c.id === data.activeCaseId ? "primary" : "outline"}
            onClick={() => onSelectCase(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <Card>
        <Text weight="bold" size={400} style={{ display: "block" }}>{cs.name}</Text>
        <Text size={200} style={{ display: "block", marginTop: 4, color: tokens.colorNeutralForeground2, lineHeight: 1.45 }}>
          {cs.description}
        </Text>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Pill text={`${cs.counts.primaryStages} primary stages`} color="#2c5cc5" />
          <Pill text={`${cs.counts.alternateStages} alternate`} color="#6b7280" />
          <Pill text={`${cs.counts.steps} steps`} color={PEGA_PURPLE} />
          <Pill text={`${cs.counts.automations} automated`} color="#e0902f" />
        </div>
      </Card>

      <StageBand title="Primary Stages" stages={primary} />
      <StageBand title="Alternate Stages" stages={alternate} />
    </>
  );
}
