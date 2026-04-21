import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;

  const { data, error } = await supabaseAdmin
    .from("member")
    .select("id, student_name, organizations")
    .eq("id", Number(memberId))
    .single();

  if (error || !data) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ id: data.id, student_name: data.student_name, organizations: data.organizations });
}
