'use client';
import Link from "next/link";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import React from "react";
import { supabase } from "@/app/lib/database";
import UploadMembersModal from "./uploadMembers";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type QuestionSummaryItem = {
  id: string;
  type: 'input' | 'dropdown' | 'checkbox' | 'likert';
  text: string;
  responseCount: number;
  totalResponses: number;
  responses?: string[];
  distribution?: Record<string, number>;
  scale?: number;
  average?: number | null;
};

export default function OrgsMembers({ username }: { username: string }) {
  const [members, setMembers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  const rawRole = ((session?.user as any)?.role || "").toString().trim().toLowerCase();
  const isOSAS = rawRole === "osas";
  const isMember = rawRole === "member";

  const sessionName = (session?.user as any)?.name
    ? ((session?.user as any)?.name || "").toString().trim().toLowerCase()
    : "";

  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [loadingEval, setLoadingEval] = useState(false);
  const [evalSummary, setEvalSummary] = useState<QuestionSummaryItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [editMembersMode, setEditMembersMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [archivingEval, setArchivingEval] = useState(false);

  useEffect(() => {
    const fetchmembers = async () => {
      const { data, error } = await supabase
        .from("member")
        .select("*")
        .eq("organizations", username);

      if (error) console.error("Error fetching member:", error.message);
      else setMembers(data);
    };

    fetchmembers();
  }, [username]);

  useEffect(() => {
    const fetchActiveEvaluation = async () => {
      try {
        setLoadingEval(true);
        const res = await fetch(`/api/orgs/${encodeURIComponent(username)}/evaluations/active`);
        const json = await res.json();

        if (!res.ok) {
          console.error("Failed to load active evaluation:", json?.error || res.statusText);
          setEvaluationId(null);
          return;
        }

        setEvaluationId(json?.evaluation?.id || null);
      } catch (err: any) {
        console.error("Failed to load active evaluation:", err?.message || err);
        setEvaluationId(null);
      } finally {
        setLoadingEval(false);
      }
    };

    fetchActiveEvaluation();
  }, [username]);

  // Fetch live summary for OSAS whenever the active evaluation changes
  useEffect(() => {
    if (!evaluationId || !isOSAS) {
      setEvalSummary([]);
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoadingSummary(true);
        const res = await fetch(`/api/org-evaluations/${encodeURIComponent(evaluationId)}/summary`);
        const json = await res.json();
        setEvalSummary(res.ok ? (json.summary || []) : []);
      } catch {
        setEvalSummary([]);
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [evaluationId, isOSAS]);

  const deleteMembers = async () => {
    if (selectedMemberIds.size === 0) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("member")
        .delete()
        .in("id", Array.from(selectedMemberIds));

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => !selectedMemberIds.has(m.id)));
      setSelectedMemberIds(new Set());
    } catch (err: any) {
      console.error("Error deleting members:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleArchiveEvaluation = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to archive this evaluation? Members will no longer be able to submit responses after archiving.'
    );
    if (!confirmed) return;

    setArchivingEval(true);
    try {
      const res = await fetch(`/api/orgs/${encodeURIComponent(username)}/evaluations/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to archive evaluation');

      // The archive route auto-creates a fresh active evaluation with the same template.
      // Update the evaluationId to the new one so members can keep submitting.
      setEvaluationId(json?.newEvaluationId || null);
      alert('Evaluation archived successfully.');
    } catch (err: any) {
      alert('Failed to archive evaluation: ' + (err?.message || 'Unknown error'));
    } finally {
      setArchivingEval(false);
    }
  };

  const filteredMembers = members.filter((m) =>
    !search.trim() || (m.student_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">

      {/* Search bar — top right above the table */}
      <div className="flex justify-end mb-3">
        <input
          type="text"
          placeholder="Search member"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 min-w-[16rem] max-w-[16rem] flex-shrink-0
                     bg-white px-4 py-2 rounded-md border border-gray-300 text-black
                     focus:bg-white focus:ring-2 focus:ring-[#014fb3] outline-none"
        />
      </div>

      {/* Live evaluation summary — OSAS only */}
      {isOSAS && evaluationId && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-black mb-3">Response Summary</h4>
          {loadingSummary ? (
            <div className="text-sm text-gray-400">Loading summary...</div>
          ) : evalSummary.length === 0 ? (
            <div className="text-sm text-gray-400">No responses submitted yet.</div>
          ) : (
            <div className="space-y-3">
              {evalSummary.map((q) => (
                <div key={q.id} className="border border-gray-200 rounded bg-white p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium text-black">{q.text}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {q.responseCount}/{q.totalResponses} responded
                    </span>
                  </div>

                  {/* Input — list every response, capped at 3 visible with scroll */}
                  {q.type === 'input' && (
                    (q.responses || []).length === 0 ? (
                      <p className="text-xs text-gray-400">No responses.</p>
                    ) : (
                      <ul
                        className="space-y-1 overflow-y-auto pr-1"
                        style={{ maxHeight: `${3 * 2.05}rem` }}
                      >
                        {(q.responses || []).map((r, i) => (
                          <li key={i} className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 leading-5">
                            {r}
                          </li>
                        ))}
                      </ul>
                    )
                  )}

                  {/* Dropdown / Checkbox — distribution */}
                  {(q.type === 'dropdown' || q.type === 'checkbox') && (
                    <div className="space-y-1">
                      {Object.keys(q.distribution || {}).length === 0 ? (
                        <p className="text-xs text-gray-400">No responses.</p>
                      ) : (
                        Object.entries(q.distribution || {})
                          .sort((a, b) => b[1] - a[1])
                          .map(([option, count]) => {
                            const pct = q.responseCount > 0
                              ? Math.round((count / q.responseCount) * 100)
                              : 0;
                            return (
                              <div key={option} className="flex items-center gap-2 text-xs">
                                <span className="w-32 truncate text-gray-700">{option}</span>
                                <div className="flex-1 bg-gray-100 rounded h-2 overflow-hidden">
                                  <div
                                    className="bg-[#014fb3] h-2 rounded"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-gray-500 w-16 text-right">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}

                  {/* Likert — average + per-rating bar */}
                  {q.type === 'likert' && (
                    <div>
                      <p className="text-xs text-gray-700 mb-2">
                        Average:{' '}
                        <span className="font-semibold text-black">
                          {q.average !== null && q.average !== undefined
                            ? `${q.average} / ${q.scale}`
                            : '—'}
                        </span>
                      </p>
                      <div className="space-y-1">
                        {Array.from({ length: q.scale ?? 5 }, (_, i) => i + 1).map((val) => {
                          const count = (q.distribution || {})[String(val)] || 0;
                          const pct = q.responseCount > 0
                            ? Math.round((count / q.responseCount) * 100)
                            : 0;
                          return (
                            <div key={val} className="flex items-center gap-2 text-xs">
                              <span className="w-6 text-gray-500 text-right">{val}</span>
                              <div className="flex-1 bg-gray-100 rounded h-2 overflow-hidden">
                                <div
                                  className="bg-[#014fb3] h-2 rounded"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-gray-500 w-16 text-right">
                                {count} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto" key="requirements-1">
        <table className="min-w-full border border-gray-300 bg-white text-black text-xs sm:text-sm md:text-base">
          <thead>
            <tr className="bg-white text-black">
              {editMembersMode && isOSAS && (
                <th className="border border-gray-300 px-3 py-2 text-center w-10"></th>
              )}
              <th className="border border-gray-300 px-3 py-2 text-left w-2/3">Member</th>
              <th className="border border-gray-300 px-3 py-2 text-left">Evaluation</th>
            </tr>
          </thead>

          <tbody>
            {filteredMembers.length === 0 && (
              <tr>
                <td
                  colSpan={editMembersMode && isOSAS ? 3 : 2}
                  className="border border-gray-300 px-3 py-6 text-center text-gray-400"
                >
                  {search.trim() ? `No members found for "${search}"` : 'No members yet.'}
                </td>
              </tr>
            )}
            {filteredMembers.map((member) => {
              const memberName = (member?.student_name || "").toString().trim().toLowerCase();
              const canView =
                isOSAS || (isMember && sessionName && memberName && sessionName === memberName);

              return (
                <tr key={member.id} className="border-b border-gray-200">
                  {editMembersMode && isOSAS && (
                    <td className="border px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.has(member.id)}
                        onChange={(e) => {
                          setSelectedMemberIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(member.id);
                            else next.delete(member.id);
                            return next;
                          });
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}

                  <td className="border px-3 py-2">{member.student_name}</td>

                  <td className="border px-3 py-2">
                    {loadingEval ? (
                      <div className="text-gray-400 flex items-center cursor-not-allowed opacity-60">
                        <DocumentTextIcon className="w-10 h-8 inline mr-1" />
                        Loading...
                      </div>
                    ) : !evaluationId ? (
                      <div className="text-gray-400 flex items-center cursor-not-allowed opacity-60">
                        <DocumentTextIcon className="w-10 h-8 inline mr-1" />
                        No Evaluation
                      </div>
                    ) : canView ? (
                      <Link
                        href={`/dashboard/orgs/${username}/evaluations/${evaluationId}/${member.id}`}
                        className="text-blue-500 hover:underline"
                      >
                        <DocumentTextIcon className="w-10 h-8 inline mr-1" /> View
                      </Link>
                    ) : (
                      <div className="text-gray-400 flex items-center cursor-not-allowed opacity-60">
                        <DocumentTextIcon className="w-10 h-8 inline mr-1" />
                        No Access
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 flex-wrap">
        {isOSAS && (
          <button
            onClick={() => router.push(`/dashboard/orgs/${username}/evaluations/create`)}
            className="bg-[#014fb3] text-white px-4 py-2 rounded hover:bg-[#013db3] text-sm cursor-pointer"
          >
            Edit Evaluation
          </button>
        )}

        {isOSAS && evaluationId && (
          <button
            onClick={handleArchiveEvaluation}
            disabled={archivingEval}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm cursor-pointer disabled:opacity-50"
          >
            {archivingEval ? 'Archiving...' : 'Archive Evaluation'}
          </button>
        )}

        {isOSAS && (
          <button
            onClick={() => {
              setEditMembersMode((prev) => !prev);
              setSelectedMemberIds(new Set());
            }}
            className="bg-[#014fb3] text-white px-4 py-2 rounded hover:bg-[#013db3] text-sm cursor-pointer"
          >
            {editMembersMode ? 'Exit Edit Mode' : 'Edit Members'}
          </button>
        )}

        {isOSAS && editMembersMode && (
          <button
            onClick={deleteMembers}
            disabled={deleting || selectedMemberIds.size === 0}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Member'}
          </button>
        )}

        {isOSAS && (
          <UploadMembersModal orgname={username} />
        )}
      </div>
    </div>
  );
}
