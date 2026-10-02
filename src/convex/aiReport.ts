import { v } from "convex/values";
import { action } from "./_generated/server";
import { vly } from "../lib/vly-integrations";

const completion = vly.ai.completion.bind(vly.ai);

export interface AiReport {
  title: string;
  summary: string;
  observations: string;
  recommendedAction: string;
  riskNote: string;
  issueType: string;
  severity: "low" | "medium" | "high" | "critical";
}

const REPORT_PROMPT = `You are writing the official structured report for a civic complaint, to be reviewed by a municipal authority. Use simple, formal English.

Reply ONLY with compact JSON:
{
  "title": "short 4-8 word report title",
  "summary": "2-3 sentence summary: what the problem is, where exactly (use the landmark and address), since when, and who is affected",
  "observations": "what the evidence photos show, in 1-2 sentences",
  "recommendedAction": "the concrete municipal action needed, 1-2 sentences",
  "riskNote": "the public-safety risk if not fixed soon, 1 sentence",
  "issueType": "one of: pothole | garbage | streetlight | water_leak | drainage | road_damage | stray_animal | traffic_signal | encroachment | other",
  "severity": "low | medium | high | critical"
}`;

export const generateReport = action({
  args: {
    transcript: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    imageDescriptions: v.array(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    language: v.string(),
  },
  handler: async (_ctx, args) => {
    const evidence = args.imageDescriptions.length
      ? args.imageDescriptions.map((d, i) => `Photo ${i + 1}: ${d}`).join("\n")
      : "No photos were provided.";

    const convo = args.transcript
      .map((m) => `${m.role === "user" ? "Citizen" : "Agent"}: ${m.content}`)
      .join("\n");

    const result = await completion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: REPORT_PROMPT },
        {
          role: "user",
          content: `Citizen's preferred language: ${args.language}\n\nConversation transcript:\n${convo}\n\nEvidence:\n${evidence}\n\nLocation: latitude ${args.lat}, longitude ${args.lng}${args.address ? `, address: ${args.address}` : ""}`,
        },
      ],
      temperature: 0.4,
      maxTokens: 700,
    });

    if (!result.success || !result.data?.choices?.[0]?.message?.content) {
      throw new Error("Could not generate the report. Please try again.");
    }

    const raw = result.data.choices[0].message.content.trim();
    const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const obj = JSON.parse(jsonText);

    return {
      title: String(obj.title ?? "Civic complaint"),
      summary: String(obj.summary ?? ""),
      observations: String(obj.observations ?? ""),
      recommendedAction: String(obj.recommendedAction ?? ""),
      riskNote: String(obj.riskNote ?? ""),
      issueType: String(obj.issueType ?? "other"),
      severity: ["low", "medium", "high", "critical"].includes(obj.severity)
        ? obj.severity
        : "medium",
    } as AiReport;
  },
});
