'use client';

import { DocumentIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PDFViewer } from './pdf-viewer';

export function GradingTab({
  state,
  updateState,
  isOSAS,
  handleSubmitFreeform,
  handlePdfUpload,
  handleRemovePdf,
}: {
  state: any;
  updateState: (updates: any) => void;
  isOSAS: boolean;
  handleSubmitFreeform: () => void;
  handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemovePdf: (pdfId: string) => void;
}) {
  const allFiles = state.uploadedPdfs || [];

  const getExt = (filepath: string) => {
    const name = (filepath || '').split('/').pop() || '';
    return (name.split('.').pop() || '').toLowerCase();
  };

  const allowed = (state.allowedFileTypes && state.allowedFileTypes.length > 0)
    ? state.allowedFileTypes.map((t: string) => (t || '').toLowerCase().trim())
    : ['pdf'];

  const allowedFiles = allFiles.filter((f: any) => allowed.includes(getExt(f.filepath)));

  const pdfFiles = allowedFiles.filter((f: any) => getExt(f.filepath) === 'pdf');

  const handleDownloadFile = (file: any) => {
    const url = `/api/requirements/pdfs?download=1&filepath=${encodeURIComponent(file.id || file.filepath)}`;

    const a = document.createElement('a');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const freeformLocked = state.userRole === 'org' && state.hasSubmitted && !state.isEditingFreeform;
  const isReadOnly = isOSAS || freeformLocked;

  return (
    <div>
      <div className="space-y-4">
        {state.userRole === 'org' && (
          <div className="flex justify-end">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer">
              <ArrowUpTrayIcon className="w-5 h-5" />
              Upload File
              <input
                type="file"
                accept={(state.allowedFileTypes || ['pdf'])
                  .map((t: string) => {
                    const x = (t || '').toLowerCase().trim();
                    if (x === 'pdf') return 'application/pdf';
                    if (x === 'png') return 'image/png';
                    if (x === 'jpg' || x === 'jpeg') return 'image/jpeg';
                    if (x === 'doc') return '.doc';
                    if (x === 'docx') return '.docx';
                    if (x === 'ppt') return '.ppt';
                    if (x === 'pptx') return '.pptx';
                    if (x === 'xls') return '.xls';
                    if (x === 'xlsx') return '.xlsx';
                    return '';
                  })
                  .filter(Boolean)
                  .join(',')}
                multiple
                onChange={handlePdfUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Uploaded Files ({allowedFiles.length})
          </label>

          {allowedFiles.length > 0 ? (
            <div className="space-y-3">
              {allowedFiles.map((file: any) => {
                const fileName = file.filepath.split('/').pop();

                return (
                  <div
                    key={file.id}
                    className="flex items-start justify-between bg-white p-3 rounded-lg border border-gray-200"
                  >
                    <span className="text-gray-900 break-all pr-4">
                      {fileName}
                    </span>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>

                      {state.userRole === 'org' && (
                        <button
                          onClick={() => handleRemovePdf(file.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No files uploaded yet</p>
          )}
        </div>

        {pdfFiles.length > 0 ? (
          <>
            <PDFViewer
              state={state}
              updateState={updateState}
            />

            {pdfFiles.length > 1 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PDF Files ({pdfFiles.length})
                </label>

                <div className="flex flex-wrap gap-2">
                  {pdfFiles.map((pdf: any) => {
                    const fileName = pdf.filepath.split('/').pop();
                    const isActive = state.selectedPdfId === pdf.id;

                    return (
                      <button
                        key={pdf.id}
                        type="button"
                        onClick={() =>
                          updateState({
                            selectedPdfId: pdf.id,
                            uploadedPdf: pdf.publicUrl,
                            pdfFileName: fileName,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                        }`}
                        title={fileName}
                      >
                        {fileName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <DocumentIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No PDF uploaded</p>
              {isOSAS && (
                <p className="text-gray-400 text-sm mt-2">
                  Student needs to upload a PDF file
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Freeform Response
        </h3>

        <textarea
        className={`w-full h-[300px] rounded-lg border border-gray-300 p-4 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
        placeholder={isOSAS ? 'No response submitted yet' : 'Enter your response here...'}
        value={state.freeformAnswer || ''}
        readOnly={isReadOnly}
        onChange={(e) => {
          if (isReadOnly) return;
          updateState({ freeformAnswer: e.target.value });
        }}
      />

      {state.userRole === 'org' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSubmitFreeform}
            disabled={freeformLocked || !(state.freeformAnswer || '').trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors cursor-pointer"
          >
            Submit
          </button>

          <button
            type="button"
            onClick={() => updateState({ isEditingFreeform: true })}
            disabled={!freeformLocked}
            className="px-6 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-900 font-medium transition-colors cursor-pointer"
          >
            Edit
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
