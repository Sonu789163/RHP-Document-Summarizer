import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Users, Globe, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center p-8">
        <div className="w-full max-w-6xl bg-card rounded-lg shadow-lg p-6 border border-border">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          </div>

          {/* Admin Navigation Section */}
          {user?.role === "admin" && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Admin Tools
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/admin/users")}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  <Users className="h-4 w-4" />
                  User Management
                </button>
                <button
                  onClick={() => navigate("/admin/domains")}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  <Globe className="h-4 w-4" />
                  Domain Configuration
                </button>
              </div>
            </div>
          )}
          <div className="space-y-6">
            <div>
              <label className="block text-foreground font-medium mb-1">
                Theme
              </label>
              <select className="w-full p-2 rounded bg-muted text-muted-foreground border border-border">
                <option>Dark</option>
                <option>Light</option>
                <option>System</option>
              </select>
            </div>
            <div>
              <label className="block text-foreground font-medium mb-1">
                Notifications
              </label>
              <input type="checkbox" className="mr-2" checked readOnly />
              <span className="text-muted-foreground">
                Enable notifications (dummy)
              </span>
            </div>
            <div>
              <label className="block text-foreground font-medium mb-1">
                Account
              </label>
              <button className="px-4 py-2 rounded bg-primary text-primary-foreground hover:opacity-90 transition">
                Manage Account (dummy)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
