import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgEvaluationId: string }> }
) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  if (role !== "osas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgEvaluationId } = await params;

  // Verify the evaluation exists
  const { data: orgEval, error: eErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, templateId")
    .eq("id", orgEvaluationId)
    .single();

  if (eErr || !orgEval) return NextResponse.json({ error: "Evaluation not found" }, { status: 404 });

  // Fetch all responses for this evaluation
  const { data: responses, error: rErr } = await supabaseAdmin
    .from("org_evaluation_responses")
    .select("answers, submitted, memberId")
    .eq("orgEvaluationId", orgEvaluationId);

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const allResponses = responses || [];

  // Collect the union of answered question IDs (same logic as questions route)
  const answeredIds = new Set<string>();
  for (const r of allResponses) {
    const ans = r.answers as Record<string, any> | null;
    if (ans && typeof ans === "object") {
      Object.keys(ans).forEach((k) => answeredIds.add(k));
    }
  }

  if (answeredIds.size === 0) {
    return NextResponse.json({ summary: [], totalResponses: allResponses.length });
  }

  // Fetch questions in sort order
  const { data: questions, error: qErr } = await supabaseAdmin
    .from("evaluation_template_questions")
    .select("id, type, text, options, scale, sort_order")
    .in("id", Array.from(answeredIds))
    .order("sort_order", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // Compute per-question summary
  const summary = (questions || []).map((q) => {
    // Collect each member's answer for this question (skip missing/null/empty)
    const questionAnswers = allResponses
      .map((r) => {
        const ans = r.answers as Record<string, any> | null;
        return ans ? ans[q.id] : undefined;
      })
      .filter((a) => a !== undefined && a !== null && a !== "");

    const base = {
      id: q.id,
      type: q.type as string,
      text: q.text as string,
      responseCount: questionAnswers.length,
      totalResponses: allResponses.length,
    };

    if (q.type === "input") {
      return {
        ...base,
        responses: questionAnswers.map((a) => String(a)),
      };
    }

    if (q.type === "dropdown") {
      const distribution: Record<string, number> = {};
      for (const a of questionAnswers) {
        const val = String(a);
        distribution[val] = (distribution[val] || 0) + 1;
      }
      return { ...base, distribution };
    }

    if (q.type === "checkbox") {
      const distribution: Record<string, number> = {};
      for (const a of questionAnswers) {
        const arr = Array.isArray(a) ? a : [];
        for (const item of arr) {
          const val = String(item);
          distribution[val] = (distribution[val] || 0) + 1;
        }
      }
      return { ...base, distribution };
    }

    if (q.type === "likert") {
      const scale = (q.scale as number) ?? 5;
      const nums = questionAnswers
        .map((a) => Number(a))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= scale);
      const average =
        nums.length > 0
          ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
          : null;
      const distribution: Record<string, number> = {};
      for (const n of nums) {
        distribution[String(n)] = (distribution[String(n)] || 0) + 1;
      }
      return { ...base, scale, average, distribution };
    }

    return base;
  });

  return NextResponse.json({ summary, totalResponses: allResponses.length });
}
