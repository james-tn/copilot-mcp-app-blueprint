import React from "react";
import {
  tokens, Text, Button, Spinner, Textarea,
  Dropdown, Option,
} from "@fluentui/react-components";
import { Sparkle24Filled, CheckmarkCircle16Filled, ArrowLeft20Regular, ErrorCircle20Regular } from "@fluentui/react-icons";
import { Card, SectionTitle } from "../components/ui";
import { PEGA_PURPLE } from "../theme";
import type { CreateData } from "../types";

export interface CreateArgs {
  industry: string;
  sub_industry: string;
  purpose: string;
  description?: string;
}

const AGENT_STEPS = [
  "Analyzing your requirements",
  "Researching industry best practices",
  "Building your workflows",
  "Architecting your data model",
  "Tailoring for your personas",
];

function Tile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: "pointer",
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 10,
        border: `1.5px solid ${selected ? PEGA_PURPLE : tokens.colorNeutralStroke2}`,
        background: selected ? `${PEGA_PURPLE}14` : tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        fontFamily: "inherit",
        fontSize: 13,
        fontWeight: selected ? 700 : 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <span>{label}</span>
      {selected && <CheckmarkCircle16Filled style={{ color: PEGA_PURPLE }} />}
    </button>
  );
}

// Animated "Blueprint Agents are designing…" progress (purely cosmetic; the real
// work is the create_blueprint tool call awaited by the parent).
function Generating({ purpose }: { purpose: string }) {
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setActive((i) => Math.min(i + 1, AGENT_STEPS.length - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Sparkle24Filled style={{ color: PEGA_PURPLE }} />
        <Text weight="bold" size={500}>Blueprint Agents are designing {purpose}</Text>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {AGENT_STEPS.map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {i < active
              ? <CheckmarkCircle16Filled style={{ color: tokens.colorPaletteGreenForeground1 }} />
              : i === active
              ? <Spinner size="extra-tiny" />
              : <span style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${tokens.colorNeutralStroke2}` }} />}
            <Text size={300} style={{ color: i <= active ? tokens.colorNeutralForeground1 : tokens.colorNeutralForeground3 }}>
              {label}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function NewBlueprint({
  data,
  onGenerate,
  onCancel,
}: {
  data: CreateData;
  onGenerate: (args: CreateArgs) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const cat = data.catalog;
  const [industry, setIndustry] = React.useState<string>("");
  const [sub, setSub] = React.useState<string>("");
  const [purpose, setPurpose] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const subs = industry ? (cat.subIndustries[industry] ?? cat.defaultSubIndustries) : [];
  const purposes = sub ? (cat.purposes[sub] ?? cat.defaultPurposes) : [];

  const pickIndustry = (v: string) => { setIndustry(v); setSub(""); setPurpose(""); };
  const pickSub = (v: string) => { setSub(v); setPurpose(""); };

  const canGenerate = !!industry && !!sub && !!purpose;

  const generate = () => {
    if (!canGenerate) return;
    setError(null);
    setGenerating(true);
    // The parent generates the blueprint, then swaps the view to the new overview.
    // If it couldn't (host quirk / timeout), recover with a retry instead of
    // leaving the "designing…" overlay spinning forever.
    onGenerate({ industry, sub_industry: sub, purpose, description })
      .then((ok) => {
        if (!ok) {
          setGenerating(false);
          setError("That took too long to generate. Please try again.");
        }
        // on success the parent unmounts this view — nothing to do here.
      })
      .catch(() => {
        setGenerating(false);
        setError("Something went wrong generating the blueprint. Please try again.");
      });
  };

  if (generating) return <Generating purpose={purpose} />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onCancel && (
          <Button appearance="subtle" icon={<ArrowLeft20Regular />} onClick={onCancel} aria-label="Back" />
        )}
        <div>
          <Text weight="bold" size={500} style={{ display: "block", lineHeight: 1.2 }}>
            Let's Blueprint!
          </Text>
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Design a new build-ready application
          </Text>
        </div>
      </div>

      <Card>
        <SectionTitle>1 · Which industry is your application for?</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginTop: 10 }}>
          {cat.industries.map((it) => (
            <Tile key={it} label={it} selected={industry === it} onClick={() => pickIndustry(it)} />
          ))}
        </div>
      </Card>

      {industry && (
        <Card>
          <SectionTitle>2 · Select a sub-industry</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, marginTop: 10 }}>
            {subs.map((s) => (
              <Tile key={s} label={s} selected={sub === s} onClick={() => pickSub(s)} />
            ))}
          </div>
        </Card>
      )}

      {sub && (
        <Card>
          <SectionTitle>3 · What's the application purpose?</SectionTitle>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            <Dropdown
              placeholder="Select an application purpose"
              selectedOptions={purpose ? [purpose] : []}
              value={purpose}
              onOptionSelect={(_e, d) => setPurpose(d.optionValue ?? "")}
            >
              {purposes.map((p) => (
                <Option key={p} value={p}>{p}</Option>
              ))}
            </Dropdown>
            <div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: "block", marginBottom: 4 }}>
                Functional description <span style={{ opacity: 0.7 }}>(optional)</span>
              </Text>
              <Textarea
                value={description}
                onChange={(_e, d) => setDescription(d.value)}
                placeholder="Add any specifics about what this application should do…"
                resize="vertical"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </Card>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            borderRadius: 8,
            background: tokens.colorStatusDangerBackground1,
            border: `1px solid ${tokens.colorStatusDangerBorder1}`,
            color: tokens.colorStatusDangerForeground1,
          }}
        >
          <ErrorCircle20Regular />
          <Text size={300}>{error}</Text>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Button appearance="primary" icon={<Sparkle24Filled />} disabled={!canGenerate} onClick={generate}>
          {error ? "Try again" : "Generate"}
        </Button>
        {onCancel && <Button appearance="subtle" onClick={onCancel}>Cancel</Button>}
      </div>
    </>
  );
}
