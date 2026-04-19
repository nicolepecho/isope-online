"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { QType, Question } from "@/app/lib/evaluationData";
import OsasEvaluationView from "@/app/ui/snippets/evaluation/OsasEvaluationView";
import { ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text();
  throw new Error(`Non-JSON response (${res.status}). Body:\n${text.slice(0, 300)}`);
}

export default function Page({ params }: { params: Promise<{ orgname: string }> }) {
  const { orgname } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const rawRole = ((session?.user as any)?.role || "").toString().trim().toLowerCase();
  const isOSAS = rawRole === "osas";

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({ page: true, saving: false });

  const [templateId, setTemplateId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedType, setSelectedType] = useState<QType>("input");

  const goToMembers = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/orgs/${orgname}?tab=Members`);
  };


  useEffect(() => {
    const boot = async () => {
      try {
        setError(null);

        if (status === "loading") {
          setLoading((p) => ({ ...p, page: true }));
          return;
        }

        if (!session) {
          setError("You must be logged in.");
          setLoading((p) => ({ ...p, page: false }));
          return;
        }

        if (!isOSAS) {
          setError("Only OSAS can edit the evaluation template.");
          setLoading((p) => ({ ...p, page: false }));
          return;
        }

        const res = await fetch(`/api/evaluation-template/active`);
        const json = await readJsonSafe(res);

        if (!res.ok) throw new Error(json?.error || "Failed to load template");

        setTemplateId(json?.template?.id || null);

        const mapped = (json?.questions || []).map((q: any) => ({
          id: q.id,
          type: q.type,
          text: q.text,
          options: q.options || undefined,
          scale: q.scale ?? undefined,
        })) as Question[];

        setQuestions(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load template");
      } finally {
        setLoading((p) => ({ ...p, page: false }));
      }
    };

    boot();
  }, [status, session]);

  function addQuestion() {
    const id = crypto.randomUUID();

    const base: Question = { id, type: selectedType, text: "Untitled question" };

    if (selectedType === "dropdown" || selectedType === "checkbox") {
      base.options = ["Option 1", "Option 2"];
    }
    if (selectedType === "likert") {
      base.scale = 5;
    }

    setQuestions((s) => [...s, base]);
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((s) => s.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((s) => s.filter((q) => q.id !== id));
  }

  function addOption(id: string) {
    setQuestions((s) =>
      s.map((q) => {
        if (q.id !== id) return q;
        const next = [...(q.options || [])];
        next.push(`Option ${next.length + 1}`);
        return { ...q, options: next };
      })
    );
  }

  function updateOption(id: string, idx: number, value: string) {
    setQuestions((s) =>
      s.map((q) => {
        if (q.id !== id) return q;
        const next = [...(q.options || [])];
        next[idx] = value;
        return { ...q, options: next };
      })
    );
  }

  function removeOption(id: string, idx: number) {
    setQuestions((s) =>
      s.map((q) => {
        if (q.id !== id) return q;
        const next = [...(q.options || [])];
        next.splice(idx, 1);
        return { ...q, options: next };
      })
    );
  }

  const saveForm = async () => {
  try {
    setError(null);
    if (!templateId) throw new Error("No active template found.");

    setLoading((p) => ({ ...p, saving: true }));

    const payload = questions.map((q, idx) => ({
      type: q.type,
      text: q.text,
      options: q.options || [],
      scale: q.scale,
      sort_order: idx,
    }));

    const res = await fetch(
      `/api/evaluation-template/${encodeURIComponent(templateId)}/questions`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: payload }),
      }
    );

    const json = await readJsonSafe(res);
    if (!res.ok) throw new Error(json?.error || "Failed to save template questions");

    const res2 = await fetch(
      `/api/orgs/${encodeURIComponent(orgname)}/evaluations/create`,
      { method: "POST" }
    );

    const json2 = await readJsonSafe(res2);
    if (!res2.ok) throw new Error(json2?.error || "Failed to create org evaluation instance");

    alert("Success: Evaluation template saved.");
    router.push(`/dashboard/orgs/${orgname}?tab=Members`);
  } catch (err: any) {
    console.error(err);

    const message = err.message || "Failed to save template";

    alert(`Error: ${message}`);
    setError(message);
  } finally {
    setLoading((p) => ({ ...p, saving: false }));
  }
};


  if (loading.page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <p className="text-gray-900">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {error && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-6">
        <button
          onClick={goToMembers}
          className="flex items-center gap-2 text-gray-900 hover:text-blue-[#014fb3] transition-colors cursor-pointer"
        >
          <ArrowUturnLeftIcon className="w-5 h-5" />
        </button>

        <h1 className="text-2xl font-bold text-gray-900">Edit Evaluation</h1>
      </div>

        <OsasEvaluationView
          questions={questions}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          addQuestion={addQuestion}
          saveForm={saveForm}
          updateQuestion={updateQuestion}
          removeQuestion={removeQuestion}
          addOption={addOption}
          updateOption={updateOption}
          removeOption={removeOption}
        />
      </div>
    </div>
  );
}
