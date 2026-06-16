// Natural-language intent classification for free-text chat.
//
// Uses Azure OpenAI when configured, with a keyword fallback so the POC still
// works (cards + simple commands) even without a model.

import { AzureOpenAI } from "openai";
import config from "./config";

export interface Intent {
  intent: string;
  args: Record<string, any>;
}

const PHASES = ["context", "setup", "personas", "brand", "experiences", "summary"];

let client: AzureOpenAI | undefined;
function getClient(): AzureOpenAI | undefined {
  if (!config.azureOpenAIKey || !config.azureOpenAIEndpoint || !config.azureOpenAIDeploymentName) return undefined;
  if (!client) {
    client = new AzureOpenAI({
      apiVersion: "2024-12-01-preview",
      apiKey: config.azureOpenAIKey,
      endpoint: config.azureOpenAIEndpoint,
      deployment: config.azureOpenAIDeploymentName,
    });
  }
  return client;
}

const SYSTEM = `You route messages for a "Customer Engagement Blueprint" assistant.
Return ONLY JSON: {"intent": string, "args": object}.
Valid intents:
- "dashboard"            list blueprints
- "create_blueprint"     args: { objective?, orgName?, website?, industry? }
- "open_blueprint"       args: { }            (open the current/first blueprint)
- "goto_phase"           args: { phase: one of context|setup|personas|brand|experiences|summary }
- "generate_personas"
- "add_persona"          args: { name?, description? }
- "generate_experiences"
- "calculate_value"      args: { numCustomers: number }
- "help"
- "smalltalk"            args: { reply: string }   (a brief helpful reply for anything else)
Map synonyms: "offers"/"actions"/"messages"/"treatments" => experiences; "audience"/"customers" => personas; "tone"/"voice" => brand.
Extract numbers like "5 million" => 5000000.`;

export async function classifyIntent(text: string): Promise<Intent> {
  const c = getClient();
  if (c) {
    try {
      const res = await c.chat.completions.create({
        model: "",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      });
      const raw = res.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.intent === "string") {
        return { intent: parsed.intent, args: parsed.args || {} };
      }
    } catch {
      // fall through to keyword routing
    }
  }
  return keywordIntent(text);
}

export function keywordIntent(text: string): Intent {
  const t = (text || "").toLowerCase();
  const phase = PHASES.find((p) => t.includes(p));
  if (/\b(dashboard|my blueprints|list)\b/.test(t)) return { intent: "dashboard", args: {} };
  if (/\b(create|new)\b/.test(t) && /blueprint/.test(t)) return { intent: "create_blueprint", args: {} };
  if (/\bvalue|roi|worth\b/.test(t)) {
    const m = t.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(million|m|k|thousand)?/);
    let n = m ? parseFloat(m[1]) : 10000000;
    if (m && (m[2] === "million" || m[2] === "m")) n *= 1_000_000;
    if (m && (m[2] === "k" || m[2] === "thousand")) n *= 1_000;
    return { intent: "calculate_value", args: { numCustomers: Math.round(n) } };
  }
  if (/persona|audience|customer/.test(t) && /\b(add|create|new)\b/.test(t)) return { intent: "add_persona", args: {} };
  if (/persona|audience/.test(t)) return { intent: "goto_phase", args: { phase: "personas" } };
  if (/experience|action|offer|message|treatment/.test(t)) return { intent: "generate_experiences", args: {} };
  if (/brand|voice|tone/.test(t)) return { intent: "goto_phase", args: { phase: "brand" } };
  if (/summary|export|share|download/.test(t)) return { intent: "goto_phase", args: { phase: "summary" } };
  if (phase) return { intent: "goto_phase", args: { phase } };
  if (/help|what can you/.test(t)) return { intent: "help", args: {} };
  return { intent: "help", args: {} };
}
