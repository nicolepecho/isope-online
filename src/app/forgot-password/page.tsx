"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const responseText = await response.text();
      console.log("Forgot-password response:", response.status, responseText);
      if (!response.ok) {
        throw new Error(responseText || "Failed to send reset email");
      }

      setMessage("If that email exists, a reset link has been sent.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <header className="bg-[#014FB3] text-white flex items-center justify-center py-6 shadow-md ">
        <img
          src="/img/iaclogolong.png"
          alt="Logo"
          className="w-48 h-auto object-contain items-center"
        />
        <h1 className="text-2xl md:text-3xl font-bold">iSOPE Online</h1>
      </header>

      <div className="flex flex-col items-center justify-center h-64 mt-20 mb-5">
        <div className="border-8 border-blue-500 px-10 py-10 rounded-lg space-y-4 text-center w-full max-w-md">
          <p className="text-black font-bold">iACADEMY</p>
          <p className="text-black font-bold">iSOPE Online</p>
          <div className="w-full h-px bg-blue-500 my-2"></div>
          <p className="text-black text-3xl">Forgot password</p>

          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            <input
              className="w-full border px-3 py-2 rounded text-black"
              placeholder="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-[#014fb3] text-white px-4 py-2 rounded w-full cursor-pointer hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {message && <p className="text-green-600 text-sm">{message}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={() => router.push("/login")}
            className="text-[#014fb3] text-sm hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}