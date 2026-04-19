"use client";

import Navbar from "@/app/ui/snippets/navbar";
import { ReactNode } from "react";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navbar */}
      <Navbar />

      {/* Page content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {/* Children take full width, natural height */}
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
