import React from "react";
import { tokens, Text, Button, Badge } from "@fluentui/react-components";
import {
  DocumentPdf20Regular,
  DocumentTable20Regular,
  ArrowDownload20Regular,
  Share20Regular,
  Open20Regular,
  Edit16Regular,
} from "@fluentui/react-icons";
import { Card, StatTile, SectionTitle } from "../components/ui";
import { useBridge } from "../mcp/McpBridge";
import { PEGA_PURPLE } from "../theme";
import type { SummaryData, Phase } from "../types";

const SCOPE_MULT: Record<string, number> = { Pilot: 0.6, Department: 1.0, Enterprise: 1.8 };

// Illustrative delivery-acceleration model (matches store.calculate_acceleration),
// computed client-side so the scope buttons respond instantly.
function estimate(steps: number, scope: string) {
  const m = SCOPE_MULT[scope] ?? 1.0;
  const traditionalWeeks = Math.max(1, Math.round(steps * 0.6 * m));
  const traditionalMonths = Math.round((traditionalWeeks / 4) * 10) / 10;
  const blueprintDays = Math.max(3, Math.round(steps * 0.4 * m));
  const fasterX = Math.max(2, Math.round((traditionalWeeks * 5) / blueprintDays));
  return { traditionalMonths, blueprintDays, fasterX };
}

export function SummaryView({
  data,
  navigate,
}: {
  data: SummaryData;
  navigate: (p: Phase) => void;
}) {
  const { sendPrompt, downloadFile } = useBridge();
  const a = data.architecture;
  const c = data.context;
  const [scope, setScope] = React.useState(data.value.scope || "Department");
  const [note, setNote] = React.useState<string | null>(null);
  const est = estimate(a.steps, scope);

  const fileBase = data.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60) || "blueprint";
  const download = async (url: string, label: string, ext: string, mime: string) => {
    setNote(null);
    const ok = await downloadFile(url, `${fileBase}.${ext}`, mime);
    if (!ok) {
      sendPrompt(`Here is the ${label} download link for my blueprint: ${url}`);
      setNote(`If the download didn't start, I've sent the ${label} link to the chat.`);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatTile value={a.caseTypes} label="Workflows" />
        <StatTile value={a.stages} label="Stages" />
        <StatTile value={a.steps} label="Steps" />
        <StatTile value={a.dataObjects} label="Data objects" />
        <StatTile value={a.personas} label="Personas" />
        <StatTile value={a.integrations} label="Integrations" />
      </div>

      {/* Export / share — mirrors Pega's Summary actions. */}
      <Card>
        <SectionTitle>Export &amp; share</SectionTitle>
        <Text size={200} style={{ display: "block", color: tokens.colorNeutralForeground3, margin: "4px 0 12px" }}>
          Download your blueprint or share it with your team.
        </Text>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button appearance="primary" icon={<DocumentPdf20Regular />} onClick={() => download(data.exports.pdf, "PDF", "pdf", "application/pdf")}>
            Download PDF
          </Button>
          <Button appearance="outline" icon={<DocumentTable20Regular />} onClick={() => download(data.exports.excel, "Excel", "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>
            Download Excel
          </Button>
          <Button appearance="outline" icon={<ArrowDownload20Regular />} onClick={() => download(data.exports.blueprint, "Blueprint", "blueprint.json", "application/json")}>
            Download Blueprint
          </Button>
          <Button appearance="subtle" icon={<Open20Regular />} onClick={() => sendPrompt("Show me what this app would look like live")}>
            See it live
          </Button>
          <Button appearance="subtle" icon={<Share20Regular />} onClick={() => sendPrompt("Share this blueprint with my team")}>
            Share
          </Button>
        </div>
        {note && (
          <Text size={200} style={{ display: "block", color: tokens.colorBrandForeground1, marginTop: 8 }}>
            {note}
          </Text>
        )}
        <Text size={100} style={{ display: "block", color: tokens.colorNeutralForeground4, marginTop: 8 }}>
          "Download Blueprint" exports an importable Blueprint file you can bring into Pega to generate the app.
        </Text>
      </Card>

      {/* Section review with edit navigation. */}
      <Card>
        <SectionTitle>Review &amp; edit</SectionTitle>
        <div style={{ marginTop: 8 }}>
          {data.sections.map((sec) => (
            <div
              key={sec.phase}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 0",
                borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text size={300} weight="semibold" style={{ display: "block" }}>{sec.label}</Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>{sec.summary}</Text>
              </div>
              <Button appearance="subtle" size="small" icon={<Edit16Regular />} onClick={() => navigate(sec.phase)}>
                Edit
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Application context recap. */}
      <Card>
        <SectionTitle>Application Context</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", marginTop: 8 }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Organization</Text>
          <Text size={300}>{c.orgName} · {c.location}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Industry</Text>
          <Text size={300}>{c.industry} · {c.subIndustry}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Purpose</Text>
          <Text size={300}>{c.purpose}</Text>
        </div>
      </Card>

      {/* Delivery acceleration (illustrative). */}
      <Card style={{ borderColor: tokens.colorBrandStroke1 }}>
        <SectionTitle>Delivery acceleration with Blueprint</SectionTitle>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline", margin: "8px 0", flexWrap: "wrap" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: PEGA_PURPLE, lineHeight: 1.1 }}>
            ~{est.blueprintDays} days
          </div>
          <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
            with Blueprint vs ~{est.traditionalMonths} months hand-built · <b>{est.fasterX}× faster</b>
          </Text>
        </div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {data.value.assumptions.map((x, i) => (
            <li key={i}><Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>{x}</Text></li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {(data.value.scopes ?? ["Pilot", "Department", "Enterprise"]).map((opt) => (
            <Button key={opt} size="small" appearance={opt === scope ? "primary" : "outline"} onClick={() => setScope(opt)}>
              {opt}
            </Button>
          ))}
        </div>
      </Card>

      {/* Pega Cloud capabilities. */}
      <Card>
        <SectionTitle>Pega Cloud capabilities</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {data.cloudCapabilities.map((cap) => (
            <Badge key={cap} appearance="outline" color="brand">{cap}</Badge>
          ))}
        </div>
      </Card>
    </>
  );
}
