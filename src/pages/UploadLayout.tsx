import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { UploadPanel } from "@/components/UploadPanel";
import { useRefreshProtection } from "@/hooks/useRefreshProtection";
import { ProtectedLayoutContext } from "./ProtectedLayout";

export default function UploadLayout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { handleUploadComplete } = useOutletContext<ProtectedLayoutContext>();

  useRefreshProtection(
    isProcessing,
    "Please wait until the document upload and processing is complete."
  );

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* LOGO top left */}
      <div className="absolute left-0 top-0 p-8 text-2xl font-extrabold tracking-tight text-black" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
        LOGO
      </div>
      <div className="flex-1 flex items-center justify-center mb-20">
        <div className="w-[80vw] max-w-4xl ">
          <h1 className="text-5xl md:text-6xl font-extrabold text-center text-[#232323] mb-8" style={{ fontFamily: 'Inter, Arial, sans-serif', fontWeight: 800 }}>
            RHP Document Assistant
          </h1>
          <p className="text-[#5A6473] text-2xl mb-20 text-center" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
            Upload your RHP document and generate summaries or ask questions for instant insights.
          </p>
          <UploadPanel
            onUploadComplete={handleUploadComplete}
            onProcessingChange={setIsProcessing}
            initialIsProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
