import React, { useState, useRef, useEffect } from "react";
import { Upload, File, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadService } from "@/lib/api/uploadService";
import { sessionService } from "@/lib/api/sessionService";

interface UploadPanelProps {
  onUploadComplete: (
    documentId: string,
    fileName: string,
    namespace?: string
  ) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  initialIsProcessing?: boolean; // New prop for initial state
}

// Add ProcessingDots component
const ProcessingDots = () => {
  return (
    <div className="flex items-center gap-1">
      <span>Processing document</span>
      <div className="flex gap-1">
        <span className="animate-bounce [animation-delay:0ms]">.</span>
        <span className="animate-bounce [animation-delay:150ms]">.</span>
        <span className="animate-bounce [animation-delay:300ms]">.</span>
      </div>
    </div>
  );
};

export function UploadPanel({
  onUploadComplete,
  onProcessingChange,
  initialIsProcessing = false,
}: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  // Initialize isProcessing based on the prop
  const [isProcessing, setIsProcessing] = useState(initialIsProcessing);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionData] = useState(() => sessionService.initializeSession());

  // Notify parent of processing state changes
  useEffect(() => {
    onProcessingChange?.(isUploading || isProcessing);
  }, [isUploading, isProcessing, onProcessingChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      return;
    }
    setFile(file);
    setUploadComplete(false);
    // Reset processing state when a new file is selected
    setIsUploading(false);
    setIsProcessing(false);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);
    // onUploadStart(); // Removed, replaced by useEffect

    try {
      // Start upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 200);

      const response = await uploadService.uploadFileToBackend(file);
      if (!response || !response.document) {
        throw new Error(response?.error || "Upload failed");
      }

      clearInterval(progressInterval);

      if (!response.success) {
        throw new Error(response.error || "Upload failed");
      }

      setUploadProgress(100);
      setIsUploading(false);
      setIsProcessing(true); // Set processing true after upload

      // Wait for processing to complete (polling is now handled within uploadService)
      // The uploadService.uploadFile should now return when processing is complete or failed

      if (response.status === "completed") {
        setIsProcessing(false); // Set processing false on completion
        setUploadComplete(true);

        // Get the namespace from the response or use the filename
        const namespace = response.namespace || file.name.replace(".pdf", ""); // Ensure .pdf is removed

        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>
              <strong>{file.name}</strong> stored successfully!
              <br />
              <span className="text-xs text-muted-foreground">
                Document ID: {response.documentId}
              </span>
            </span>
          </div>,
          {
            duration: 4000,
          }
        );

        // Pass the namespace to the parent component
        onUploadComplete(
          response.documentId || sessionData.id,
          file.name,
          namespace
        );
      } else if (response.status === "failed") {
        throw new Error(response.error || "Processing failed");
      } else {
        // Should not happen if uploadService waits for completion/failure
        console.warn(
          "Upload service did not return completed or failed status immediately.",
          response
        );
        setIsProcessing(false); // Assume processing didn't start or failed quickly
        throw new Error(
          response.error || "Upload did not complete successfully."
        );
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span>
            {error instanceof Error ? error.message : "Upload failed"}
          </span>
        </div>
      );
    } finally {
      // Ensure all processing states are false in case of error or completion
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadComplete(false);
    setIsUploading(false);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className=" top-18 border-border bg-card shadow-lg w-[80%] m-[auto] top-right-gradient">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-center mb-4 text-foreground">
          Upload Document
        </h2>

        {!file && !isProcessing ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center transition-colors cursor-pointer",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-center mb-2">
              <span className="font-medium text-foreground">
                Drop your file here
              </span>
              <span className="text-muted-foreground block text-sm">
                or click to browse
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Supported format: PDF
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf"
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                "flex items-center p-4 rounded-lg animate-fade-in transition-colors",
                uploadComplete
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-card border border-border"
              )}
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center mr-3",
                  uploadComplete ? "bg-green-500/20" : "bg-muted"
                )}
              >
                {uploadComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <File className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {file?.name || "Processing Document"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file?.size / (1024 * 1024)).toFixed(2)} MB
                  {uploadComplete && (
                    <span className="ml-2 text-green-400">
                      • Stored successfully
                    </span>
                  )}
                  {isProcessing && !uploadComplete && (
                    <span className="ml-2 text-yellow-400">
                      • Processing...
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={resetUpload}
                className="ml-2 p-1.5 rounded-full hover:bg-muted transition-colors"
                disabled={isUploading || isProcessing}
              >
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {(isUploading || isProcessing) && !uploadComplete && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2 bg-primary" />
                <p className="text-xs text-muted-foreground text-right">
                  {isProcessing ? (
                    <ProcessingDots />
                  ) : (
                    `${uploadProgress}% uploaded`
                  )}
                </p>
              </div>
            )}

            {!isUploading &&
              !isProcessing &&
              !uploadComplete && ( // Show upload button only when idle
                <div className="flex gap-3">
                  <Button
                    className="w-full text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
                    onClick={handleUpload}
                  >
                    Upload & Process
                  </Button>
                </div>
              )}

            {uploadComplete && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted"
                  onClick={resetUpload}
                >
                  Upload Another Document
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
