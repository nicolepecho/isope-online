import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/app/lib/database";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: Request) {
  // Identity check — must be logged in
  const token = await getToken({ req: req as any, secret });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Role check — only OSAS can upload members
  const role = ((token as any)?.role || "").toString().trim().toLowerCase();
  if (role !== "osas") {
    return NextResponse.json({ error: "Access denied. Only OSAS can upload members." }, { status: 403 });
  }

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
   * student_name | school_year | email
   * email is optional but strongly recommended — used to link
   * member records to user accounts without relying on name casing.
   */
  const members = rows.map((row: any) => ({
    student_name: String(row.student_name ?? '').trim(),
    organizations: orgname,
    school_year: String(row.school_year ?? '').trim(),
    email: row.email ? String(row.email).trim().toLowerCase() : null,
  }));
  // Filter out invalid rows (name and school year are required)
  const validMembers = members.filter(
    (m) => m.student_name && m.school_year
  );

  if (validMembers.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found" },
      { status: 400 }
    );
  }

  // Fetch existing members for this org to avoid duplicates
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("member")
    .select("student_name, email")
    .eq("organizations", orgname);

  if (fetchError) {
    console.error(fetchError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const existingEmails = new Set(
    (existing || [])
      .filter((m: any) => m.email)
      .map((m: any) => m.email.trim().toLowerCase())
  );
  const existingNames = new Set(
    (existing || []).map((m: any) => m.student_name.trim().toLowerCase())
  );

  // If the row has an email, deduplicate by email; otherwise fall back to name
  const newMembers = validMembers.filter((m) =>
    m.email
      ? !existingEmails.has(m.email)
      : !existingNames.has(m.student_name.toLowerCase())
  );
  const skipped = validMembers.length - newMembers.length;

  if (newMembers.length === 0) {
    return NextResponse.json({ count: 0, skipped, message: "All members already exist" });
  }

  const { error } = await supabaseAdmin
    .from("member")
    .insert(newMembers);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ count: newMembers.length, skipped });
}
