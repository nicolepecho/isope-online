import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request, { params }: { params: Promise<{ orgEvaluationId: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgEvaluationId } = await params;

  const { data: orgEval, error: eErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, templateId, archived")
    .eq("id", orgEvaluationId)
    .single();

  if (eErr || !orgEval) return NextResponse.json({ error: "Org evaluation not found" }, { status: 404 });

  // For live evaluations only show active questions.
  // For archived evaluations show only the questions that were actually answered
  // by at least one member — this prevents orphaned questions from previous
  // template test-edits from appearing in the archived view.
  let questionsQuery = supabaseAdmin
    .from("evaluation_template_questions")
    .select("id, type, text, options, scale, sort_order")
    .eq("templateId", orgEval.templateId)
    .order("sort_order", { ascending: true });

  if (!orgEval.archived) {
    questionsQuery = questionsQuery.eq("active", true);
  } else {
    // Collect the union of all question IDs that appear in any member's answers JSON
    const { data: responses } = await supabaseAdmin
      .from("org_evaluation_responses")
      .select("answers")
      .eq("orgEvaluationId", orgEvaluationId);

    const answeredIds = new Set<string>();
    for (const r of responses || []) {
      const ans = r.answers as Record<string, any> | null;
      if (ans && typeof ans === "object") {
        Object.keys(ans).forEach((k) => answeredIds.add(k));
      }
    }

    if (answeredIds.size > 0) {
      // Only show questions that at least one member answered
      questionsQuery = questionsQuery.in("id", Array.from(answeredIds));
    } else {
      // No answers at all — fall back to active questions
      questionsQuery = questionsQuery.eq("active", true);
    }
  }

  const { data: questions, error: qErr } = await questionsQuery;

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({ questions: questions || [] });
}
