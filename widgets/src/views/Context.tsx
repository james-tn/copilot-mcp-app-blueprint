import React from "react";
import { tokens, Text } from "@fluentui/react-components";
import { Card } from "../components/ui";
import type { ContextData } from "../types";

export function ContextView({ data }: { data: ContextData }) {
  const c = data.context;
  const rows: [string, string][] = [
    ["Organization", c.orgName],
    ["Industry", c.industry],
    ["Sub-industry", c.subIndustry],
    ["Purpose", c.purpose],
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
          Functional description
        </Text>
        <Text size={300} style={{ lineHeight: 1.5 }}>{c.description}</Text>
      </Card>
    </>
  );
}
