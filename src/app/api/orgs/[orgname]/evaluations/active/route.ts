import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request, { params }: { params: Promise<{ orgname: string }> }) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgname } = await params;

  const { data, error } = await supabaseAdmin
    .from("org_evaluations")
    .select("id, orgUsername, templateId, school_year, active, archived, created_at")
    .eq("orgUsername", orgname)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ evaluation: data?.[0] || null });
}
