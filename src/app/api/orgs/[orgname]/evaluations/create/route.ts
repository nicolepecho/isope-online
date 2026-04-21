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

  const body = await req.json().catch(() => ({}));
  const incomingTemplateId: string | null = body?.templateId || null;

  const { data: existingRows, error: exErr } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, orgUsername, templateId, active")
    .eq("orgUsername", orgname)
    .eq("active", true)
    .order("id", { ascending: false })
    .limit(1);

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0];
    if (incomingTemplateId && existing.templateId !== incomingTemplateId) {
      await supabaseAdmin
        .from("org_evaluations")
        .update({ templateId: incomingTemplateId })
        .eq("id", existing.id);
      existing.templateId = incomingTemplateId;
    }
    return NextResponse.json({ evaluation: existing });
  }

  const templateId = incomingTemplateId;
  if (!templateId) return NextResponse.json({ error: "No active evaluation template found" }, { status: 400 });

  const { data: created, error: cErr } = await supabaseAdmin
    .from("org_evaluations")
    .insert({
      orgUsername: orgname,
      templateId: templateId,
      active: true,
      archived: false,
      school_year: null,
    })
    .select("id, orgUsername, templateId, active")
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({ evaluation: created });
}
