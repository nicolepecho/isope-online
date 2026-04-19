import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: Request, { params }: { params: Promise<{ orgname: string }> }) {
  const token = await getToken({ req: req as any, secret });
  const role = ((token as any)?.role || "").toString().trim().toLowerCase();

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "osas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orgname } = await params;

  const { data: existing, error: exErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, orgUsername, templateId, active")
    .eq("orgUsername", orgname)
    .eq("active", true)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (existing) return NextResponse.json({ evaluation: existing });

  const { data: template, error: tErr } = await supabaseAdmin
    .from("evaluation_templates")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!template) return NextResponse.json({ error: "No active evaluation template found" }, { status: 400 });

  const { data: created, error: cErr } = await supabaseAdmin
    .from("org_evaluations")
    .insert({
      orgUsername: orgname,
      templateId: template.id,
      active: true,
      archived: false,
      school_year: null,
    })
    .select("id, orgUsername, templateId, active")
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({ evaluation: created });
}
