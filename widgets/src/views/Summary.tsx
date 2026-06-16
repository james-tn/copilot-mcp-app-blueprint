import React from "react";
import { tokens, Text, Button } from "@fluentui/react-components";
import {
  DocumentPdf20Regular,
  DocumentTable20Regular,
  ArrowDownload20Regular,
  Share20Regular,
  Edit16Regular,
} from "@fluentui/react-icons";
import { Card, StatTile, SectionTitle, Pill } from "../components/ui";
import { useBridge } from "../mcp/McpBridge";
import { outcomeColor, channelColor } from "../theme";
import { money } from "../format";
import type { SummaryData, Phase } from "../types";

// Illustrative value model (matches the server's calculate_value): adoption 12%,
// $18 average annual ARPU uplift per adopting customer. Computed client-side so
// the calculator responds instantly.
function estimate(numCustomers: number): number {
  return Math.round(numCustomers * 0.12 * 18);
}

export function SummaryView({
  data,
  navigate,
}: {
  data: SummaryData;
  navigate: (p: Phase) => void;
}) {
  const { sendPrompt, downloadFile } = useBridge();
  const c = data.context;
  const s = data.setup;
  const [n, setN] = React.useState(data.value.numCustomers);
  const [note, setNote] = React.useState<string | null>(null);

  const fileBase = data.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60) || "blueprint";
  const download = async (url: string, label: string, ext: string, mime: string) => {
    setNote(null);
    const ok = await downloadFile(url, `${fileBase}.${ext}`, mime);
    if (!ok) {
      // Host blocked it — surface the link in chat so the user can still grab it.
      sendPrompt(`Here is the ${label} download link for my blueprint: ${url}`);
      setNote(`If the download didn't start, I've sent the ${label} link to the chat.`);
    }
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10 }}>
        <StatTile value={data.counts.actions} label="Actions" />
        <StatTile value={data.counts.treatments} label="Messages" />
        <StatTile value={data.counts.channels} label="Channels" />
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
          "Download Blueprint" exports an importable Blueprint file for Customer Decision Hub.
        </Text>
      </Card>

      {/* Section review with edit navigation (mirrors Pega's consolidated review). */}
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

      <Card>
        <SectionTitle>Who is this for?</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", marginTop: 8 }}>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Organization</Text>
          <Text size={300}>{c.orgName} · {c.website}</Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>Industry</Text>
          <Text size={300}>{data.industry}</Text>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {s.outcomes.map((o) => <Pill key={o} text={o} color={outcomeColor(o)} />)}
          {s.channels.map((ch) => <Pill key={ch} text={ch} color={channelColor(ch)} />)}
        </div>
      </Card>

      <Card style={{ borderColor: tokens.colorBrandStroke1 }}>
        <SectionTitle>Potential value of Customer Decision Hub</SectionTitle>
        <div style={{ fontSize: 30, fontWeight: 800, color: tokens.colorBrandForeground1, margin: "8px 0" }}>
          {money(estimate(n))} / year
        </div>
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          for {n.toLocaleString()} customers
        </Text>
        <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
          {data.value.assumptions.map((a, i) => (
            <li key={i}><Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>{a}</Text></li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {[1_000_000, 5_000_000, 10_000_000, 25_000_000].map((opt) => (
            <Button key={opt} size="small" appearance={opt === n ? "primary" : "outline"} onClick={() => setN(opt)}>
              {opt / 1_000_000}M
            </Button>
          ))}
        </div>
      </Card>
    </>
  );
}
