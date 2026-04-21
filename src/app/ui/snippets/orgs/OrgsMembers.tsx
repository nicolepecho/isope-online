import Link from "next/link";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import React from "react";
import { supabase } from "@/app/lib/database";
import UploadMembersModal from "./uploadMembers";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

  const [editMembersMode, setEditMembersMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="relative min-h-[400px]">
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
            {members.map((member) => {
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

      <div className="absolute bottom-4 right-4 flex gap-2">
        {isOSAS && (
          <button
            onClick={() => router.push(`/dashboard/orgs/${username}/evaluations/create`)}
            className="bg-[#014fb3] text-white px-4 py-2 rounded hover:bg-[#013db3] text-sm cursor-pointer"
          >
            Edit Evaluation
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
