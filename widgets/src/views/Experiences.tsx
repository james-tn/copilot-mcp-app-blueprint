import React from "react";
import { tokens, Text } from "@fluentui/react-components";
import { ChevronRight16Regular } from "@fluentui/react-icons";
import { Card, Pill } from "../components/ui";
import { outcomeColor } from "../theme";
import type { ExperiencesData } from "../types";

export function ExperiencesView({
  data,
  onOpenAction,
}: {
  data: ExperiencesData;
  onOpenAction: (actionId: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.groups.map((g) => (
        <div key={g.product}>
          <Text weight="bold" size={300} style={{ color: tokens.colorBrandForeground1, display: "block", marginBottom: 8 }}>
            {g.product}
          </Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {g.actions.map((a) => (
              <Card key={a.id} onClick={() => onOpenAction(a.id)}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {a.imageUrl && (
                    <img src={a.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text weight="semibold" size={300} style={{ display: "block" }}>{a.name}</Text>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Pill text={a.objective} color={outcomeColor(a.objective)} />
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        {a.treatmentCount} messages
                      </Text>
                    </div>
                  </div>
                  <ChevronRight16Regular style={{ color: tokens.colorNeutralForeground3 }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
