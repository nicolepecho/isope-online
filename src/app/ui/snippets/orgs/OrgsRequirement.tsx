'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/app/lib/database';

type OrgsRequirementProps = {
  username: string;
  role: string;
};

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

export default function OrgsRequirement({
  username,
  role,
}: OrgsRequirementProps) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [originalRequirements, setOriginalRequirements] = useState<Requirement[]>([]);
  const [statuses, setStatuses] = useState<OrgRequirementStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editRequirementsMode, setEditRequirementsMode] = useState(false);
  const [savingRequirements, setSavingRequirements] = useState(false);

  //console.log('ROLE IN OrgsRequirement:', role);

  // Fetch data from Supabase on client
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: reqData, error: reqError } = await supabase
          .from('requirements')
          .select('*')
          .eq('active', true)
          .order('section',{ascending:true})
          .order('id',{ascending:true});
        if (reqError) throw reqError;

        const { data: statusData, error: statusError } = await supabase
          .from('org_requirement_status')
          .select('*')
          .eq('active',true)
          .eq('orgUsername', username);
        if (statusError) throw statusError;

        setRequirements(reqData || []);
        setOriginalRequirements(reqData || []);
        setStatuses(statusData || []);
      } catch (err: any) {
        console.error('Error fetching requirements:', err.message ?? err);
        setRequirements([]);
        setOriginalRequirements([]);
        setStatuses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

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

  // calculate total score per section
  const getSectionTotal = (reqs: Requirement[]) =>
    reqs.reduce((total, req) => {
      const status = getStatus(req.id);
      if (status?.graded && typeof status.grade === 'number') {
        return total + status.grade;
      }
      return total;
    }, 0);

  // calculate grand total of all graded requirements
  const getGrandTotal = () =>
    statuses.reduce((total, status) => {
      if (status.graded && typeof status.grade === 'number') {
        return total + status.grade;
      }
      return total;
    }, 0);

  if (loading) return <div className="p-4 text-black">Loading requirements...</div>;

  if (requirements.length === 0) return <div className="p-4 text-black">No requirements found.</div>;

  const deactivateAllStatuses = async () => {
  console.log('[Archive] Action triggered');

  const confirmed = confirm(
    'Are you sure you want to archive ALL requirements for this organization?'
  );
  console.log('[Archive] User confirmation:', confirmed);

  if (!confirmed) {
    console.log('[Archive] Action cancelled by user');
    return;
  }

  try {
    const currentYear = new Date().getFullYear();
    console.log('[Archive] Current year:', currentYear);

    // 1. Fetch current active statuses
    console.log('[Archive][1] Fetching active requirement statuses…');

    const { data: currentStatuses, error: fetchError } = await supabase
      .from('org_requirement_status')
      .select('*')
      .eq('orgUsername', username)
      .eq('active', true);

    if (fetchError) {
      console.error('[Archive][1] Fetch error:', fetchError);
      throw fetchError;
    }

    console.log(
      `[Archive][1] Fetched ${currentStatuses?.length ?? 0} active statuses`,
      currentStatuses
    );

    if (!currentStatuses || currentStatuses.length === 0) {
      console.warn('[Archive] No active requirement statuses found');
      alert('No active requirement statuses to archive.');
      return;
    }

    // 2. Prepare duplicated rows
    console.log('[Archive][2] Preparing duplicated statuses…');

    const duplicatedStatuses = currentStatuses.map((status) => ({
      orgUsername: status.orgUsername,
      requirementId: status.requirementId,

      // reset fields
      submitted: false,
      graded: false,
      start: null,
      due: null,
      score: null,
      grade: null,

      year: currentYear,
      active: true
    }));

    console.log(
      `[Archive][2] Prepared ${duplicatedStatuses.length} new rows`,
      duplicatedStatuses
    );

    // 4. Deactivate old rows
    console.log('[Archive][3] Deactivating old statuses…');

    const { error: updateError } = await supabase
      .from('org_requirement_status')
      .update({ active: false })
      .eq('orgUsername', username)
      .eq('active', true);

    if (updateError) {
      console.error('[Archive][3] Update error:', updateError);
      throw updateError;
    }

    console.log('[Archive][3] Old statuses deactivated');

    // 3. Insert duplicated rows
    console.log('[Archive][4] Inserting duplicated statuses…');

    const { error: insertError } = await supabase
      .from('org_requirement_status')
      .insert(duplicatedStatuses);

    if (insertError) {
      console.error('[Archive][4] Insert error:', insertError);
      throw insertError;
    }

    console.log('[Archive][4] Insert successful');

    

    // 5. Update UI state
    console.log('[Archive][5] Updating local UI state…');

    setStatuses((prev) =>
      prev.map((s) => ({ ...s, active: false }))
    );

    console.log('[Archive][5] UI state updated');

    alert(`Requirements archived successfully for year ${currentYear}.`);

    console.log('[Archive] Reloading page…');
    window.location.reload();
  } catch (err: any) {
    console.error('[Archive] FAILED:', err?.message ?? err);
    alert('Something went wrong while archiving requirements.');
  }
};

  const saveScores = async () => {
    setSaving(true);

    try {
      const updates = statuses.map((status) => ({
        id: status.id,
        grade: status.grade,
        graded: typeof status.grade === 'number'
      }));

      const { error } = await supabase
        .from('org_requirement_status')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      alert('Scores saved successfully.');
      setEditMode(false);
    } catch (err: any) {
      console.error('Failed to save scores:', err.message ?? err);
      alert('Failed to save scores.');
    } finally {
      setSaving(false);
    }
  };

  const saveRequirementsEdits = async () => {
    setSavingRequirements(true);

    try {
      const originalMap = new Map(originalRequirements.map((r) => [r.id, r]));

      const titleUpdates = requirements
        .filter((r) => {
          const orig = originalMap.get(r.id);
          return orig && (orig.title !== r.title);
        })
        .map((r) => ({ id: r.id, title: r.title }));

      if (titleUpdates.length > 0) {
        for (const u of titleUpdates) {
          const { error } = await supabase
            .from('requirements')
            .update({ title: u.title })
            .eq('id', u.id);

          if (error) throw error;
        }
      }

      const statusUpdates = statuses
        .filter((s) => !!s.id)
        .map((s) => ({
          id: s.id,
          start: s.start,
          due: s.due,
          score: s.score,
        }));

      if (statusUpdates.length > 0) {
        const { error } = await supabase
          .from('org_requirement_status')
          .upsert(statusUpdates, { onConflict: 'id' });

        if (error) throw error;
      }

      alert('Requirements updated successfully.');
      setOriginalRequirements(requirements);
      setEditRequirementsMode(false);
    } catch (err: any) {
      console.error('Failed to save requirements:', err.message ?? err);
      alert('Failed to save requirements.');
    } finally {
      setSavingRequirements(false);
    }
  };

  return (
    <div className="overflow-x-auto" key="requirements-1">
      <div className="mb-4 flex justify-between">
                {role === 'osas' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditMode((prev) => !prev);
                        if (!editMode) setEditRequirementsMode(false);
                      }}
                      className="bg-[#014fb3] text-white px-4 py-2 rounded hover:bg-[#013584] text-sm cursor-pointer"
                    >
                      {editMode ? 'Exit Edit Mode' : 'Edit Scores'}
                    </button>

                    {role === 'osas' && (
                      <button
                        onClick={() => {
                          setEditRequirementsMode((prev) => !prev);
                          if (!editRequirementsMode) setEditMode(false);
                        }}
                        className="bg-[#014fb3] text-white px-4 py-2 rounded hover:bg-[#013584] text-sm cursor-pointer"
                      >
                        {editRequirementsMode ? 'Exit Edit Mode' : 'Edit Requirements'}
                      </button>
                    )}

                    {editMode && (
                      <button
                        onClick={saveScores}
                        disabled={saving}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm cursor-pointer disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Scores'}
                      </button>
                    )}

                    {editRequirementsMode && (
                      <button
                        onClick={saveRequirementsEdits}
                        disabled={savingRequirements}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm cursor-pointer disabled:opacity-50"
                      >
                        {savingRequirements ? 'Saving...' : 'Save Requirements'}
                      </button>
                    )}
                  </div>
                )}

        {role === 'osas' && (
            <button
              onClick={deactivateAllStatuses}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm cursor-pointer"
            >
              Archive All Requirements
            </button>
          )}

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
                    <td className="border px-3 py-2">
                      {editRequirementsMode ? (
                        <input
                          type="text"
                          value={req.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRequirements((prev) =>
                              prev.map((r) =>
                                r.id === req.id ? { ...r, title: val } : r
                              )
                            );
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-black"
                        />
                      ) : (
                        req.title
                      )}
                    </td>

                    <td className="border px-3 py-2 text-center">
                      {status?.id ? (
                        <Link
                          href={{
                            pathname: `/dashboard/orgs/${username}/requirements/${req.id}`,
                            query: { statusId: status.id },
                          }}
                          className="text-[#014fb3] hover:underline flex flex-col items-center"
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

                    <td className="border px-3 py-2">
                      {editRequirementsMode ? (
                        <input
                          type="date"
                          value={status?.start ? status.start : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStatuses((prev) =>
                              prev.map((s) =>
                                s.requirementId === req.id
                                  ? { ...s, start: val || null }
                                  : s
                              )
                            );
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-black"
                        />
                      ) : (
                        status?.start ? new Date(status.start).toLocaleDateString() : '-'
                      )}
                    </td>

                    <td className="border px-3 py-2">
                      {editRequirementsMode ? (
                        <input
                          type="date"
                          value={status?.due ? status.due : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStatuses((prev) =>
                              prev.map((s) =>
                                s.requirementId === req.id
                                  ? { ...s, due: val || null }
                                  : s
                              )
                            );
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-black"
                        />
                      ) : (
                        status?.due ? new Date(status.due).toLocaleDateString() : '-'
                      )}
                    </td>

                    <td className="border px-3 py-2">{status?.submitted ? '✅' : '❌'}</td>
                    <td className="border px-3 py-2">{status?.graded ? '✅' : '❌'}</td>

                    <td className="border px-3 py-2">
                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={status?.score ?? undefined}
                            value={status?.grade ?? ''}
                            onChange={(e) => {
                              if (e.target.value === '') {
                                setStatuses((prev) =>
                                  prev.map((s) =>
                                    s.requirementId === req.id
                                      ? { ...s, grade: null }
                                      : s
                                  )
                                );
                                return;
                              }

                              const value = Number(e.target.value);

                              // do not allow negative numbers
                              if (value < 0) return;

                              // do not allow values greater than score
                              if (
                                status?.score !== null &&
                                status?.score !== undefined &&
                                value > status.score
                              ) {
                                return;
                              }

                              setStatuses((prev) =>
                                prev.map((s) =>
                                  s.requirementId === req.id
                                    ? { ...s, grade: value }
                                    : s
                                )
                              );
                            }}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-black"
                          />
                          <span>/ {status?.score ?? '-'}</span>
                        </div>
                      ) : editRequirementsMode ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">-</span>
                          <span>/</span>
                          <input
                            type="number"
                            min={0}
                            value={status?.score ?? ''}
                            onChange={(e) => {
                              if (e.target.value === '') {
                                setStatuses((prev) =>
                                  prev.map((s) =>
                                    s.requirementId === req.id
                                      ? { ...s, score: null }
                                      : s
                                  )
                                );
                                return;
                              }

                              const value = Number(e.target.value);
                              if (value < 0) return;

                              setStatuses((prev) =>
                                prev.map((s) =>
                                  s.requirementId === req.id
                                    ? { ...s, score: value }
                                    : s
                                )
                              );
                            }}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-black"
                          />
                        </div>
                      ) : status?.graded ? (
                        `${status.grade}/${status.score ?? '-'}`
                      ) : (
                        `-/${status?.score ?? '-'}`
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Section Total row */}
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={6} className="border px-3 py-2 text-right">
                  Section Total:
                </td>
                <td className="border px-3 py-2">
                  {getSectionTotal(reqs)}
                </td>
              </tr>

            </React.Fragment>
          ))}

          {/* Grand Total row */}
          <tr className="bg-gray-300 font-bold">
            <td colSpan={6} className="border px-3 py-3 text-right">
              Final Total Score:
            </td>
            <td className="border px-3 py-3">
              {getGrandTotal()}
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}