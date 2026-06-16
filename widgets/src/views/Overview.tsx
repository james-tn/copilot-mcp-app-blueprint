import React from "react";
import { tokens, Text, Button } from "@fluentui/react-components";
import { Open16Regular } from "@fluentui/react-icons";
import { Card, StatTile, SectionTitle, Pill } from "../components/ui";
import { outcomeColor, channelColor } from "../theme";
import type { OverviewData, Phase } from "../types";

export function Overview({ data, navigate }: { data: OverviewData; navigate: (p: Phase) => void }) {
  const c = data.context;
  const s = data.setup;
  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <StatTile value={data.personaCount} label="Personas" />
        <StatTile value={data.counts.actions} label="Actions" />
        <StatTile value={data.counts.treatments} label="Messages" />
      </div>

      <Card>
        <SectionTitle>Context</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: 8 }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Organization</Text>
          <Text size={300}>{c.orgName} · {c.website}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Objective</Text>
          <Text size={300}>{c.objective}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Market</Text>
          <Text size={300}>{c.language} · {c.location}</Text>
        </div>
        <Button appearance="subtle" size="small" icon={<Open16Regular />} style={{ marginTop: 8 }}
          onClick={() => navigate("context")}>Edit context</Button>
      </Card>

      <Card>
        <SectionTitle>Setup</SectionTitle>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginTop: 6 }}>Industry</Text>
        <Text size={300}>{s.industry} — {s.products.join(", ")}</Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {s.outcomes.map((o) => <Pill key={o} text={o} color={outcomeColor(o)} />)}
          {s.channels.map((ch) => <Pill key={ch} text={ch} color={channelColor(ch)} />)}
        </div>
        <Button appearance="subtle" size="small" icon={<Open16Regular />} style={{ marginTop: 10 }}
          onClick={() => navigate("setup")}>Edit setup</Button>
      </Card>

      <Card style={{ borderColor: tokens.colorBrandStroke1 }}>
        <SectionTitle>Continue where you left off</SectionTitle>
        <Text size={300} style={{ display: "block", margin: "6px 0 10px", color: tokens.colorNeutralForeground2 }}>
          Your blueprint is furthest along at <b>{data.resumePhase}</b>.
        </Text>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button appearance="primary" onClick={() => navigate(data.resumePhase)}>
            Go to {data.resumePhase}
          </Button>
          <Button appearance="outline" onClick={() => navigate("personas")}>Personas</Button>
          <Button appearance="outline" onClick={() => navigate("experiences")}>Experiences</Button>
        </div>
      </Card>
    </>
  );
}
