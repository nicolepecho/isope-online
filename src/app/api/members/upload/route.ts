import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabase } from "@/app/lib/database";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
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
    organizations: String(row.organizations).trim(),
    school_year: String(row.school_year).trim(),
  }));
  console.log(rows);
  // Filter out invalid rows
  const validMembers = members.filter(
    (m) => m.student_name && m.organizations.toLowerCase() && m.school_year
  );

  if (validMembers.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("member")
    .upsert(validMembers);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ count: validMembers.length });
}
