import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isOpenRouterConfigured, openRouterChat } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

function textValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function listValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => textValue(item))
      .filter((item): item is string => Boolean(item));
  }

  const text = textValue(value);
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isMissingTable(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message ?? "") : "";
  return message.includes("ops_call_transcripts") || message.includes("relation") || message.includes("PGRST106");
}

async function buildTranscriptSummary({
  title,
  area,
  transcript,
}: {
  title: string;
  area: string | null;
  transcript: string;
}) {
  if (!isOpenRouterConfigured()) return null;

  try {
    const result = await openRouterChat<{
      summary: string;
      tags: string[];
    }>({
      messages: [
        {
          role: "system",
          content:
            "Voce resume calls operacionais da FlyNow. Gere um resumo executivo curto, objetivo e acionavel em portugues. Extraia tags curtas e uteis.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title,
            area,
            transcript,
            instruction:
              "Resuma a call em no maximo 3 frases curtas e devolva ate 5 tags relevantes para analytics e operacao.",
          }),
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "flynow_transcript_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              tags: {
                type: "array",
                items: { type: "string" },
                maxItems: 5,
              },
            },
            required: ["summary", "tags"],
          },
        },
      },
    });

    return result;
  } catch (error) {
    console.error("[analytics/transcripts] Falha ao resumir com IA:", error);
    return null;
  }
}

export async function GET() {
  const analytics = createServiceClient().schema("analytics");
  const { data, error } = await analytics
    .from("ops_call_transcripts")
    .select("*")
    .order("happened_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ ok: true, configured: false, items: [] });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, configured: true, items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const happenedAt = textValue(body.happened_at);
  const title = textValue(body.title);
  const area = textValue(body.area);
  const transcript = textValue(body.transcript);
  let summary = textValue(body.summary);
  const uploadedBy = textValue(body.uploaded_by);
  const sourceKind = textValue(body.source_kind) ?? "manual";
  const sourceRef = textValue(body.source_ref);
  const participants = listValue(body.participants);
  const relatedProducts = listValue(body.related_products);
  let tags = listValue(body.tags);

  if (!title || !transcript) {
    return NextResponse.json(
      { ok: false, error: "title e transcript são obrigatórios" },
      { status: 400 },
    );
  }

  if (!summary || tags.length === 0) {
    const generated = await buildTranscriptSummary({ title, area, transcript });
    if (generated) {
      summary = summary ?? textValue(generated.summary);
      if (tags.length === 0) tags = generated.tags ?? [];
    }
  }

  const analytics = createServiceClient().schema("analytics");
  const { data, error } = await analytics
    .from("ops_call_transcripts")
    .insert({
      happened_at: happenedAt,
      title,
      area,
      participants,
      related_products: relatedProducts,
      tags,
      transcript,
      summary,
      uploaded_by: uploadedBy,
      source_kind: sourceKind,
      source_ref: sourceRef,
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json(
        {
          ok: false,
          code: "schema_pending",
          error: "A tabela analytics.ops_call_transcripts ainda não existe. Aplique a migration 017 no Supabase.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
