import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export interface ProtectedLayoutContext {
  recentDocuments: any[];
  currentDocument: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  handleDocumentSelect: (doc: any) => void;
  handleUploadComplete: (
    documentId: string,
    fileName: string,
    namespace: string
  ) => void;
}

const ProtectedLayout = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  // State lifted up for MainLayout and its children
  const [recentDocuments, setRecentDocuments] = useState(() => {
    const savedDocs = localStorage.getItem("recent_documents");
    return savedDocs ? JSON.parse(savedDocs) : [];
  });
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Additional check to ensure authentication is properly validated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleDocumentSelect = (doc) => {
    setCurrentDocument(doc);
    navigate(`/doc/${doc.namespace}`);
  };

  const handleUploadComplete = (documentId, fileName, namespace) => {
    const newDoc = {
      id: documentId,
      name: fileName,
      uploadedAt: new Date().toISOString(),
      namespace,
    };
    const updatedDocs = [newDoc, ...recentDocuments.slice(0, 4)];
    setRecentDocuments(updatedDocs);
    localStorage.setItem("recent_documents", JSON.stringify(updatedDocs));
    setCurrentDocument(newDoc);
    navigate(`/doc/${namespace || documentId}`);
  };

  // Show loading spinner while authentication is being checked
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Pass down state and handlers to all protected routes
  const context = {
    recentDocuments,
    currentDocument,
    isSidebarOpen,
    setIsSidebarOpen,
    handleDocumentSelect,
    handleUploadComplete,
  };

  return <Outlet context={context satisfies ProtectedLayoutContext} />;
};

export default ProtectedLayout;
