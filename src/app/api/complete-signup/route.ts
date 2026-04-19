import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/database";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {

    const body = await req.json();
    const { username, password, email } = body;
    if (!username || !password || !email) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    // check if username already exists
    const { data: existingUsername } = await supabase
      .from("users")
      .select("id")
      .eq("Username", username)
      .maybeSingle();

    if (existingUsername) {
      return new NextResponse("Username already exists", { status: 400 });
    }

    // check if email already has a username (signup already completed)
    const { data: emailWithUsername } = await supabase
      .from("users")
      .select("Username")
      .eq("Email", email)
      .maybeSingle();

    if (emailWithUsername?.Username) {
      return new NextResponse("User already exists", { status: 400 });
    }

    // bcrypt the password on the server
    const hashed = await bcrypt.hash(password, 10);

    // update users table with username and bcrypt-hashed password
    const { data, error } = await supabase
      .from("users")
      .update({ Username: username, PasswordHash: hashed })
      .eq("Email", email);

    if (error) {
      console.error("Supabase update error:", error);
      return new NextResponse("DB update failed", { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return new NextResponse(err?.message ?? "error", { status: 500 });
  }
}
