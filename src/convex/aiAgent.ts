import { v } from "convex/values";
import { action } from "./_generated/server";
import { vly } from "../lib/vly-integrations";

// The gateway accepts OpenAI-style multimodal message content at runtime even
// though the bundled .d.ts types it as string-only.
const completion = vly.ai.completion.bind(vly.ai) as (
  request: Parameters<typeof vly.ai.completion>[0] & {
    messages: Array<{
      role: "system" | "user" | "assistant";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    }>;
  },
) => ReturnType<typeof vly.ai.completion>;

export interface AiTurnResult {
  reply: string;
  issueType: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  title: string | null;
}

const SYSTEM_PROMPT = `You are the AI Civic Agent for Civic Guide AI — a warm, patient municipal clerk who helps citizens report civic problems like potholes, garbage, broken streetlights, water leaks, drainage issues, damaged roads, or stray animal concerns.

CONVERSATION STYLE (very important):
- Reply in the SAME language the citizen used in their latest message (English, Hindi, Telugu, Tamil, Marathi, Bengali, or mixed). If they mix languages, mirror their mix.
- Keep replies SHORT — 1 to 3 spoken-style sentences. You are talking, not writing an essay.
- Sound human, warm and encouraging. Never use bullet points, markdown, emoji or headings.
- Use the full conversation history. Do not ask again for information the citizen has already provided or clearly implied.
- Ask exactly ONE question per reply. Only ask about the earliest missing field in this priority order:
  1. What and where exactly is the problem?
  2. A nearby landmark or the street name.
  3. How long it has been like this.
  4. Who is affected or how badly (children, traffic, flooding, water supply disruption, daily inconvenience, etc.).
- If the citizen already mentioned impact details like children, traffic, water shortage, flooding, school disruption, blocked road, or daily water issues, treat that as already answered and do not repeat this question.
- After all four fields are known, tell them the report is ready and invite them to continue on the next step.
- Never invent facts. If the citizen's answer is unclear, gently ask again in different words, but do not loop on the same question after a direct answer has already been given.

When the citizen's message clearly identifies the problem, you may also fill in the hidden fields below. Reply ONLY with compact JSON — no markdown fences:
{
  "reply": "your spoken reply in the citizen's language",
  "issueType": "one of: pothole | garbage | streetlight | water_leak | drainage | road_damage | stray_animal | traffic_signal | encroachment | other (or null if unknown)",
  "severity": "low | medium | high | critical (or null if not yet clear)",
  "title": "a short 4-8 word English label for the report (or null)"
}`;

export const chatTurn = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    language: v.string(),
  },
  handler: async (_ctx, { messages, language }) => {
    const result = await completion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT.replace("{language}", language) },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      temperature: 0.7,
      maxTokens: 400,
    });

    if (!result.success || !result.data?.choices?.[0]?.message?.content) {
      throw new Error("The civic agent is unavailable right now. Please try again in a moment.");
    }

    const raw = result.data.choices[0].message.content.trim();

    // Parse the hidden fields out of the JSON reply.
    let parsed: AiTurnResult = { reply: raw, issueType: null, severity: null, title: null };
    try {
      const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const obj = JSON.parse(jsonText);
      if (typeof obj.reply === "string" && obj.reply.length > 0) {
        parsed = {
          reply: obj.reply,
          issueType: typeof obj.issueType === "string" ? obj.issueType : null,
          severity: ["low", "medium", "high", "critical"].includes(obj.severity)
            ? obj.severity
            : null,
          title: typeof obj.title === "string" ? obj.title : null,
        };
      }
    } catch {
      // Model replied in plain text; keep it as the reply.
    }

    return parsed;
  },
});
