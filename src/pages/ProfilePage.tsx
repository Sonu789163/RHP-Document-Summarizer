import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userService, User as UserType } from "@/lib/api/userService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Loader2,
  User as UserIcon,
  Shield,
  Calendar,
  Mail,
  Phone,
  Users,
  LogOut,
  Trash2,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/Navbar";

// Form schemas
const profileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"]).optional(),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^a-zA-Z0-9]/,
        "Password must contain at least one special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function ProfilePage() {
  const { user: currentUser } = useAuth();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "profile" | "summary" | "security"
  >("profile");

  // Helper for initials
  const getUserInitials = (user: any) => {
    if (!user) return "U";

    // If user has a name, use first and last name initials
    if (user.name && user.name.trim()) {
      const nameParts = user.name.trim().split(" ");
      if (nameParts.length >= 2) {
        // First and last name initials
        return (
          nameParts[0][0] + nameParts[nameParts.length - 1][0]
        ).toUpperCase();
      } else {
        // Single name, use first two letters
        return user.name.substring(0, 2).toUpperCase();
      }
    }

    // Fallback to email initials
    if (user.email) {
      const [name] = user.email.split("@");
      return name
        .split(".")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }

    return "U";
  };

  // State
  const [profile, setProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forms
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      gender: "prefer-not-to-say" as const,
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Load user profile
  useEffect(() => {
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await userService.getMyProfile();
      setProfile(profileData);
      profileForm.reset({
        name: profileData.name || "",
        gender: profileData.gender || "prefer-not-to-say",
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to load profile";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);

  const handleUpdateProfile = async (data: z.infer<typeof profileSchema>) => {
    try {
      setActionLoading("profile");
      setPendingUpdate(data);
      await userService.initiateProfileUpdateOtp(data);
      setOtpOpen(true);
      toast.success("OTP sent to your email");
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to initiate verification";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setActionLoading("otp");
      if (pendingUpdate) {
        // Profile update flow
        await userService.verifyProfileUpdateOtp(otpValue);
        toast.success("Profile updated successfully");
      } else {
        // Password change flow
        await userService.verifyPasswordChangeOtp(otpValue);
        toast.success("Password changed successfully");
        passwordForm.reset();
      }
      setOtpOpen(false);
      setOtpValue("");
      setPendingUpdate(null);
      loadProfile();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Failed to verify OTP";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePassword = async (data: z.infer<typeof passwordSchema>) => {
    try {
      setActionLoading("password");
      await userService.changeMyPassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      // OTP will be sent by backend
      setOtpOpen(true);
      toast.success("OTP sent to your email");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to change password";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    const ok = confirm(
      "Are you sure you want to delete your account? This cannot be undone."
    );
    if (!ok) return;
    try {
      // Placeholder: implement API when available
      toast.error("Delete account endpoint not implemented yet.");
    } catch (e) {
      toast.error("Failed to delete account");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        title="Settings"
        showSearch={true}
        searchValue=""
        onSearchChange={() => {}}
      />
      <div className="fixed w-[100vw] mx-auto h-[100vh] ">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 ">
          {/* Sidebar */}
          <aside className="w-[22vw] h-[90vh] lg:col-span-1  sticky top-[80px] self-start border-r border-gray-200 py-6 pl-6">
            <h1 className="text-3xl font-bold mb-4">Settings</h1>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full text-left px-4 py-8 flex flex-col gap-1 ${
                activeTab === "profile"
                  ? "bg-[#ECE9E2] text-[#4B2A06] border-r-[4px] border-r-[#4B2A06]"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <UserIcon className="h-4 w-4" /> Profile
              </div>
              <div className="text-xs leading-snug">
                Settings related to your personal information and account
              </div>
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`w-full text-left px-4 py-8  flex flex-col gap-1 ${
                activeTab === "summary"
                  ? "bg-[#ECE9E2] text-[#4B2A06] border-r-[4px] border-r-[#4B2A06]"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4" />
                Account summary
              </div>
              <div className="text-xs leading-snug">
                View account summary
              </div>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full text-left px-4 py-8 flex flex-col gap-1 ${
                activeTab === "security"
                  ? "bg-[#ECE9E2] text-[#4B2A06] border-r-[4px] border-r-[#4B2A06]"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-4 w-4" /> Security
              </div>
              <div className="text-xs leading-snug">
                All settings related to security and password
              </div>
            </button>
          </aside>

          {/* Content */}
          <section className=" w-[70vw] lg:col-span-3 space-y-6 max-h-[calc(100vh-100px)]  overflow-y-auto p-6 scrollbar-hide">
            
            {activeTab === "profile" && (
              <>
                {/* Profile Details */}
                <h1 className="text-3xl font-bold mb-4 mt-2">Profile Settings</h1>
                <div className=" shadow-md border-t  border-gray-200 rounded-xl">
                
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-500">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">
                          Email
                        </label>
                        <div className="flex items-center gap-2 p-3 rounded-md bg-white/60 border border-gray-200">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{profile.email}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Email cannot be changed
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">
                          Role
                        </label>
                        <div className="flex items-center gap-2 p-3 rounded-md bg-white/60 border border-gray-200">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="px-2 py-0.5 rounded-full bg-white/80 border border-gray-200 text-sm">
                            {profile.role}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">
                          Status
                        </label>
                        <div className="flex items-center gap-2 p-3 rounded-md bg-white/60 border border-gray-200">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              profile.status === "active"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span className="px-2 py-0.5 rounded-full bg-white/80 border border-gray-200 text-sm capitalize">
                            {profile.status}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-500">
                          Member Since
                        </label>
                        <div className="flex items-center gap-2 p-3 rounded-md bg-white/60 border border-gray-200">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>
                            {new Date(profile.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Profile Display */}
                <div className="shadow-md border-t  border-gray-200 rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      Profile Display
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <Avatar className="  h-24 w-24 ">
                        <AvatarFallback className="text-2xl font-bold bg-[#ECE9E2] text-[#4B2A06]">
                          {getUserInitials(profile)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">
                          Your profile initials will update automatically when
                          you change your name
                        </p>
                        <div className="text-sm">
                          <p>
                            <strong>Current initials:</strong>{" "}
                            {getUserInitials(profile)}
                          </p>
                          <p>
                            <strong>Based on:</strong>{" "}
                            {profile.name || profile.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Update Profile */}
                <div className="shadow-md border-t  border-gray-200 rounded-xl">
                  <CardHeader>
                    <CardTitle>Update Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form
                        onSubmit={(e) =>
                          profileForm.handleSubmit(handleUpdateProfile)(e)
                        }
                        className="space-y-4 "
                      >
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-500">
                                Full Name
                              </FormLabel>
                              <FormControl>
                                <Input
                                  className="border border-gray-200 rounded-xl bg-white/60"
                                  placeholder="Enter your full name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Phone number removed per requirements */}
                        <FormField
                          control={profileForm.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2 text-gray-500">
                                <Users className="h-4 w-4" />
                                Gender
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="border border-gray-200 rounded-xl bg-white/60">
                                    <SelectValue placeholder="Select your gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="border border-gray-200 rounded-xl bg-white">
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                  <SelectItem value="prefer-not-to-say">
                                    Prefer not to say
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="bg-[#4B2A06] w-full text-white rounded-xl hover:bg-[#3a2004] transition  "
                          disabled={actionLoading === "profile"}
                        >
                          {actionLoading === "profile" && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Update Profile
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </div>

                {/* OTP Modal */}
                {otpOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-lg p-6">
                      <h3 className="text-lg font-semibold mb-2">Verify Profile Update</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Enter the 6-digit OTP sent to your email address.
                      </p>
                      <Input
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                        placeholder="Enter OTP"
                        className="border border-gray-200 rounded-xl bg-white/60 text-center tracking-widest text-lg"
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => { setOtpOpen(false); setOtpValue(""); }}>
                          Cancel
                        </Button>
                        <Button className="bg-[#4B2A06] text-white" onClick={handleVerifyOtp} disabled={actionLoading === "otp" || otpValue.length !== 6}>
                          {actionLoading === "otp" && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Verify
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account actions */}
                <div className="shadow-md border-t  border-gray-200 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Account actions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-end gap-6 ">
                    <Button
                      variant="ghost"
                      onClick={() => logout()}
                      className="flex items-center gap-2  bg-[#ECE9E2] text-[#4B2A06] hover:bg-[#ECE9E2] transition"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </Button>
                    
                  </CardContent>
                </div>
              </>
            )}

            {activeTab === "security" && (
              <>
              <h1 className="text-3xl font-bold mb-4 mt-2">Security Settings</h1>
                <div className="shadow-md border-t w-full border-gray-200 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-gray-500">
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form
                        onSubmit={passwordForm.handleSubmit(
                          handleChangePassword
                        )}
                        className="space-y-4 w-full"
                      >
                        <FormField
                          control={passwordForm.control}
                          name="oldPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    className="border border-gray-200 rounded-xl bg-white/60 pr-10"
                                    type={showOldPassword ? "text" : "password"}
                                    placeholder="Enter current password"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                  >
                                    {showOldPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    className="border border-gray-200 rounded-xl bg-white/60 pr-10"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    className="border border-gray-200 rounded-xl bg-white/60 pr-10"
                                    type={
                                      showConfirmPassword ? "text" : "password"
                                    }
                                    placeholder="Confirm new password"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="bg-[#4B2A06] w-full text-white rounded-xl hover:bg-[#3a2004]  "
                          disabled={actionLoading === "password"}
                        >
                          {actionLoading === "password" && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Change Password
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </div>

                {/* Security Tips */}
                <div className="shadow-md border-t  border-gray-200 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-lg ">Security Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-2">
                      <p className="text-gray-500">
                        • Use a strong, unique password
                      </p>
                      <p className="text-gray-500">
                        • Never share your credentials
                      </p>
                      <p className="text-gray-500">
                        • Log out when using shared devices
                      </p>
                      <p className="text-gray-500">
                        • Keep your email address updated
                      </p>
                    </div>
                  </CardContent>
                </div>
              </>
            )}

            {activeTab === "summary" && (
              <>
              <h1 className="text-3xl font-bold mb-4 mt-2">Account Summary</h1>
                <div className="shadow-md border-t  border-gray-200 rounded-xl">
                  
                  <CardContent className=" mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Account Type
                      </span>
                      <Badge
                        variant={
                          profile.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {profile.role === "admin"
                          ? "Administrator"
                          : "Regular User"}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Account Status
                      </span>
                      <Badge
                        variant={
                          profile.status === "active"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {profile.status === "active" ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Last Login</span>
                      <span className="text-sm font-medium">
                        {new Date(profile.lastLogin).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
