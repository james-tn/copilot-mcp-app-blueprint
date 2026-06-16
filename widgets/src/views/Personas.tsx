import React from "react";
import { tokens, Text, Avatar } from "@fluentui/react-components";
import { Card } from "../components/ui";
import type { PersonasData } from "../types";

export function PersonasView({ data }: { data: PersonasData }) {
  return (
    <>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        The personas (roles) involved in your workflows.
      </Text>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {data.personas.map((p) => (
          <Card key={p.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar name={p.name} image={{ src: p.imageUrl }} size={48} />
              <div style={{ minWidth: 0 }}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Persona
                </Text>
                <Text weight="bold" size={400} style={{ display: "block" }}>{p.name}</Text>
              </div>
            </div>
            <Text size={200} style={{ display: "block", marginTop: 10, color: tokens.colorNeutralForeground2, lineHeight: 1.45 }}>
              {p.description}
            </Text>
          </Card>
        ))}
      </div>
    </>
  );
}
