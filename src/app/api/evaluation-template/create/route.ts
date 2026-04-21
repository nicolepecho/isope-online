import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: Request) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin
    .from("evaluation_templates")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return NextResponse.json({ id: existing.id });

  const { data, error } = await supabaseAdmin
    .from("evaluation_templates")
    .insert({ title: "Evaluation Template", instructions: "Answer the form", active: true })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
