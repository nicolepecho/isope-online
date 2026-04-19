'use client';


import {TrashIcon, ArrowUpTrayIcon, PencilSquareIcon } from '@heroicons/react/24/outline';


// Reusable InstructionsBlock component
export function InstructionsBlock({
  state,
  updateState,
  handleSaveInstructions,
  handleCancelEditInstructions,
  handleAllowedFileTypesChange,
}: {
  state: any;
  updateState: (updates: any) => void;
  handleSaveInstructions: () => void;
  handleCancelEditInstructions: () => void;
  handleAllowedFileTypesChange: (types: string[]) => void;
}) {
  const isOSAS = state.userRole === 'osas';
  const isOrgUser = state.userRole === 'org';

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-red-600 font-bold text-2xl">Instructions:</h2>
        <div className="flex items-center gap-2">
          {isOrgUser && !state.isEditingInstructions && (
            <button
              onClick={() => updateState({ activeTab: 'submission' })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              Go to submission
            </button>
          )}

          {isOSAS && !state.isEditingInstructions ? (
            <button onClick={() => updateState({ isEditingInstructions: true })} disabled={state.isEditingGrade}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors ${
                state.isEditingGrade ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}>
              <PencilSquareIcon className="w-5 h-5" />
              Edit Instructions
            </button>
          ) : isOSAS && state.isEditingInstructions ? (
            <div className="flex gap-2">
              <button onClick={handleSaveInstructions} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors cursor-pointer">Save</button>
              <button onClick={handleCancelEditInstructions} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors cursor-pointer">Cancel</button>
            </div>
          ) : null}
        </div>
      </div>

      {state.isEditingInstructions && isOSAS ? (
        <>
          <textarea value={state.instructions} onChange={(e) => updateState({ instructions: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-xl font-medium min-h-[200px]"
            placeholder="Enter instructions here..." />

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-gray-900 font-bold text-lg mb-4">Accepted File Types:</h3>
            <div className="flex flex-wrap gap-6">
              {(['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'] as const).map(type => (
                <label key={type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(state.allowedFileTypes || ['pdf']).includes(type)}
                    onChange={(e) => {
                      const current = state.allowedFileTypes || ['pdf'];
                      const next = e.target.checked
                        ? Array.from(new Set([...current, type]))
                        : current.filter((t: string) => t !== type);

                      updateState({ allowedFileTypes: next });
                      handleAllowedFileTypesChange(next);
                    }}
                    className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer" />
                  <span className="text-gray-900 font-medium text-lg uppercase">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-gray-900 mb-10 leading-relaxed text-xl max-w-4xl font-medium">{state.instructions}</p>

          {isOrgUser && (
            <div className="mb-10">
              <h3 className="text-gray-900 font-semibold mb-3">Accepted File Types</h3>
              <ul className="list-disc pl-6 text-gray-700">
                {(state.allowedFileTypes && state.allowedFileTypes.length > 0 ? state.allowedFileTypes : ['pdf']).map((t: string) => (
                  <li key={t} className="uppercase">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
