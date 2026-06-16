import React from "react";
import { tokens, Text, Badge } from "@fluentui/react-components";
import {
  Database20Regular,
  PlugConnected20Regular,
  CheckmarkCircle16Filled,
  Circle16Regular,
  Person20Regular,
} from "@fluentui/react-icons";
import { Card, SectionTitle } from "../components/ui";
import type { DataViewData, DataObject } from "../types";

function DataObjectRow({ o }: { o: DataObject }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: tokens.colorNeutralBackground1,
        borderRadius: 8,
        borderLeft: `4px solid ${o.sor === "local" ? "#2bb673" : "#8a6ded"}`,
        boxShadow: tokens.shadow2,
      }}
    >
      <Database20Regular style={{ color: tokens.colorNeutralForeground3, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text size={300} weight="semibold" style={{ display: "block" }}>{o.name}</Text>
        <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>{o.systemOfRecord}</Text>
      </div>
    </div>
  );
}

export function DataView({ data }: { data: DataViewData }) {
  const { local, external } = data.dataObjects;
  return (
    <>
      <Card>
        <SectionTitle>Application Data</SectionTitle>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", margin: "4px 0 12px" }}>
          Data Objects represent shared application data and how the application accesses it.
        </Text>
        <Text size={100} weight="semibold" style={{ color: tokens.colorNeutralForeground3, textTransform: "uppercase", letterSpacing: 0.3 }}>
          Local
        </Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, margin: "6px 0 12px" }}>
          {local.map((o) => <DataObjectRow key={o.id} o={o} />)}
        </div>
        <Text size={100} weight="semibold" style={{ color: tokens.colorNeutralForeground3, textTransform: "uppercase", letterSpacing: 0.3 }}>
          External
        </Text>
        {external.length === 0 ? (
          <Text size={200} style={{ display: "block", marginTop: 6, color: tokens.colorNeutralForeground4 }}>
            No external Data Objects yet.
          </Text>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 6 }}>
            {external.map((o) => <DataObjectRow key={o.id} o={o} />)}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Integrations</SectionTitle>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", margin: "4px 0 12px" }}>
          Connections to external systems and applications.
        </Text>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
          {data.integrations.map((it) => (
            <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: tokens.colorNeutralBackground1, borderRadius: 8, boxShadow: tokens.shadow2 }}>
              <PlugConnected20Regular style={{ color: "#0a66c2", flexShrink: 0, marginTop: 2 }} />
              <div style={{ minWidth: 0 }}>
                <Text size={300} weight="semibold" style={{ display: "block" }}>{it.name}</Text>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>{it.purpose}</Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Identity &amp; inbound events</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 12px" }}>
          <Person20Regular style={{ color: tokens.colorNeutralForeground3 }} />
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>User identity</Text>
          <Badge appearance="tint" color="brand">{data.identity}</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 12px" }}>
          {data.inboundEvents.map((e) => (
            <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {e.enabled
                ? <CheckmarkCircle16Filled style={{ color: tokens.colorPaletteGreenForeground1 }} />
                : <Circle16Regular style={{ color: tokens.colorNeutralForeground4 }} />}
              <Text size={200} style={{ color: e.enabled ? tokens.colorNeutralForeground1 : tokens.colorNeutralForeground3 }}>
                {e.name}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
