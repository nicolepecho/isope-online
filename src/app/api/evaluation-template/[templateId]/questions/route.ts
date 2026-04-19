import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;
const allowedTypes = new Set(["input", "dropdown", "likert", "checkbox"]);

export async function PUT(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const token = await getToken({ req: req as any, secret });
  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "osas") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId } = await params;

  const body = await req.json();
  const questions = Array.isArray(body?.questions) ? body.questions : null;
  if (!questions) return NextResponse.json({ error: "Missing questions" }, { status: 400 });

  for (const q of questions) {
    if (!q?.type || !allowedTypes.has(q.type)) return NextResponse.json({ error: "Invalid question type" }, { status: 400 });
    if (!q?.text || !q.text.toString().trim()) return NextResponse.json({ error: "Question text required" }, { status: 400 });
    if ((q.type === "dropdown" || q.type === "checkbox") && !Array.isArray(q.options)) {
      return NextResponse.json({ error: "Options must be an array for dropdown/checkbox" }, { status: 400 });
    }
    if (q.type === "likert" && (typeof q.scale !== "number" || q.scale < 2 || q.scale > 10)) {
      return NextResponse.json({ error: "Likert scale must be 2–10" }, { status: 400 });
    }
  }

  const { error: deactivateErr } = await supabaseAdmin
    .from("evaluation_template_questions")
    .update({ active: false })
    .eq("templateId", templateId);

  if (deactivateErr) return NextResponse.json({ error: deactivateErr.message }, { status: 500 });

  const payload = questions.map((q: any, idx: number) => ({
    templateId,
    type: q.type,
    text: q.text,
    options: q.type === "dropdown" || q.type === "checkbox" ? (q.options || []) : null,
    scale: q.type === "likert" ? (q.scale || 5) : null,
    sort_order: typeof q.sort_order === "number" ? q.sort_order : idx,
    active: true,
  }));

  const { error: insErr } = await supabaseAdmin.from("evaluation_template_questions").insert(payload);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
