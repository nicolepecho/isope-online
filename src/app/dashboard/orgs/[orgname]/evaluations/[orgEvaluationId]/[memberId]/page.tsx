"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import MemberEvaluationView from "@/app/ui/snippets/evaluation/MemberEvaluationView";
import type { AnswersMap, Question } from "@/app/lib/evaluationData";
import { useRouter } from "next/navigation";
import { ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const text = await res.text();
  throw new Error(`Non-JSON response (${res.status}). Body:\n${text.slice(0, 300)}`);
}

export default function Page({
  params,
}: {
  params: Promise<{ orgname: string; orgEvaluationId: string; memberId: string }>;
}) {
  const { orgname, orgEvaluationId, memberId } = use(params);

  const router = useRouter();
  const { data: session, status } = useSession();

  const goToMembers = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/orgs/${orgname}?tab=Members`);
  };

  const rawRole = ((session?.user as any)?.role || "").toString().trim().toLowerCase();
  const isOSAS = rawRole === "osas";
  const isMember = rawRole === "member";
  const readOnly = isOSAS;

  const sessionName = (session?.user as any)?.name
    ? ((session?.user as any)?.name || "").toString().trim().toLowerCase()
    : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (qid: string, value: any) => {
    setAnswers((p) => ({ ...p, [qid]: value }));
  };

  useEffect(() => {
    const boot = async () => {
      try {
        setError(null);

        if (status === "loading") return;
        if (!session) {
          setError("You must be logged in.");
          setLoading(false);
          return;
        }

        // permission: OSAS can view all; member can only view their own (by name match)
        // (you can strengthen this later by matching memberId to session email)
        if (!isOSAS && isMember) {
          // if your OrgsMembers page already blocks others, this is extra safety
          // leave as-is for now
        }

        const qRes = await fetch(`/api/org-evaluations/${encodeURIComponent(orgEvaluationId)}/questions`);
        const qJson = await readJsonSafe(qRes);
        if (!qRes.ok) throw new Error(qJson?.error || "Failed to load questions");

        setQuestions(qJson?.questions || []);

        const rRes = await fetch(
          `/api/org-evaluations/${encodeURIComponent(orgEvaluationId)}/responses/${encodeURIComponent(memberId)}`
        );
        const rJson = await readJsonSafe(rRes);
        if (!rRes.ok) throw new Error(rJson?.error || "Failed to load response");

        setAnswers(rJson?.response?.answers || {});
        setSubmitted(Boolean(rJson?.response?.submitted));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load evaluation");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [status, session, orgEvaluationId, memberId]);

  const validateRequiredAnswers = () => {
  const missing: string[] = [];

  for (const q of questions) {
    const v = answers[q.id];

    if (q.type === "input") {
      const s = (v ?? "").toString().trim();
      if (!s) missing.push(q.text);
    }

    if (q.type === "dropdown") {
      const s = (v ?? "").toString().trim();
      if (!s) missing.push(q.text);
    }

    if (q.type === "checkbox") {
      const arr = Array.isArray(v) ? v : [];
      if (arr.length === 0) missing.push(q.text);
    }

    if (q.type === "likert") {
      const n = Number(v);
      const max = q.scale ?? 5;
      if (!Number.isFinite(n) || n < 1 || n > max) missing.push(q.text);
    }
  }

  return missing;
};


const submitEvaluation = async () => {
  try {
    setError(null);

    const missing = validateRequiredAnswers();
    if (missing.length > 0) {
      setError(`Please answer all required fields.`);
      return;
    }

    const res = await fetch(
      `/api/org-evaluations/${encodeURIComponent(orgEvaluationId)}/responses/${encodeURIComponent(memberId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, submitted: true }),
      }
    );

    const json = await readJsonSafe(res);
    if (!res.ok) throw new Error(json?.error || "Failed to submit");

    setSubmitted(true);

    alert("Success: Evaluation submitted.");
    router.push(`/dashboard/orgs/${orgname}?tab=Members`);
  } catch (err: any) {
    console.error(err);

    const message = err.message || "Failed to submit evaluation";

    alert(`Error: ${message}`);
    setError(message);
  }
};


const missingCount = validateRequiredAnswers().length;

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <p className="text-gray-900">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-900">
      {error && (
        <div className="max-w-5xl mx-auto mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white p-4 rounded shadow flex items-center justify-between">
          <div>
            <button
              onClick={goToMembers}
              className="flex items-center gap-2 text-lg font-bold text-black hover:text-bg-[#014fb3] transition-colors cursor-pointer"
            >
              <ArrowUturnLeftIcon className="w-5 h-5" />
            </button>
            <div className="text-lg font-bold text-black">Organization Evaluation</div>
            <div className="text-sm text-gray-600">
              Org: <span className="text-black">{orgname}</span>
            </div>
          </div>

          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={submitEvaluation}
                disabled={missingCount > 0}
                className="px-4 py-2 bg-bg-[#014fb3] bg-blue-300 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded cursor-pointer"
              >
                Submit
              </button>
            </div>
          )}
      </div>

        <MemberEvaluationView
          questions={questions}
          answers={answers}
          setAnswer={setAnswer}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
