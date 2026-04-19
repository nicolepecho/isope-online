import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/app/lib/database";
import { createPasswordResetToken } from "@/app/lib/resetToken";

const getTransporter = () => {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export async function POST(req: Request) {
  try {
    console.log("Forgot-password request received");
    const body = await req.json();
    const rawEmail = String(body?.email ?? "").trim();

    if (!rawEmail) {
      return new NextResponse("Email is required", { status: 400 });
    }

    const email = rawEmail.toLowerCase();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("Email")
      .eq("Email", email)
      .maybeSingle();

    if (userError) {
      console.error("User lookup failed:", userError);
      return new NextResponse("Failed to send reset email", { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = createPasswordResetToken(email);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      req.headers.get("origin") ||
      "";

    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const transporter = getTransporter();
    const from =
      process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "no-reply@isope.local";

    await transporter.verify();
    console.log("SMTP transport verified");

    const info = await transporter.sendMail({
      from,
      to: email,
      subject: "Reset your iSOPE Online password",
      html: `
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the link below to choose a new password:</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link will expire in 30 minutes. If you did not request a password reset, you can ignore this email.</p>
      `,
    });

    console.log("Email send response:", info);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return new NextResponse("Failed to send reset email", { status: 500 });
  }
}
