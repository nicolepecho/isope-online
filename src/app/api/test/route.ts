// like index.js in sysinarch
import { supabase } from "@/app/lib/database";
import { NextResponse } from "next/server";

export async function GET() {
  // ⚠️ Replace 'products' with a table name that actually exists in your Supabase project
  // http://localhost:3000/api/test for sample
  const { data, error } = await supabase.from("req").select("*");

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
