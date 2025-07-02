import React from "react";
import { TopNav } from "@/components/TopNav";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center p-8">
        <div className="w-full max-w-6xl bg-card rounded-lg shadow-lg p-6 border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Settings</h2>
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
