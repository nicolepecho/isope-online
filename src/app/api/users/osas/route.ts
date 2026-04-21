import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

async function requireOsas(req: Request) {
  const token = await getToken({ req: req as any, secret });
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if ((token.role as string)?.toLowerCase() !== "osas")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { token };
}

export async function GET(req: Request) {
  const { error } = await requireOsas(req);
  if (error) return error;

  const { data, error: dbError } = await supabaseAdmin
    .from("users")
    .select("id, Email, Name")
    .eq("Role", "osas")
    .order("id");

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req: Request) {
  const { error } = await requireOsas(req);
  if (error) return error;

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const emailTrimmed = email.trim();

  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id, Email, Name, Role")
    .eq("Email", emailTrimmed)
    .maybeSingle();

  if (existing) {
    if (existing.Role === "osas")
      return NextResponse.json({ error: "User is already an OSAS user" }, { status: 409 });

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ Role: "osas" })
      .eq("id", existing.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ user: { id: existing.id, Email: existing.Email, Name: existing.Name } });
  }

  // User doesn't exist yet — pre-register with just email
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({ Email: emailTrimmed, Name: emailTrimmed, Role: "osas" })
    .select("id, Email, Name")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ user: inserted });
}

export async function DELETE(req: Request) {
  const { token, error } = await requireOsas(req);
  if (error) return error;

  const { ids } = await req.json();
  if (!ids || ids.length === 0)
    return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

  // Prevent deleting yourself
  const currentEmail = token!.email as string;
  const { data: self } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("Email", currentEmail)
    .maybeSingle();

  if (self && ids.includes(self.id))
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .delete()
    .in("id", ids);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
