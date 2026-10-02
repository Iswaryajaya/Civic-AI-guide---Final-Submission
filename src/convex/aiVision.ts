import { v } from "convex/values";
import { action } from "./_generated/server";
import { vly } from "../lib/vly-integrations";

interface CompletionResult {
  success: boolean;
  data?:
    | { choices?: Array<{ message?: { role: string; content: string }; finishReason?: string }> }
    | undefined;
  error?: string;
}

// The gateway accepts OpenAI-style multimodal message content at runtime even
// though the bundled .d.ts types it as string-only.
const completion = vly.ai.completion.bind(vly.ai) as (request: {
  model?: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;
  }>;
  temperature?: number;
  maxTokens?: number;
}) => Promise<CompletionResult>;

export interface ImageAnalysis {
  valid: boolean;
  detectedIssue: string | null;
  description: string;
  severity: "low" | "medium" | "high" | "critical" | null;
}

const VISION_PROMPT = `You are the computer-vision module of a civic complaint system. Look at the photo and decide whether it shows a real civic infrastructure problem.

Civic problems look like: potholes or broken roads, garbage piles or overflowing bins, broken or dark streetlights, open manholes, water leaks or flooding, clogged drains, fallen trees or debris, damaged public property, stray cattle or dogs on roads, broken footpaths, illegal dumping.

Reply ONLY with compact JSON:
{
  "valid": true if the photo clearly shows a civic problem, false otherwise,
  "detectedIssue": "one of: pothole | garbage | streetlight | water_leak | drainage | road_damage | stray_animal | traffic_signal | encroachment | other (or null)",
  "description": "one sentence in simple English describing what you see",
  "severity": "low | medium | high | critical (or null if not visible)"
}

If valid is false, still write a short, kind description of what the photo shows instead (e.g. "This looks like a personal photo / an empty wall / a document — it does not show a civic problem.")`;

export const analyzeImage = action({
  args: { imageBase64: v.string(), mimeType: v.string() },
  handler: async (_ctx, { imageBase64, mimeType }) => {
    const result = await completion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      maxTokens: 300,
    });

    if (!result.success || !result.data?.choices?.[0]?.message?.content) {
      throw new Error("Could not analyze the image. Please try again.");
    }

    const raw = result.data.choices[0].message.content.trim();
    const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const obj = JSON.parse(jsonText);

    return {
      valid: obj.valid === true,
      detectedIssue: typeof obj.detectedIssue === "string" ? obj.detectedIssue : null,
      description: typeof obj.description === "string" ? obj.description : "",
      severity: ["low", "medium", "high", "critical"].includes(obj.severity)
        ? obj.severity
        : null,
    } as ImageAnalysis;
  },
});
