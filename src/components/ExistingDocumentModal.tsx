import React from "react";
import { CheckCircle, FileText, ArrowRight } from "lucide-react";

interface ExistingDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingDocument: any;
  onNavigateToExisting: () => void;
}

export const ExistingDocumentModal: React.FC<ExistingDocumentModalProps> = ({
  isOpen,
  onClose,
  existingDocument,
  onNavigateToExisting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 px-10 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-[2vw] max-w-md w-full flex flex-col items-center">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-blue-500" />
          <h2 className="text-xl font-bold">Document Already Exists</h2>
        </div>

        <div className="text-center mb-6">
          <p className="mb-2 text-gray-600">
            A document with the name <b>"{existingDocument?.namespace}"</b>{" "}
            already exists in your library.
          </p>
          <p className="text-sm text-gray-500">
            Would you like to open the existing document instead?
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            className="flex-1 px-4 py-2 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 rounded bg-[#4B2A06] text-white font-medium hover:bg-[#3A2004] flex items-center justify-center gap-2"
            onClick={onNavigateToExisting}
          >
            <ArrowRight className="h-4 w-4" />
            Open Existing
          </button>
        </div>
      </div>
    </div>
  );
};
