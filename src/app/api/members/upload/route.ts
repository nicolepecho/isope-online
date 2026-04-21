import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/database";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const orgname = formData.get("orgname") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!orgname) {
    return NextResponse.json({ error: "Missing org context" }, { status: 400 });
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Parse workbook
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows = XLSX.utils.sheet_to_json(sheet);

  /**
   * Expected Excel headers (strings):
   * student_name | organizations | school_year
   */
  const members = rows.map((row: any) => ({
    student_name: String(row.student_name).trim(),
    organizations: orgname,
    school_year: String(row.school_year).trim(),
  }));
  console.log(rows);
  // Filter out invalid rows
  const validMembers = members.filter(
    (m) => m.student_name && m.school_year
  );

  if (validMembers.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found" },
      { status: 400 }
    );
  }

  // Fetch existing member names for this org to avoid duplicates
  const { data: existing, error: fetchError } = await supabase
    .from("member")
    .select("student_name")
    .eq("organizations", orgname);

  if (fetchError) {
    console.error(fetchError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const existingNames = new Set(
    (existing || []).map((m) => m.student_name.trim().toLowerCase())
  );

  const newMembers = validMembers.filter(
    (m) => !existingNames.has(m.student_name.toLowerCase())
  );
  const skipped = validMembers.length - newMembers.length;

  if (newMembers.length === 0) {
    return NextResponse.json({ count: 0, skipped, message: "All members already exist" });
  }

  const { error } = await supabase
    .from("member")
    .insert(newMembers);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ count: newMembers.length, skipped });
}
