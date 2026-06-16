import React from "react";
import { tokens, Text, Spinner, Button, Badge } from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  ArrowRight20Regular,
  FullScreenMaximize20Regular,
  FullScreenMinimize20Regular,
  CheckmarkCircle16Filled,
} from "@fluentui/react-icons";
import { useBridge } from "../mcp/McpBridge";
import type { Phase } from "../types";

export const FONT =
  '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif';

const PHASE_LABELS: Record<Phase, string> = {
  context: "Context",
  workflows: "Workflows",
  "workflow-details": "Details",
  data: "Data",
  personas: "Personas",
  summary: "Summary",
};

export function cardStyle(clickable = false): React.CSSProperties {
  return {
    background: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: 12,
    padding: 16,
    cursor: clickable ? "pointer" : "default",
    transition: "border-color .15s ease, box-shadow .15s ease",
  };
}

export function Card({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = React.useState(false);
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...cardStyle(clickable),
        ...(clickable && hover
          ? { borderColor: tokens.colorBrandStroke1, boxShadow: tokens.shadow8 }
          : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Shell({
  children,
  fullscreen,
}: {
  children: React.ReactNode;
  fullscreen?: boolean;
}) {
  return (
    <div
      style={{
        fontFamily: FONT,
        background: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground1,
        minHeight: "100%",
        width: "100%",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxSizing: "border-box",
        ...(fullscreen
          ? { position: "fixed", inset: 0, overflowY: "auto", zIndex: 9999 }
          : {}),
      }}
    >
      {children}
    </div>
  );
}

// Persistent 1-6 workflow stepper. Each step is clickable and navigates to that
// phase via the MCP `show_blueprint` tool. The current phase is highlighted, done
// phases get a check, future phases are subtle.
export function Stepper({
  phases,
  active,
  onNavigate,
}: {
  phases: Phase[];
  active: Phase;
  onNavigate: (phase: Phase) => void;
}) {
  const activeIdx = phases.indexOf(active);
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 4, width: "100%" }}>
      {phases.map((p, i) => {
        const done = i < activeIdx;
        const isActive = i === activeIdx;
        const color = isActive
          ? tokens.colorBrandForeground1
          : done
          ? tokens.colorPaletteGreenForeground1
          : tokens.colorNeutralForeground4;
        return (
          <div
            key={p}
            onClick={() => onNavigate(p)}
            style={{
              flex: 1,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "6px 2px",
              borderRadius: 8,
              borderTop: `3px solid ${
                isActive
                  ? tokens.colorBrandStroke1
                  : done
                  ? tokens.colorPaletteGreenBorder1
                  : tokens.colorNeutralStroke2
              }`,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4, color, fontWeight: 700, fontSize: 13 }}>
              {done ? <CheckmarkCircle16Filled /> : i + 1}
            </span>
            <span style={{ color, fontSize: 11, fontWeight: isActive ? 700 : 500, textAlign: "center" }}>
              {PHASE_LABELS[p]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Sequential Back / Next footer so users can walk through the six design steps
// without hunting for the small stepper numbers (mirrors Pega's prev/next arrows).
// "overview" is treated as step 0, before the six phases.
export function StepNav({
  view,
  phases,
  onNavigate,
  onOverview,
}: {
  view: string;
  phases: Phase[];
  onNavigate: (phase: Phase) => void;
  onOverview: () => void;
}) {
  const order = ["overview", ...phases];
  const idx = order.indexOf(view);
  if (idx < 0) return null; // not a linear step (e.g. error)
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx < order.length - 1 ? order[idx + 1] : null;
  const label = (p: string) => (p === "overview" ? "Overview" : PHASE_LABELS[p as Phase] ?? p);
  const go = (p: string) => (p === "overview" ? onOverview() : onNavigate(p as Phase));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 4,
        paddingTop: 12,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
      }}
    >
      <Button
        appearance="secondary"
        icon={<ArrowLeft20Regular />}
        disabled={!prev}
        onClick={() => prev && go(prev)}
      >
        {prev ? `Back: ${label(prev)}` : "Back"}
      </Button>
      {next ? (
        <Button
          appearance="primary"
          icon={<ArrowRight20Regular />}
          iconPosition="after"
          onClick={() => go(next)}
        >
          Next: {label(next)}
        </Button>
      ) : (
        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
          Last step
        </Text>
      )}
    </div>
  );
}

export function TitleBar({
  title,
  subtitle,
  badge,
  onBack,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  onBack?: () => void;
}) {
  const { canExpand, isFullscreen, toggleFullscreen } = useBridge();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {onBack && (
          <Button appearance="subtle" icon={<ArrowLeft20Regular />} onClick={onBack} aria-label="Back" />
        )}
        <div style={{ minWidth: 0 }}>
          <Text weight="bold" size={500} style={{ display: "block", lineHeight: 1.2 }}>
            {title}
          </Text>
          {subtitle && (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              {subtitle}
            </Text>
          )}
        </div>
        {badge && <Badge appearance="tint" color="brand">{badge}</Badge>}
      </div>
      {canExpand && (
        <Button
          appearance="subtle"
          icon={isFullscreen ? <FullScreenMinimize20Regular /> : <FullScreenMaximize20Regular />}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
        />
      )}
    </div>
  );
}

export function StatTile({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: 12,
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? tokens.colorBrandForeground1, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color,
        background: `${color}22`,
        border: `1px solid ${color}44`,
      }}
    >
      {text}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text weight="semibold" size={400} style={{ display: "block" }}>
      {children}
    </Text>
  );
}

export function PromptChip({ label, prompt }: { label: string; prompt: string }) {
  const { sendPrompt } = useBridge();
  return (
    <Button appearance="outline" size="small" shape="circular" onClick={() => sendPrompt(prompt)}>
      {label}
    </Button>
  );
}

export function TipBar({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>{children}</div>;
}

export function Loading({ connected }: { connected: boolean }) {
  return (
    <Shell>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 40 }}>
        <Spinner label={connected ? "Loading your blueprint…" : "Connecting…"} />
      </div>
    </Shell>
  );
}
