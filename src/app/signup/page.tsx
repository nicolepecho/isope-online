"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

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

      <div className="flex flex-col items-center mt-20 mb-5">
        <div className="border-8 border-blue-500 px-20 py-10 rounded-lg space-y-4 text-center w-full max-w-md">
          <p className="text-black font-bold">iACADEMY</p>
          <p className="text-black font-bold">iSOPE Online</p>
          <div className="w-full h-px bg-blue-500 my-4"></div>
          <p className="text-black text-3xl">Create an account</p>
          <p className="text-black">Please enter your details to sign up.</p>

          <div className="space-y-2 mt-4 text-left">
            <input
              className="w-full border px-3 py-2 rounded text-black placeholder:text-gray-400"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              className="w-full border px-3 py-2 rounded text-black placeholder:text-gray-400"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            onClick={async () => {
              if (!username || !password) return alert("Enter username & password");
              // store temp signup info (password sent to server to be bcrypt'd)
              const temp = { username, password };
              document.cookie = `signup_temp=${encodeURIComponent(JSON.stringify(temp))}; path=/; max-age=600`;
              // start OAuth flow and return to /signup/complete where we'll finalize
              signIn("google", { callbackUrl: `${window.location.origin}/signup/complete` });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-3 w-full cursor-pointer
            hover:bg-blue-700"
          >
            Create Account
          </button>
          <button
            onClick={() => router.push("/login")}
            className="bg-gray-200 text-black px-4 py-2 rounded mt-3 w-full cursor-pointer
            hover:bg-gray-300"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}