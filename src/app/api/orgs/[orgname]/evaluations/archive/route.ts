import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: Request, { params }: { params: Promise<{ orgname: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  if (role !== "osas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgname } = await params;

  // Confirm there is at least one active evaluation to archive and grab its templateId
  const { data: activeEvals, error: evalErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, templateId")
    .eq("orgUsername", orgname)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (evalErr) return NextResponse.json({ error: evalErr.message }, { status: 500 });
  if (!activeEvals || activeEvals.length === 0) {
    return NextResponse.json({ error: "No active evaluation found for this org" }, { status: 404 });
  }

  const templateId: string = activeEvals[0].templateId;

  // Derive the next school year by iterating forward from the last archived year,
  // the same way requirements archiving iterates through years.
  // If nothing has been archived yet, fall back to the current calendar year.
  const { data: lastArchived } = await supabaseAdmin
    .from("org_evaluations")
    .select("school_year")
    .eq("orgUsername", orgname)
    .eq("archived", true)
    .not("school_year", "is", null)
    .order("school_year", { ascending: false })
    .limit(1);

  const lastYear: number | null = lastArchived?.[0]?.school_year ?? null;
  const school_year: number = lastYear !== null ? lastYear + 1 : new Date().getFullYear();

  // Archive ALL active evaluations for this org in one update.
  // This also self-heals any duplicate active rows that shouldn't exist.
  const { error: updateErr } = await supabaseAdmin
    .from("org_evaluations")
    .update({
      active: false,
      archived: true,
      school_year,
      archived_at: new Date().toISOString(),
    })
    .eq("orgUsername", orgname)
    .eq("active", true);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Immediately create a new active evaluation with the same template so members
  // can continue submitting — mirroring how requirements stay active after archiving.
  const { data: newEval, error: createErr } = await supabaseAdmin
    .from("org_evaluations")
    .insert({
      orgUsername: orgname,
      templateId,
      active: true,
      archived: false,
      school_year: null,
    })
    .select("id")
    .single();

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });

  return NextResponse.json({ success: true, newEvaluationId: newEval.id });
}
