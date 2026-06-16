import React from "react";
import { tokens, Text, Avatar, Badge } from "@fluentui/react-components";
import { Card } from "../components/ui";
import type { ContextData, SetupData, PersonasData } from "../types";
import { outcomeColor, channelColor } from "../theme";
import { Pill } from "../components/ui";

export function ContextView({ data }: { data: ContextData }) {
  const c = data.context;
  const rows: [string, string][] = [
    ["Organization", c.orgName],
    ["Website", c.website],
    ["Objective", c.objective],
    ["Language", c.language],
    ["Location", c.location],
  ];
  return (
    <>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px" }}>
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{k}</Text>
              <Text size={300} weight="semibold">{v}</Text>
            </React.Fragment>
          ))}
        </div>
      </Card>
      <Card>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 4 }}>
          Objective details for messaging
        </Text>
        <Text size={300}>{c.objectiveDetails}</Text>
      </Card>
    </>
  );
}

export function SetupView({ data }: { data: SetupData }) {
  const s = data.setup;
  return (
    <>
      <Card>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Industry</Text>
        <Text size={400} weight="semibold" style={{ display: "block" }}>{s.industry}</Text>
        <Text size={300} style={{ display: "block", marginTop: 6 }}>{s.products.join(" · ")}</Text>
      </Card>
      <Card>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 8 }}>
          Outcomes
        </Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.allOutcomes.map((o) => (
            <Pill key={o} text={o} color={s.outcomes.includes(o) ? outcomeColor(o) : tokens.colorNeutralForeground4} />
          ))}
        </div>
      </Card>
      <Card>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 8 }}>
          Channels
        </Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {s.allChannels.map((ch) => (
            <Pill key={ch} text={ch} color={s.channels.includes(ch) ? channelColor(ch) : tokens.colorNeutralForeground4} />
          ))}
        </div>
      </Card>
      {s.features.length > 0 && (
        <Card>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 8 }}>
            Optional features
          </Text>
          <div style={{ display: "flex", gap: 6 }}>
            {s.features.map((f) => <Badge key={f} appearance="tint" color="brand">{f}</Badge>)}
          </div>
        </Card>
      )}
    </>
  );
}

export function PersonasView({ data }: { data: PersonasData }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {data.personas.map((p) => (
        <Card key={p.id}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Avatar name={p.name} image={{ src: p.imageUrl }} size={48} />
            <div style={{ minWidth: 0 }}>
              <Text weight="bold" size={400} style={{ display: "block" }}>{p.name}</Text>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                {[p.gender, p.ageBand].filter(Boolean).join(" · ")}
              </Text>
            </div>
          </div>
          <Text size={200} style={{ display: "block", marginTop: 10, color: tokens.colorNeutralForeground2, lineHeight: 1.4 }}>
            {p.description}
          </Text>
        </Card>
      ))}
    </div>
  );
}
