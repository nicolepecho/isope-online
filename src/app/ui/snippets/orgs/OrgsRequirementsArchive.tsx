'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/app/lib/database';
import { useSession } from 'next-auth/react';

type Requirement = {
  id: string;
  section: string;
  title: string;
  active: boolean;
};

type OrgRequirementStatus = {
  id: string;
  orgUsername: string;
  requirementId: string;
  submitted: boolean;
  graded: boolean;
  start: string | null;
  due: string | null;
  score: number | null;
  grade: number | null;
  year: number | null;
  active: boolean;
};

type EvalArchiveMember = {
  id: number;
  student_name: string;
  submitted: boolean;
};

type EvalArchiveData = {
  evaluation: { id: string; school_year: number; archived_at: string };
  members: EvalArchiveMember[];
} | null;

type QuestionSummaryItem = {
  id: string;
  type: 'input' | 'dropdown' | 'checkbox' | 'likert';
  text: string;
  responseCount: number;
  totalResponses: number;
  // input
  responses?: string[];
  // dropdown / checkbox
  distribution?: Record<string, number>;
  // likert
  scale?: number;
  average?: number | null;
};

export default function OrgsRequirementArchive({ username }: { username: string }) {
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role || '').toString().trim().toLowerCase();
  const isOSAS = role === 'osas';

  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [statuses, setStatuses] = useState<OrgRequirementStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>('2025');
  const [years, setYears] = useState<string[]>([]);

  const [evalArchive, setEvalArchive] = useState<EvalArchiveData>(null);
  const [evalSummary, setEvalSummary] = useState<QuestionSummaryItem[]>([]);
  const [loadingEval, setLoadingEval] = useState(false);

    useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);

        // Fetch available years from requirements
        const { data: yearData, error: yearError } = await supabase
          .from('org_requirement_status')
          .select('year')
          .order('year', { ascending: false });

        if (yearError) throw yearError;

        // Also fetch years from archived evaluations for this org
        const { data: evalYearData } = await supabase
          .from('org_evaluations')
          .select('school_year')
          .eq('orgUsername', username)
          .eq('archived', true)
          .not('school_year', 'is', null);

        const requirementYears = (yearData || []).map((y) => y.year).filter(Boolean);
        const evaluationYears = (evalYearData || []).map((y) => y.school_year).filter(Boolean);

        const uniqueYears = Array.from(
          new Set([...requirementYears, ...evaluationYears])
        ).sort((a, b) => b - a);

        setYears(uniqueYears);

        // Default to latest year
        if (uniqueYears.length > 0) {
          setYear(uniqueYears[0]);
        }

        // Fetch requirements (static)
        const { data: reqData, error: reqError } = await supabase
          .from('requirements')
          .select('*')
          .eq('active', true)
          .order('section', { ascending: true })
          .order('id', { ascending: true });

        if (reqError) throw reqError;

        setRequirements(reqData || []);
      } catch (err: any) {
        console.error(err);
        setRequirements([]);
        setYears([]);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [username]);

  useEffect(() => {
    if (!year) return;

    const fetchStatuses = async () => {
      try {
        const { data, error } = await supabase
          .from('org_requirement_status')
          .select('*')
          .eq('year', year)
          .eq('orgUsername', username)
          .eq('active',false);

        if (error) throw error;

        setStatuses(data || []);
      } catch (err) {
        console.error(err);
        setStatuses([]);
      }
    };

    fetchStatuses();
  }, [year, username]);

  useEffect(() => {
    if (!year || !isOSAS) return;

    const fetchEvalArchive = async () => {
      try {
        setLoadingEval(true);
        const res = await fetch(
          `/api/orgs/${encodeURIComponent(username)}/evaluations/archived?year=${year}`
        );
        const json = await res.json();
        if (!res.ok || !json.evaluation) {
          setEvalArchive(null);
          setEvalSummary([]);
          return;
        }
        setEvalArchive({ evaluation: json.evaluation, members: json.members || [] });

        // Fetch the response summary for this evaluation
        const sRes = await fetch(
          `/api/org-evaluations/${encodeURIComponent(json.evaluation.id)}/summary`
        );
        const sJson = await sRes.json();
        setEvalSummary(sRes.ok ? (sJson.summary || []) : []);
      } catch {
        setEvalArchive(null);
        setEvalSummary([]);
      } finally {
        setLoadingEval(false);
      }
    };

    fetchEvalArchive();
  }, [year, username, isOSAS]);

  const getStatus = (reqId: string) =>
    statuses.find((s) => s.requirementId === reqId);

  const groupedRequirements: Record<string, Requirement[]> = requirements.reduce(
    (acc, req) => {
      if (!acc[req.section]) acc[req.section] = [];
      acc[req.section].push(req);
      return acc;
    },
    {} as Record<string, Requirement[]>
  );

  if (loading) return <div className="p-4 text-black">Loading requirements...</div>;

  if (requirements.length === 0) return <div className="p-4 text-black">No requirements found.</div>;

  return (
    
    <div className="overflow-x-auto" key="requirements-1">
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-medium text-black">Year:</label>
              <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-black text-sm cursor-pointer"
        >
          {years.map((y) => {
            const endYear = Number(y);
            const startYear = endYear - 1;

            return (
              <option key={y} value={y}>
                {startYear}–{endYear}
              </option>
            );
          })}
        </select>
      </div>

      <table className="min-w-full border border-gray-300 bg-white text-black text-xs sm:text-sm md:text-base">
        <thead>
          <tr className="bg-white text-black">
            <th className="border border-gray-300 px-3 py-2 text-left w-2/3">Requirement</th>
            <th className="border border-gray-300 px-3 py-2 text-left">View</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Start</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Due</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Submitted</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Graded</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Score</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedRequirements).map(([section, reqs]) => (
            <React.Fragment key={section}>
              <tr className="bg-gray-200">
                <td colSpan={7} className="px-3 py-2 font-bold text-black">{section}</td>
              </tr>
              {reqs.map((req) => {
                const status = getStatus(req.id);
                return (
                  <tr key={req.id} className="border-b border-gray-200">
                    <td className="border px-3 py-2">{req.title}</td>
                    <td className="border px-3 py-2 text-center">
                        {status?.id ? (
                          <Link
                            href={{
                              pathname: `/dashboard/orgs/${username}/requirements/${req.id}`,
                              query: { statusId: status.id, year },
                            }}
                            className="text-blue-500 hover:underline flex flex-col items-center"
                          >
                            <DocumentTextIcon className="w-6 h-6 mb-1" />
                            <span>View</span>
                          </Link>
                        ) : (
                          <div className="text-gray-400 flex flex-col items-center cursor-not-allowed opacity-60">
                            <DocumentTextIcon className="w-6 h-6 mb-1" />
                            <span>No Data</span>
                          </div>
                        )}
                      </td>

                    <td className="border px-3 py-2">{status?.start ? new Date(status.start).toLocaleDateString() : '-'}</td>
                    <td className="border px-3 py-2">{status?.due ? new Date(status.due).toLocaleDateString() : '-'}</td>
                    <td className="border px-3 py-2">{status?.submitted ? '✅' : '❌'}</td>
                    <td className="border px-3 py-2">{status?.graded ? '✅' : '❌'}</td>
                    <td className="border px-3 py-2">{status?.graded ? status.grade : '-'}</td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {/* Evaluation Archive Section — OSAS only */}
      {isOSAS && (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-black mb-3">Member Evaluations</h3>

          {loadingEval ? (
            <div className="text-sm text-gray-500">Loading evaluation archive...</div>
          ) : !evalArchive ? (
            <div className="text-sm text-gray-500">No evaluation archived for this year.</div>
          ) : (
            <>
              {/* Summary Section */}
              {evalSummary.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-black mb-3">Response Summary</h4>
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

                        {/* Likert — average + distribution */}
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
                </div>
              )}

              {/* Member List */}
              <table className="min-w-full border border-gray-300 bg-white text-black text-xs sm:text-sm md:text-base">
                <thead>
                  <tr className="bg-white text-black">
                    <th className="border border-gray-300 px-3 py-2 text-left w-2/3">Member</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Submitted</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">View</th>
                  </tr>
                </thead>
                <tbody>
                  {evalArchive.members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="border border-gray-300 px-3 py-6 text-center text-gray-400"
                      >
                        No members found for this evaluation.
                      </td>
                    </tr>
                  ) : (
                    evalArchive.members.map((member) => (
                      <tr key={member.id} className="border-b border-gray-200">
                        <td className="border px-3 py-2">{member.student_name}</td>
                        <td className="border px-3 py-2">{member.submitted ? '✅' : '❌'}</td>
                        <td className="border px-3 py-2">
                          {member.submitted ? (
                            <Link
                              href={`/dashboard/orgs/${username}/evaluations/${evalArchive.evaluation.id}/${member.id}`}
                              className="text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <DocumentTextIcon className="w-4 h-4 inline" />
                              View
                            </Link>
                          ) : (
                            <span className="text-gray-400 flex items-center gap-1 opacity-60">
                              <DocumentTextIcon className="w-4 h-4 inline" />
                              No Submission
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
