'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/app/lib/database';

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

export default function OrgsRequirementArchive({ username }: { username: string }) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [statuses, setStatuses] = useState<OrgRequirementStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>('2025');
  const [years, setYears] = useState<string[]>([]);

    useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);

        // Fetch available years
        const { data: yearData, error: yearError } = await supabase
          .from('org_requirement_status')
          .select('year')
          .order('year', { ascending: false });

        if (yearError) throw yearError;

        const uniqueYears = Array.from(
          new Set((yearData || []).map((y) => y.year))
        );

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
                              query: { statusId: status.id },
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
    </div>
  );
}
