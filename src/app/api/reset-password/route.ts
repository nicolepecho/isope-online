import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/app/lib/database";
import { verifyPasswordResetToken } from "@/app/lib/resetToken";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");

    if (!token || !password) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    const email = verifyPasswordResetToken(token);
    if (!email) {
      return new NextResponse("Invalid or expired token", { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .update({ PasswordHash: hashed })
      .eq("Email", email)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error("Supabase update error:", error);
      return new NextResponse("Password reset failed", { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return new NextResponse("Password reset failed", { status: 500 });
  }
}
