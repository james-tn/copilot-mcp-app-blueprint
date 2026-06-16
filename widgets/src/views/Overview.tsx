import React from "react";
import { tokens, Text, Button, Badge } from "@fluentui/react-components";
import { Open16Regular, Flowchart20Regular, Sparkle20Filled } from "@fluentui/react-icons";
import { Card, StatTile, SectionTitle } from "../components/ui";
import { PEGA_PURPLE } from "../theme";
import type { OverviewData, Phase } from "../types";

export function Overview({
  data,
  navigate,
  onOpenWorkflow,
  onCreate,
}: {
  data: OverviewData;
  navigate: (p: Phase) => void;
  onOpenWorkflow: (caseId: string) => void;
  onCreate?: () => void;
}) {
  const c = data.context;
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatTile value={data.counts.caseTypes} label="Workflows" />
        <StatTile value={data.counts.stages} label="Stages" />
        <StatTile value={data.counts.steps} label="Steps" />
        <StatTile value={data.counts.personas} label="Personas" />
      </div>

      {onCreate && (
        <Card style={{ borderColor: PEGA_PURPLE, background: `${PEGA_PURPLE}0d` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <Text weight="bold" size={400} style={{ display: "block" }}>Start a new application</Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                Pick an industry & purpose and let Blueprint design it.
              </Text>
            </div>
            <Button appearance="primary" icon={<Sparkle20Filled />} onClick={onCreate}>
              Create a Blueprint
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Application Context</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: 8 }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Organization</Text>
          <Text size={300}>{c.orgName} · {c.location}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Industry</Text>
          <Text size={300}>{c.industry} · {c.subIndustry}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Purpose</Text>
          <Text size={300}>{c.purpose}</Text>
        </div>
        <Text size={200} style={{ display: "block", marginTop: 8, color: tokens.colorNeutralForeground2, lineHeight: 1.4 }}>
          {c.description}
        </Text>
        <Button appearance="subtle" size="small" icon={<Open16Regular />} style={{ marginTop: 8 }}
          onClick={() => navigate("context")}>Edit context</Button>
      </Card>

      <Card>
        <SectionTitle>Workflows</SectionTitle>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", margin: "4px 0 10px" }}>
          {data.counts.caseTypes} Pega case types generated for this application.
        </Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {data.caseTypes.map((ct) => (
            <Card key={ct.id} onClick={() => onOpenWorkflow(ct.id)}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Flowchart20Regular style={{ color: PEGA_PURPLE, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text weight="semibold" size={300} style={{ display: "block" }}>{ct.name}</Text>
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {ct.stageCount} stages · {ct.stepCount} steps
                  </Text>
                </div>
                {ct.primary && <Badge appearance="tint" color="brand" size="small">Primary</Badge>}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card style={{ borderColor: tokens.colorBrandStroke1 }}>
        <SectionTitle>Continue designing</SectionTitle>
        <Text size={300} style={{ display: "block", margin: "6px 0 10px", color: tokens.colorNeutralForeground2 }}>
          Your blueprint is furthest along at <b>{data.resumePhase}</b>.
        </Text>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button appearance="primary" onClick={() => navigate(data.resumePhase)}>
            Go to {data.resumePhase}
          </Button>
          <Button appearance="outline" onClick={() => navigate("data")}>Data &amp; Integrations</Button>
          <Button appearance="outline" onClick={() => navigate("summary")}>Summary</Button>
        </div>
      </Card>
    </>
  );
}
