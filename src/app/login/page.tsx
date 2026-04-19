"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleCredentialsLogin = async () => {
    const res = await signIn("credentials", {
      redirect: false,
      username,
      password,
    } as any);
    if (res && (res as any).error) {
      alert((res as any).error || "Login failed");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="bg-white min-h-screen">
      <header className="bg-[#014FB3] text-white flex items-center justify-center py-6 shadow-md">
        <img
          src="/img/iaclogolong.png"
          alt="Logo"
          className="w-48 h-auto object-contain items-center"
        />

        <h1 className="text-2xl md:text-3xl font-bold">iSOPE Online</h1>
      </header>

      <div className="flex flex-col items-center justify-center h-64 mt-20 mb-5">
        <div className="mt-50 border-8 border-blue-500 px-10 py-10 rounded-lg space-y-2 text-center w-full max-w-md">
          <p className="text-black font-bold">iACADEMY</p>
          <p className="text-black font-bold">iSOPE Online</p>
          <Suspense fallback={null}>
            <LoginErrorMessage />
          </Suspense>
          <div className="w-full h-px bg-blue-500 my-4"></div>
          <p className="text-black text-3xl">Sign in</p>
          <div className="space-y-2 mt-4 text-left">
            <input
              className="w-full border px-3 py-2 rounded text-black placeholder:text-gray-500"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className="w-full border px-3 py-2 rounded text-black placeholder:text-gray-500"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCredentialsLogin}
              className="bg-[#014fb3] text-white px-4 py-2 rounded w-1/2 cursor-pointer hover:bg-gray-800"
            >
              Login
            </button>

            <button
              onClick={() => router.push("/signup")}
              className="bg-gray-200 text-black px-4 py-2 rounded w-1/2 cursor-pointer hover:bg-gray-500"
            >
              Create account
            </button>
          </div>

          <div className="my-3 text-black">or</div>
          <button onClick={() => signIn("google")} className="bg-red-500 text-white px-4 py-2 rounded cursor-pointer w-full hover:bg-red-700">Sign in with Google</button>
          <div className="mt-2 text-sm">
            <a href="/forgot-password" className="text-[#014fb3] hover:underline">Forgot password?</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginErrorMessage() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  
  // Handle signup-specific errors
  if (error === "Username already exists") {
    return <p className="text-red-500">Username already exists</p>;
  }
  if (error === "User already exists") {
    return <p className="text-red-500">User already exists</p>;
  }
  if (error === "unauthorized") {
    return <p className="text-red-500">Only iAcademy accounts are allowed.</p>;
  }
  
  // Generic error message
  return <p className="text-red-500">{decodeURIComponent(error)}</p>;
}