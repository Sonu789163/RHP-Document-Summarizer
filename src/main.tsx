import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { toast } from "sonner";

createRoot(document.getElementById("root")!).render(<App />);

// Global notification for summary/report ready
function checkGlobalReadyFlags() {
  // Summary ready
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("summary_ready_")) {
      toast.success("Summary is ready!");
      localStorage.removeItem(key);
    }
    if (key.startsWith("report_ready_")) {
      toast.success("Comparison report is ready!");
      localStorage.removeItem(key);
    }
  });
}

window.addEventListener("focus", checkGlobalReadyFlags);

checkGlobalReadyFlags();
