import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request, { params }: { params: Promise<{ orgEvaluationId: string; memberId: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  const { orgEvaluationId, memberId: memberIdStr } = await params;
  const memberId = Number(memberIdStr);

  if (role !== "osas") {
    const { data: member } = await supabaseAdmin
      .from("member")
      .select("student_name")
      .eq("id", memberId)
      .single();
    const memberName = (member?.student_name || "").toString().trim().toLowerCase();
    const tokenName = ((token as any)?.name || "").toString().trim().toLowerCase();
    if (!tokenName || tokenName !== memberName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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

  if (role !== "osas") {
    const { data: member } = await supabaseAdmin
      .from("member")
      .select("student_name")
      .eq("id", memberId)
      .single();
    const memberName = (member?.student_name || "").toString().trim().toLowerCase();
    const tokenName = ((token as any)?.name || "").toString().trim().toLowerCase();
    if (!tokenName || tokenName !== memberName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const answers = body?.answers ?? {};
  const submitted = Boolean(body?.submitted);

  const { data: orgEval, error: eErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, orgUsername")
    .eq("id", orgEvaluationId)
    .single();

  if (eErr || !orgEval) return NextResponse.json({ error: "Org evaluation not found" }, { status: 404 });

  const { data: existing } = await supabaseAdmin
    .from("org_evaluation_responses")
    .select("id")
    .eq("orgEvaluationId", orgEvaluationId)
    .eq("memberId", memberId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("org_evaluation_responses")
      .update({ answers, submitted, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin
      .from("org_evaluation_responses")
      .insert({
        orgEvaluationId,
        orgUsername: orgEval.orgUsername,
        memberId,
        respondentEmail: email || null,
        answers,
        submitted,
      });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
    