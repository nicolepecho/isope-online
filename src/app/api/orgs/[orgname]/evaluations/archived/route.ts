import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request, { params }: { params: Promise<{ orgname: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  if (role !== "osas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgname } = await params;
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));

  if (!year || isNaN(year)) {
    return NextResponse.json({ error: "Missing or invalid year" }, { status: 400 });
  }

  // Find the most recently archived evaluation for this org and school year.
  // Using limit(1) instead of maybeSingle() so multiple archived rows for the same year don't crash.
  const { data: archivedEvals, error: evalErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, school_year, archived_at")
    .eq("orgUsername", orgname)
    .eq("archived", true)
    .eq("school_year", year)
    .order("created_at", { ascending: false })
    .limit(1);

  if (evalErr) return NextResponse.json({ error: evalErr.message }, { status: 500 });
  const archivedEval = archivedEvals?.[0] ?? null;
  if (!archivedEval) return NextResponse.json({ evaluation: null, members: [] });

  // Fetch all current members of this org
  const { data: members, error: memberErr } = await supabaseAdmin
    .from("member")
    .select("id, student_name")
    .eq("organizations", orgname)
    .order("student_name", { ascending: true });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Fetch all responses for this archived evaluation
  const { data: responses, error: respErr } = await supabaseAdmin
    .from("org_evaluation_responses")
    .select("memberId, submitted")
    .eq("orgEvaluationId", archivedEval.id);

  if (respErr) return NextResponse.json({ error: respErr.message }, { status: 500 });

  // Map submission status by memberId
  const responseMap = new Map(
    (responses || []).map((r: { memberId: string | null; submitted: boolean | null }) => [r.memberId, r.submitted])
  );

  // Only show current members — deleted members are excluded from the archive view.
  // Their response records are retained in the database but not displayed.
  const memberList = (members || []).map((m: { id: string; student_name: string | null }) => ({
    id: m.id,
    student_name: m.student_name,
    submitted: responseMap.get(m.id) ?? false,
  }));

  return NextResponse.json({
    evaluation: {
      id: archivedEval.id,
      school_year: archivedEval.school_year,
      archived_at: archivedEval.archived_at,
    },
    members: memberList,
  });
}
