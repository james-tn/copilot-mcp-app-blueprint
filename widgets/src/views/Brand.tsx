import React from "react";
import { tokens, Text, Switch, Badge } from "@fluentui/react-components";
import { Card, SectionTitle } from "../components/ui";
import type { BrandData } from "../types";

function MessagePreview({ data }: { data: BrandData }) {
  const p = data.preview;
  const v = data.visual;
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ height: 6, background: v.headerColor }} />
      <div style={{ padding: 16 }}>
        <img
          src={p.imageUrl}
          alt=""
          style={{ width: "100%", borderRadius: 8, display: "block", aspectRatio: "21 / 9", objectFit: "cover" }}
        />
        <Text weight="bold" size={500} style={{ display: "block", marginTop: 12 }}>{p.headline}</Text>
        <Text size={300} style={{ display: "block", marginTop: 8 }}>{p.greeting}</Text>
        <Text size={300} style={{ display: "block", marginTop: 4, color: tokens.colorNeutralForeground2 }}>
          {p.body}
        </Text>
        <div
          style={{
            display: "inline-block",
            marginTop: 14,
            padding: "8px 16px",
            borderRadius: 8,
            background: v.headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {p.cta}
        </div>
      </div>
      <div
        style={{
          background: v.footerColor,
          color: "#fff",
          padding: "8px 16px",
          fontSize: 11,
          opacity: 0.85,
        }}
      >
        {data.title} · {data.industry}
      </div>
    </Card>
  );
}

export function BrandView({ data }: { data: BrandData }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Card>
          <SectionTitle>Brand voice</SectionTitle>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 8 }}>
            Characteristics applied to every generated message.
          </Text>
          {data.voice.map((vc) => (
            <div key={vc.id} style={{ padding: "8px 0", borderTop: `1px solid ${tokens.colorNeutralStroke2}` }}>
              <Switch checked={vc.enabled} label={vc.name} readOnly />
              <Text size={200} style={{ display: "block", color: tokens.colorNeutralForeground3, marginLeft: 44, marginTop: -4 }}>
                {vc.description}
              </Text>
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Visual identity</SectionTitle>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {([["Header", data.visual.headerColor], ["Background", data.visual.backgroundColor], ["Footer", data.visual.footerColor]] as const).map(
              ([label, color]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: color, border: `1px solid ${tokens.colorNeutralStroke2}` }} />
                  <Text size={100} style={{ display: "block", marginTop: 4, color: tokens.colorNeutralForeground3 }}>{label}</Text>
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>{color}</Text>
                </div>
              ),
            )}
          </div>
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3 }}>
          Live message preview
        </Text>
        <MessagePreview data={data} />
        {data.preview.voiceApplied.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {data.preview.voiceApplied.map((v) => <Badge key={v} appearance="outline">{v}</Badge>)}
          </div>
        )}
      </div>
    </div>
  );
}
