// app/api/test/orgs/route.ts
import { supabase } from "@/app/lib/database";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (username) {
    const { data, error } = await supabase
      .from("orgs")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  }

  const { data, error } = await supabase.from("orgs").select("*");

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
