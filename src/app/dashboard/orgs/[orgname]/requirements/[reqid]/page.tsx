'use client';

import { useState, useEffect, use } from 'react';
import { formatName } from '@/app/lib/assessments';
import { supabaseAdmin, supabase } from '@/app/lib/database';
import { useSession } from "next-auth/react";
import { InstructionsBlock } from '@/app/ui/snippets/submission/instruction';
import { SubmissionInfo } from '@/app/ui/snippets/submission/submission-info';
import { PDFViewer } from '@/app/ui/snippets/submission/pdf-viewer';
import { GradingTab } from '@/app/ui/snippets/submission/grading-tab';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';





export default function RequirementPage({ params }: { params: Promise<{ orgname: string; reqid: string }> }) {
  const { orgname, reqid } = use(params);
  const { data: session, status } = useSession();
  const [approved, setApproved] = useState(false);
  const [initialApproved, setInitialApproved] = useState(false);
  const [savingApproval, setSavingApproval] = useState(false);
  const isAdviser = (session?.user as { role?: string } | null)?.role === "adviser";
  const router = useRouter();

  const goToDues = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/orgs/${orgname}?tab=Requirements`);
  };

  // State consolidation
  const [state, setState] = useState({
    activeTab: 'instructions' as 'instructions' | 'submission',
    hasSubmitted: false,
    score: 0, //max score
    submittedScore: 0,
    maxScore: 100,
    dueDate: null as Date | null,
    isEditingInstructions: false,
    isEditingGrade: false,

    // ✅ ADDED (only change): controls "Edit freeform" mode
    isEditingFreeform: false,

    instructions: '',
    error: null as string | null,
    uploadedPdf: null as string | null,
    pdfFileName: '',
    userRole: null as 'osas' | 'org' | 'adviser' | null,
    currentUserEmail: null as string | null,
    freeformAnswer: '',
    selectedPdfId: null as string | null,
    allowedFileTypes: ['pdf'] as string[],

    commentText: '',
    comments: [] as {
      id: string;
      orgUsername: string;
      requirementId: string;
      authorEmail: string;
      authorName: string | null;
      content: string;
      createdAt: string;
    }[],
    
    loading: {
      page: true,
      requirement: false,
      grade: false,
      pdf: false,
      comments: false,
      commentAction: false,
    },
    
    submissiontype: null as 'freeform' | 'pdf' | null,

    requirement: null as ({
      id: string;
      title: string;
      section: string;
      active: boolean;
    } | null),

    uploadedPdfs: [] as {
      id: string;
      filepath: string;
      publicUrl: string;
      uploadedby: string;
      uploadedat: string;
    }[],
  });

  const requirementName = state.requirement?.title || reqid;

  const formattedDueDate = state.dueDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || 'TBD';

  const isOSAS = state.userRole === 'osas';
  const isMember = state.userRole === 'org';
  const hasApprovalChanges = approved !== initialApproved;
  const isEditing = state.isEditingInstructions || state.isEditingGrade;

  // Helper functions
  const updateState = (updates: Partial<typeof state>) => setState(prev => ({ ...prev, ...updates }));
  
  const setError = (error: string | null) => updateState({ error });
  
  const checkPermission = (role: 'osas' | 'org', action: string) => {
    if (state.userRole !== role) {
      setError(`Only ${role} users can ${action}`);
      return false;
    }
    return true;
  };

  const setLoading = (
  key: keyof typeof state.loading,
  value: boolean
) => {
  setState(prev => ({
    ...prev,
    loading: {
      ...prev.loading,
      [key]: value,
    },
  }));
};


  

const loadRequirementFromSupabase = async () => {
  try {
    setError(null);
    setLoading('requirement', true);

    const { data, error } = await supabase
      .from('requirements')
      .select('id, title, section, active, instructions, submissiontype')
      .eq('id', reqid)
      .eq('active', true)
      .single();

    if (error) throw error;

    const raw = (data.submissiontype || '').toString().trim().toLowerCase();

    const allowed =
      raw.includes(',') ? raw.split(',').map((s: string) => s.trim()).filter(Boolean)
      : raw === 'pdf' ? ['pdf']
      : raw === 'freeform' ? ['pdf']
      : raw ? [raw]
      : ['pdf'];

    updateState({
      requirement: data,
      instructions: data.instructions || '',
      allowedFileTypes: allowed,
      submissiontype: data.submissiontype as 'freeform' | 'pdf'
    });
  } catch (err: any) {
    console.error(err);
    setError('Failed to load requirement');
  } finally {
    setLoading('requirement', false);
  }
};

  // Load grade from Supabase
  const loadGradeFromSupabase = async () => {
    try {
      setError(null);
      setLoading('grade', true);
      const { data, error: fetchError } = await supabase
        .from('org_requirement_status')
        .select('grade, score, freeformans')
        .eq('orgUsername', orgname)
        .eq('requirementId', reqid)
        .maybeSingle() as any;

      if (fetchError) {
        console.error('Error fetching grade:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        updateState({
          maxScore: data.score || 100,
          score: data.grade || 0,
          submittedScore: data.grade || 0,
          freeformAnswer: data.freeformans || '',
        });
      }
    } catch (err) {
      console.error('Error loading grade:', err);
      setError('Failed to load grade data');
    } finally {
      setLoading('grade', false);
    }
  };

  // Save grade to Supabase
  const saveGradeToSupabase = async (newScore: number) => {
    if (!checkPermission('osas', 'grade submissions')) return false;

    try {
      setError(null);
      const { data: existing } = await supabase
        .from('org_requirement_status')
        .select('id')
        .eq('orgUsername', orgname)
        .eq('requirementId', reqid)
        .maybeSingle();

      const payload = { grade: newScore, graded: true };
      const { error: dbError } = existing
        ? await supabase.from('org_requirement_status').update(payload).eq('id', existing.id)
        : await supabase.from('org_requirement_status').insert({
            ...payload,
            orgUsername: orgname,
            requirementId: reqid,
            submitted: state.hasSubmitted,
            score: state.maxScore,
            start: new Date().toISOString().split('T')[0],
            due: state.dueDate ? state.dueDate.toISOString().split('T')[0] : null
          });

      if (dbError) {
        console.error('Error saving grade:', dbError);
        setError(dbError.message);
        return false;
      }

      updateState({ submittedScore: newScore });
      return true;
    } catch (err) {
      console.error('Error saving grade:', err);
      setError('Failed to save grade');
      return false;
    }
  };

  //Display due date
  const loadDueDateFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('org_requirement_status')
        .select('due')
        .eq('orgUsername', orgname)
        .eq('requirementId', reqid)
        .maybeSingle();

      if (error) throw error;

      updateState({
        dueDate: data?.due ? new Date(data.due) : null
      });
    } catch {
      console.warn('No due date found yet');
      updateState({ dueDate: null });
    }
  };

  const handleIsApproved = () => {
    if (!isAdviser) return;
    setApproved((prev) => !prev);
  };

  const handleSaveApproval = async () => {
    if (!isAdviser) return;

    try {
      setError(null);
      setSavingApproval(true);

      const { data: existing, error: fetchError } = await supabase
        .from('org_requirement_status')
        .select('id')
        .eq('orgUsername', orgname)
        .eq('requirementId', reqid)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const payload = { approved };
      const { error: dbError } = existing
        ? await supabase.from('org_requirement_status').update(payload).eq('id', existing.id)
        : await supabase.from('org_requirement_status').insert({
            ...payload,
            orgUsername: orgname,
            requirementId: reqid,
            submitted: state.hasSubmitted,
            score: state.maxScore,
            start: new Date().toISOString().split('T')[0],
            due: state.dueDate ? state.dueDate.toISOString().split('T')[0] : null,
          });

      if (dbError) throw dbError;

      setInitialApproved(approved);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save approval');
    } finally {
      setSavingApproval(false);
    }
  };
  // Handle file upload
  const handlePdfUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!checkPermission('org', 'upload PDFs')) return;

    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setError(null);
      setLoading('pdf', true);

      const allowed = (state.allowedFileTypes || ['pdf']).map((t: string) => (t || '').toLowerCase().trim());

      for (const file of Array.from(files)) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();

        if (!ext || !allowed.includes(ext)) {
          setError(`Invalid file type: "${file.name}". Allowed types: ${allowed.join(', ')}`);
          return;
        }
      }

      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${orgname}/${reqid}/${crypto.randomUUID()}_${safeName}`;


        const { error: uploadError } = await supabaseAdmin.storage
          .from('requirement-pdfs')
          .upload(filePath, file, {
            contentType: file.type,
          });

        if (uploadError) throw uploadError;
      }

      await supabase
        .from('org_requirement_status')
        .update({ submitted: true })
        .eq('orgUsername', orgname)
        .eq('requirementId', reqid);

      updateState({ hasSubmitted: true });
      loadRequirementPdfs();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to upload files');
    } finally {
      setLoading('pdf', false);
      event.target.value = '';
    }
  };

  const loadRequirementPdfs = async () => {
    try {
      setError(null);

      const res = await fetch(
        `/api/requirements/pdfs?orgname=${encodeURIComponent(orgname)}&reqid=${encodeURIComponent(reqid)}`
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load PDFs');
      }

      setState((prev: any) => {
        const pdfs = json.pdfs || [];
        const selected =
          pdfs.find((p: any) => p.id === prev.selectedPdfId) ||
          pdfs[0] ||
          null;

        return {
          ...prev,
          uploadedPdfs: pdfs,
          selectedPdfId: selected ? selected.id : null,
          uploadedPdf: selected ? selected.publicUrl : null,
          pdfFileName: selected ? selected.filepath.split('/').pop() : '',
        };
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load PDFs');
    }
  };


  
  // Remove file
  const handleRemovePdf = async (pdfId: string) => {
    try {
      setError(null);

      const res = await fetch('/api/requirements/pdfs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: pdfId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to delete file');
      }

      setState((prev: any) => ({
        ...prev,
        uploadedPdfs: prev.uploadedPdfs.filter((pdf: any) => pdf.id !== pdfId),
        selectedPdfId: prev.selectedPdfId === pdfId ? null : prev.selectedPdfId,
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete file');
    }
  };


  const handleSubmitFreeform = async () => {
  if (!checkPermission('org', 'submit freeform answers')) return;

  try {
    setError(null);

    // Check if a submission already exists
    const { data: existing, error: fetchError } = await supabase
      .from('org_requirement_status')
      .select('id')
      .eq('orgUsername', orgname)
      .eq('requirementId', reqid)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      // Update existing submission
      const { error: updateError } = await supabase
        .from('org_requirement_status')
        .update({
          freeformans: state.freeformAnswer,
          submitted: true,
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new submission
      const { error: insertError } = await supabase
        .from('org_requirement_status')
        .insert({
          orgUsername: orgname,
          requirementId: reqid,
          freeformans: state.freeformAnswer,
          submitted: true,
          graded: false,
          score: state.maxScore || 100,
          start: new Date().toISOString().split('T')[0],
          active: true,
        });

      if (insertError) throw insertError;
    }

    // ✅ CHANGED (only change): lock editing again after submit
    updateState({ hasSubmitted: true, isEditingFreeform: false });
  } catch (err: any) {
    console.error(err);
    setError('Failed to submit freeform response');
  }
};

  const loadComments = async () => {
    try {
      setError(null);
      setLoading('comments', true);

      const res = await fetch(
        `/api/requirements/comments?orgname=${encodeURIComponent(orgname)}&reqid=${encodeURIComponent(reqid)}`
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load comments');
      }

      updateState({ comments: json.comments || [] });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading('comments', false);
    }
  };

  const handleAddComment = async () => {
    try {
      const content = (state.commentText || '').trim();
      if (!content) {
        setError('Comment cannot be empty');
        return;
      }

      setError(null);
      setLoading('commentAction', true);

      const res = await fetch('/api/requirements/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgname,
          reqid,
          content,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to add comment');
      }

      updateState({ commentText: '' });
      loadComments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add comment');
    } finally {
      setLoading('commentAction', false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setError(null);
      setLoading('commentAction', true);

      const res = await fetch('/api/requirements/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commentId }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to delete comment');
      }

      loadComments();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete comment');
    } finally {
      setLoading('commentAction', false);
    }
  };

  // Session effect
  useEffect(() => {
    if (status === 'loading') {
      setLoading('page', true);
      return;
    }

    if (status === 'unauthenticated') {
      setError('User not authenticated');
      setLoading('page', false);
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const email = session.user.email || '';
      const rawRole = ((session.user as any)?.role || '')
        .toString()
        .trim()
        .toLowerCase();

      updateState({ currentUserEmail: email });

      const checkSupabaseAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      console.log('SUPABASE SESSION:', data?.session);
      if (error) console.error('Supabase auth error:', error);
    };

    checkSupabaseAuth();


      if (rawRole === 'osas' || rawRole === 'org' || rawRole === 'adviser') {
        updateState({ userRole: rawRole as 'osas' | 'org' | 'adviser' });

        // kick off initial data loads
        loadRequirementFromSupabase();
        loadGradeFromSupabase();
        loadDueDateFromSupabase();
        loadComments();
      } else {
        setError(`Invalid role: "${rawRole}"`);
      }

      // page is now ready to render
      setLoading('page', false);
    }
  }, [status, session]);


  // Initial data load
  useEffect(() => {
    const loadSubmissionStatus = async () => {
      const { data, error } = await supabase
        .from('org_requirement_status')
        .select('submitted, approved')
        .eq('orgUsername', orgname)
        .eq('requirementId', reqid)
        .maybeSingle();

      if (error) {
        console.error('Failed to load submission status:', error);
        return;
      }

      updateState({
        hasSubmitted: data?.submitted ?? false
      });

      const approvedValue = !!data?.approved;
      setApproved(approvedValue);
      setInitialApproved(approvedValue);
    };

    loadSubmissionStatus();
    loadRequirementPdfs();
    loadComments();
  }, [orgname, reqid]);

  const handleSubmitGrade = async () => {
    if (!checkPermission('osas', 'submit grades')) return;
    const success = await saveGradeToSupabase(state.score);
    if (success) updateState({ isEditingGrade: false });
  };

  const handleSaveInstructions = async () => {
  if (!checkPermission('osas', 'edit instructions')) return;

  try {
    setError(null);

    const { error } = await supabase
      .from('requirements')
      .update({ instructions: state.instructions })
      .eq('id', reqid);

    if (error) throw error;

    updateState({ isEditingInstructions: false });
  } catch (err: any) {
    console.error(err);
    setError('Failed to save instructions');
  }
};


  const handleCancelEditInstructions = async () => {
  await loadRequirementFromSupabase();
  updateState({ isEditingInstructions: false });
};


  const handleAllowedFileTypesChange = async (types: string[]) => {
  if (!checkPermission('osas', 'change accepted file types')) return;

  try {
    const payload = (types && types.length > 0) ? types.join(',') : 'pdf';

    const { error } = await supabase
      .from('requirements')
      .update({ submissiontype: payload })
      .eq('id', reqid);

    if (error) throw error;
  } catch (err) {
    console.error(err);
    setError('Failed to update accepted file types');
  }
};

  if (state.loading.page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 p-8 relative">
      {isEditing && <div className="fixed inset-0 bg-opacity-50 z-40" />}
      
      {state.error && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{state.error}</span>
            <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>×</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-50">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 flex items-center justify-center">
            <button onClick={goToDues} className="text-blue-900 hover:text-blue-700">
              <ArrowUturnLeftIcon className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{formatName(orgname)} - {requirementName}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b-2 border-gray-300 flex">
                {(['instructions', 'submission'] as const).map(tab => (
                  <button key={tab} onClick={() => !isEditing && updateState({ activeTab: tab as any })} disabled={isEditing}
                    className={`px-6 py-4 font-medium ${isEditing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
                      state.activeTab === tab ? 'text-gray-900 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-12 min-h-[500px]">
                {state.activeTab === 'instructions' && (
                  <InstructionsBlock
                    state={state}
                    updateState={updateState}
                    handleSaveInstructions={handleSaveInstructions}
                    handleCancelEditInstructions={handleCancelEditInstructions}
                    handleAllowedFileTypesChange={handleAllowedFileTypesChange}
                  />
                )}

                {state.activeTab === 'submission' && (
                  <GradingTab
                    state={state}
                    updateState={updateState}
                    isOSAS={isOSAS}
                    handleSubmitFreeform={handleSubmitFreeform}
                    handlePdfUpload={handlePdfUpload}
                    handleRemovePdf={handleRemovePdf}
                  />
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <SubmissionInfo
              state={state}
              updateState={updateState}
              isOSAS={isOSAS}
              formattedDueDate={formattedDueDate}
              isEditing={isEditing}
              handleSubmitGrade={handleSubmitGrade}
              approved={approved}
              isAdviser={isAdviser}
              hasApprovalChanges={hasApprovalChanges}
              savingApproval={savingApproval}
              handleSaveApproval={handleSaveApproval}
              comments={state.comments}
              commentText={state.commentText}
              currentUserEmail={state.currentUserEmail}
              loadingComments={state.loading.comments}
              loadingCommentAction={state.loading.commentAction}
              handleAddComment={handleAddComment}
              handleDeleteComment={handleDeleteComment}
              handleIsApproved={handleIsApproved}
            />
              </div>
            </div>
          </div>
        </div>
  );
}
