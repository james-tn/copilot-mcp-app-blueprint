import React from "react";
import { tokens, Text, Badge } from "@fluentui/react-components";
import { Card } from "../components/ui";
import { channelColor } from "../theme";
import { Pill } from "../components/ui";
import type { ActionData, Treatment } from "../types";

// A treatment rendered as a phone-style message mockup (mirrors the Pega app's
// channel preview for Mobile treatments).
function TreatmentMock({ t, headerColor }: { t: Treatment; headerColor: string }) {
  return (
    <div
      style={{
        width: 260,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: 22,
        overflow: "hidden",
        background: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow4,
      }}
    >
      <div style={{ height: 26, background: headerColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 60, height: 5, borderRadius: 3, background: "rgba(255,255,255,.6)" }} />
      </div>
      <img src={t.imageUrl} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Pill text={t.channel} color={channelColor(t.channel)} />
          {t.marketingPrinciple && (
            <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>{t.marketingPrinciple}</Text>
          )}
        </div>
        <Text weight="bold" size={400} style={{ display: "block" }}>{t.headline}</Text>
        <Text size={200} style={{ display: "block", marginTop: 6, color: tokens.colorNeutralForeground2, lineHeight: 1.4 }}>
          {t.body}
        </Text>
        <div
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "8px 14px",
            borderRadius: 8,
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {t.cta}
        </div>
      </div>
    </div>
  );
}

export function ActionView({ data }: { data: ActionData }) {
  const a = data.action;
  return (
    <>
      <Card>
        <Text weight="bold" size={500} style={{ display: "block" }}>{a.name}</Text>
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0 10px" }}>
          <Badge appearance="tint" color="brand">{a.product}</Badge>
          <Badge appearance="tint">{a.objective}</Badge>
        </div>
        <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>{a.description}</Text>
      </Card>
      <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3 }}>
        {a.treatments.length} channel messages
      </Text>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {a.treatments.map((t) => (
          <TreatmentMock key={t.id} t={t} headerColor={data.brand.headerColor} />
        ))}
      </div>
    </>
  );
}
