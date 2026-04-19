import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: template, error: tErr } = await supabaseAdmin
    .from("evaluation_templates")
    .select("id, title, instructions, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!template) return NextResponse.json({ template: null, questions: [] });

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("evaluation_template_questions")
    .select("id, templateId, type, text, options, scale, sort_order, active")
    .eq("templateId", template.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  return NextResponse.json({ template, questions: questions || [] });
}
