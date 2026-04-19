"use client";

import { useEffect, useState } from "react";
import { getSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupCompletePage() {
  const [status, setStatus] = useState("Finalizing...");
  const router = useRouter();

  useEffect(() => {
    async function finalize() {
      try {
        // read temp cookie
        const match = document.cookie.match(new RegExp("(^| )signup_temp=([^;]+)"));
        if (!match) {
          setStatus("No signup info found. Please sign up again.");
          return;
        }
        const temp = JSON.parse(decodeURIComponent(match[2]));
        const session = await getSession();
        if (!session?.user?.email) {
          setStatus("Not signed in. Please sign up again.");
          return;
        }

        const res = await fetch("/api/complete-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenless: true,
            username: temp.username,
            password: temp.password,
            email: session.user.email,
          }),
        });

        if (res.ok) {
          // clear cookie
          document.cookie = "signup_temp=; path=/; max-age=0";
          router.push("/dashboard");
        } else {
          const text = await res.text();
          // clear temp, sign out, and redirect to login with error
          document.cookie = "signup_temp=; path=/; max-age=0";
          await signOut({ redirect: false });
          // Use router instead of signOut's callbackUrl to avoid redirect loops
          router.push(`/login?error=${encodeURIComponent(text)}`);
          setStatus("Failed: " + text);
        }
      } catch (err: any) {
        setStatus("Error: " + (err.message ?? String(err)));
      }
    }

    finalize();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">{status}</p>
      </div>
    </div>
  );
}
