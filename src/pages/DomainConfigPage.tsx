import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Globe, Plus, Trash2, Save, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

interface DomainConfig {
  allowedDomains: string[];
  specialAllowedEmails: string[];
  defaultUserRole: string;
  allowMultipleDomains: boolean;
}

const DomainConfigPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [config, setConfig] = useState<DomainConfig>({
    allowedDomains: ["excollo.com"],
    specialAllowedEmails: ["test@gmail.com"],
    defaultUserRole: "user",
    allowMultipleDomains: false,
  });
  const [newDomain, setNewDomain] = useState("");
  const [newSpecialEmail, setNewSpecialEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (currentUser?.role !== "admin") {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast.error("Please enter a domain");
      return;
    }

    if (config.allowedDomains.includes(newDomain.trim())) {
      toast.error("Domain already exists");
      return;
    }

    setConfig((prev) => ({
      ...prev,
      allowedDomains: [...prev.allowedDomains, newDomain.trim()],
    }));
    setNewDomain("");
    toast.success("Domain added successfully");
  };

  const handleRemoveDomain = (domain: string) => {
    if (config.allowedDomains.length === 1) {
      toast.error("At least one domain must be allowed");
      return;
    }

    setConfig((prev) => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter((d) => d !== domain),
    }));
    toast.success("Domain removed successfully");
  };

  const handleAddSpecialEmail = () => {
    if (!newSpecialEmail.trim()) {
      toast.error("Please enter an email");
      return;
    }

    if (config.specialAllowedEmails.includes(newSpecialEmail.trim())) {
      toast.error("Email already exists");
      return;
    }

    setConfig((prev) => ({
      ...prev,
      specialAllowedEmails: [
        ...prev.specialAllowedEmails,
        newSpecialEmail.trim(),
      ],
    }));
    setNewSpecialEmail("");
    toast.success("Special email added successfully");
  };

  const handleRemoveSpecialEmail = (email: string) => {
    if (config.specialAllowedEmails.length === 1) {
      toast.error("At least one special email must be allowed");
      return;
    }

    setConfig((prev) => ({
      ...prev,
      specialAllowedEmails: prev.specialAllowedEmails.filter(
        (e) => e !== email
      ),
    }));
    toast.success("Special email removed successfully");
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to save domain configuration
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      toast.success("Domain configuration saved successfully");
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        title="Domain Configuration"
        showSearch={true}
        searchValue=""
        onSearchChange={() => {}}
      />

      <div className="w-[94vw] mx-auto py-8">
        <div className="w-full">
          {/* Allowed Domains */}
          <div className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Allowed Email Domains
              </CardTitle>
              <CardDescription>
                Configure which email domains are allowed for user registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative ">
                <Input
                  placeholder="Enter domain (eg, excollo.com)"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                  className="bg-gray-100 border-gray-200 pr-10 rounded-full"
                />
                <button
                  type="button"
                  onClick={handleAddDomain}
                  className="absolute top-1/2 -translate-y-1/2 right-2 p-2 rounded-md hover:bg-gray-200 text-gray-700"
                  aria-label="Add domain"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {config.allowedDomains.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between p-4 shadow-lg rounded-lg bg-white"
                  >
                    <span className="font-medium text-gray-900">{domain}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      disabled={config.allowedDomains.length === 1}
                      className="p-2 rounded-md hover:bg-gray-100 text-gray-700 disabled:opacity-50"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </div>

          {/* Special Allowed Emails (optional section kept functional but hidden for cleaner UI) */}
          {/*
          <Card className="border border-gray-200 shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Special Allowed Emails
              </CardTitle>
              <CardDescription>
                Configure specific email addresses that are allowed regardless of domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email (e.g., test@gmail.com)"
                  value={newSpecialEmail}
                  onChange={(e) => setNewSpecialEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSpecialEmail()}
                  className="bg-gray-100 border-gray-200"
                />
                <Button onClick={handleAddSpecialEmail} size="sm" className="px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {config.specialAllowedEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                  >
                    <span className="font-medium">{email}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSpecialEmail(email)}
                      disabled={config.specialAllowedEmails.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          */}

          {/* Configuration Options */}
          <div className="">
            <CardHeader>
              <CardTitle>Configuration Options</CardTitle>
              <CardDescription>
                Additional settings for domain-based user management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 shadow-lg rounded-lg bg-white">
                <div>
                  <Label className="text-sm font-medium">
                    Default User Role
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Role assigned to new users from allowed domains
                  </p>
                </div>
                <select
                  value={config.defaultUserRole}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      defaultUserRole: e.target.value,
                    }))
                  }
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 shadow-lg rounded-lg bg-white">
                <div>
                  <Label className="text-sm font-medium">
                    Allow Multiple Domains
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users from multiple domains to register
                  </p>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.allowMultipleDomains}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        allowMultipleDomains: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-green-500 transition-colors relative">
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
              </div>
            </CardContent>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mr-5">
            <Button
              onClick={handleSaveConfig}
              disabled={loading}
              className="px-6 bg-[#5A3A16] hover:bg-[#4A2F12] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainConfigPage;
