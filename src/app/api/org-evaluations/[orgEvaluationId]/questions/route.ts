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
    .select("id, templateId")
    .eq("id", orgEvaluationId)
    .single();

  if (eErr || !orgEval) return NextResponse.json({ error: "Org evaluation not found" }, { status: 404 });

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("evaluation_template_questions")
    .select("id, type, text, options, scale, sort_order")
    .eq("templateId", orgEval.templateId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({ questions: questions || [] });
}
