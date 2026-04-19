'use client'; 

export function PDFViewer({
  state,
  updateState,
}: {
  state: any;
  updateState: (updates: any) => void;
}) {
  if (!state.uploadedPdf) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-lg">No PDF uploaded</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="overflow-auto max-h-[700px] bg-gray-700 flex justify-center p-4">
        <iframe src={`${state.uploadedPdf}#page=${state.currentPage}&zoom=${state.pdfZoom * 100}`}
          className="w-full min-h-[600px] bg-white rounded" title="PDF Viewer" />
      </div>
    </div>
  );
}
