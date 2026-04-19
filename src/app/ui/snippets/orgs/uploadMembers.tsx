"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function UploadMembersModal() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/members/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Upload failed");
    } else {
      setMessage(`✅ ${data.count} members imported`);
      setFile(null);
    }
  }
  const downloadTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["student_name", "organizations", "school_year"],
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    XLSX.writeFile(workbook, "members_template.xlsx");
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="bg-[#014fb3]  text-white px-4 py-2 rounded hover:bg-blue-700 text-sm cursor-pointer"
      >
        Upload Members
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-black">
                Upload Members (Excel)
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-black-500 cursor-pointer hover:text-red-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Download template button */}
      <button
        onClick={downloadTemplate}
        className="
          inline-flex items-center justify-center gap-2
          px-6 py-1 rounded-l
          border border-gray-300
          bg-white
          text-gray-700 text-sm font-medium
          shadow-sm
          transition
          hover:bg-gray-50 hover:border-gray-400
          active:scale-[0.97]
          cursor-pointer
        "
      >
        Download Excel Template
      </button>
            <input
            className="w-50 py-1 bg-gray-500 text-white rounded disabled:opacity-50 cursor-pointer hover:bg-gray-700 text-l "
              type="file"
              accept=".xlsx"
              onChange={(e) =>
                setFile(e.target.files?.[0] ?? null)
              }
            />

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full py-2 bg-[#014fb3] text-white rounded enabled:cursor-pointer enabled:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" 
            >
              {loading ? "Uploading..." : "Upload"}
            </button>

            {message && (
              <p className="text-sm text-center">{message}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
