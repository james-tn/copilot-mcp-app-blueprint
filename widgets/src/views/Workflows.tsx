import React from "react";
import { tokens, Text, Badge } from "@fluentui/react-components";
import { ChevronRight16Regular, Flowchart20Regular } from "@fluentui/react-icons";
import { Card, Pill } from "../components/ui";
import { PEGA_PURPLE } from "../theme";
import type { WorkflowsData } from "../types";

export function WorkflowsView({
  data,
  onOpenWorkflow,
}: {
  data: WorkflowsData;
  onOpenWorkflow: (caseId: string) => void;
}) {
  return (
    <>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        Workflows are modeled as Pega Case Types. Open one to see its case lifecycle.
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {data.caseTypes.map((ct) => (
          <Card key={ct.id} onClick={() => onOpenWorkflow(ct.id)}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
              <Flowchart20Regular style={{ color: PEGA_PURPLE, flexShrink: 0 }} />
              <Text weight="bold" size={400} style={{ flex: 1, minWidth: 0 }}>{ct.name}</Text>
              {ct.primary && <Badge appearance="tint" color="brand" size="small">Primary</Badge>}
              <ChevronRight16Regular style={{ color: tokens.colorNeutralForeground3 }} />
            </div>
            <Text size={200} style={{ display: "block", color: tokens.colorNeutralForeground2, lineHeight: 1.45 }}>
              {ct.description}
            </Text>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <Pill text={`${ct.stageCount} stages`} color="#2c5cc5" />
              <Pill text={`${ct.stepCount} steps`} color="#6b7280" />
              <Pill text={`${ct.automations} automated`} color="#e0902f" />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
