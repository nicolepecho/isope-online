import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request, { params }: { params: Promise<{ orgEvaluationId: string; memberId: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgEvaluationId, memberId: memberIdStr } = await params;
  const memberId = Number(memberIdStr);

  const { data, error } = await supabaseAdmin
    .from("org_evaluation_responses")
    .select("id, orgEvaluationId, orgUsername, memberId, respondentEmail, answers, submitted, updated_at")
    .eq("orgEvaluationId", orgEvaluationId)
    .eq("memberId", memberId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ response: data || null });
}

export async function PUT(req: Request, { params }: { params: Promise<{ orgEvaluationId: string; memberId: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  const email = ((token as any)?.email || "").toString();

  const { orgEvaluationId, memberId: memberIdStr } = await params;
  const memberId = Number(memberIdStr);

  const body = await req.json();
  const answers = body?.answers ?? {};
  const submitted = Boolean(body?.submitted);

  const { data: orgEval, error: eErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, orgUsername")
    .eq("id", orgEvaluationId)
    .single();

  if (eErr || !orgEval) return NextResponse.json({ error: "Org evaluation not found" }, { status: 404 });

  const payload = {
    orgEvaluationId,
    orgUsername: orgEval.orgUsername,
    memberId,
    respondentEmail: email || null,
    answers,
    submitted,
  };

  const { error } = await supabaseAdmin
    .from("org_evaluation_responses")
    .upsert(payload, { onConflict: "orgEvaluationId,memberId" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
    