'use client';

import { TrashIcon } from '@heroicons/react/16/solid';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

export function SubmissionInfo({
  state,
  updateState,
  isOSAS,
  formattedDueDate,
  isEditing,
  handleSubmitGrade,
  handleIsApproved,
  approved,
  isAdviser,
  hasApprovalChanges,
  savingApproval,
  handleSaveApproval,
  comments,
  commentText,
  currentUserEmail,
  loadingComments,
  loadingCommentAction,
  handleAddComment,
  handleDeleteComment,
}: {
  state: any;
  updateState: (updates: any) => void;
  isOSAS: boolean;
  formattedDueDate: string;
  isEditing: boolean;
  handleSubmitGrade: () => void;
  handleIsApproved: () => void;
  approved: boolean;
  isAdviser: boolean;
  hasApprovalChanges: boolean;
  savingApproval: boolean;
  handleSaveApproval: () => void;
  comments: any[];
  commentText: string;
  currentUserEmail: string | null;
  loadingComments: boolean;
  loadingCommentAction: boolean;
  handleAddComment: () => void;
  handleDeleteComment: (id: string) => void;
}) {
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Submission Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Due by:</span>
            <span className="text-gray-900 font-medium">{formattedDueDate}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Grade</h3>
          {isOSAS && !state.isEditingGrade ? (
            <button onClick={() => updateState({ isEditingGrade: true })} disabled={state.isEditingInstructions || state.loading.grade}
              className={`flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors ${
                state.isEditingInstructions || state.loading.requirement ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}>
              <PencilSquareIcon className="w-5 h-5" />
              Edit
            </button>
          ) : isOSAS && state.isEditingGrade ? (
            <button onClick={() => updateState({ score: state.submittedScore, isEditingGrade: false })}
              className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer">
              Cancel
            </button>
          ) : null}
        </div>

        {state.loading.grade ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : state.isEditingGrade && isOSAS ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Score (out of {state.maxScore})</label>
              <input type="text" value={state.score}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') { updateState({ score: 0 }); return; }
                  if (!/^\d+$/.test(val)) return;
                  const num = parseInt(val, 10);
                  if (num >= 0 && num <= state.maxScore) updateState({ score: num });
                }}
                onKeyDown={(e) => {
                  const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
                  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
                }}
                placeholder={state.maxScore.toString()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            </div>
            <button onClick={handleSubmitGrade}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer">
              Submit Grade
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                <circle cx="64" cy="64" r="56" stroke={state.submittedScore > 0 ? "#3b82f6" : "#d1d5db"}
                  strokeWidth="12" fill="none" strokeDasharray="351.858"
                  strokeDashoffset={351.858 - (351.858 * state.submittedScore / state.maxScore)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{state.submittedScore}/{state.maxScore}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Adviser's Feedback</h3>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleIsApproved}
            disabled={!isAdviser}
            className={`w-6 h-6 border-2 rounded flex items-center justify-center transition
              ${approved ? "border-green-500 bg-green-500" : "border-gray-300"}
              ${isAdviser ? "cursor-pointer" : "cursor-default"}
            `}
            aria-pressed={approved}
            aria-label="Approve submission"
          >
            {approved && (
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>

          <span className="font-semibold text-gray-900">
            {approved ? "Approved!" : "Pending"}
          </span>
        </div>

        {isAdviser && hasApprovalChanges && (
          <div className="mt-4">
            <button
              onClick={handleSaveApproval}
              disabled={savingApproval}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {savingApproval ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>

        <div className="mb-4">
          <textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => updateState({ commentText: e.target.value })}
            className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm placeholder:text-gray-400"
          />
          <button
            onClick={handleAddComment}
            disabled={loadingCommentAction || !(commentText || '').trim()}
            className="cursor-pointer mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm $"
          >
            Add Comment
          </button>
        </div>

        {loadingComments ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {comments && comments.length > 0 ? (
              comments.map((c: any) => {
                const canDelete =
                  currentUserEmail &&
                  (c.authorEmail || '').toLowerCase() === currentUserEmail.toLowerCase();

                const dateLabel = c.createdAt
                  ? new Date(c.createdAt).toLocaleString()
                  : '';

                return (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-500">
                          {c.authorName || c.authorEmail || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{dateLabel}</span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          disabled={loadingCommentAction}
                          className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 break-words">{c.content}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No comments yet</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
