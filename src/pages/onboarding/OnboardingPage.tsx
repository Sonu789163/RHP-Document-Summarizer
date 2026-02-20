
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Upload, CheckCircle, AlertCircle, RefreshCw, Shield, Brain, Search, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import { domainService, OnboardingStatus } from '@/services/domainService';
import { Navbar } from "@/components/sharedcomponents/Navbar";

const OnboardingPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [sopFile, setSopFile] = useState<File | null>(null);
    const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [isReOnboarding, setIsReOnboarding] = useState(false);

    const { control, handleSubmit, register, setValue, formState: { errors } } = useForm({
        defaultValues: {
            investor_match_only: false,
            valuation_matching: false,
            adverse_finding: false,
            target_investors: "",
        }
    });

    // Fetch existing onboarding status on mount
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await domainService.getOnboardingStatus();
                setOnboardingStatus(status);

                // Pre-fill form with existing toggles
                if (status.toggles) {
                    setValue("investor_match_only", status.toggles.investor_match_only);
                    setValue("valuation_matching", status.toggles.valuation_matching);
                    setValue("adverse_finding", status.toggles.adverse_finding);
                }
                if (status.target_investors?.length) {
                    setValue("target_investors", status.target_investors.join(", "));
                }

                // If already completed, show re-onboarding mode
                if (status.onboarding_status === "completed" || status.onboarding_status === "completed_no_sop") {
                    setIsReOnboarding(true);
                }
            } catch (err) {
                console.error("Failed to fetch onboarding status:", err);
            } finally {
                setIsLoadingStatus(false);
            }
        };
        fetchStatus();
    }, [setValue]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type === "application/pdf" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                setSopFile(file);
            } else {
                toast({
                    title: "Invalid file type",
                    description: "Please upload a PDF or DOCX file.",
                    variant: "destructive"
                });
            }
        }
    };

    const onSubmit = async (data: any) => {
        setIsLoading(true);

        try {
            const config = {
                toggles: {
                    investor_match_only: data.investor_match_only,
                    valuation_matching: data.valuation_matching,
                    adverse_finding: data.adverse_finding
                },
                targetInvestors: data.target_investors ? data.target_investors.split(',').map((s: string) => s.trim()).filter(Boolean) : []
            };

            if (isReOnboarding) {
                // Re-onboarding requires a file
                if (!sopFile) {
                    toast({
                        title: "SOP File Required",
                        description: "Please upload an updated SOP file for re-onboarding.",
                        variant: "destructive"
                    });
                    setIsLoading(false);
                    return;
                }
                await domainService.reOnboard({ config, file: sopFile });
            } else {
                // Initial onboarding (file is optional)
                await domainService.submitOnboarding({ config, file: sopFile || undefined });
            }

            toast({
                title: isReOnboarding ? "Re-Onboarding Started" : "Onboarding Started",
                description: "Our AI agents are analyzing your SOP and configuring the pipeline. This may take a few minutes.",
            });

            // Redirect to Dashboard after short delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 2500);

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Submission Failed",
                description: error?.response?.data?.error || "There was an error submitting your details. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoadingStatus) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar title="Onboarding" showSearch={false} searchValue="" onSearchChange={() => { }} />
                <div className="flex items-center justify-center min-h-[70vh]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-[#4B2A06]" />
                        <span className="text-sm text-gray-500 font-medium">Loading configuration...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar
                title={isReOnboarding ? "Re-Configure Pipeline" : "Platform Setup"}
                showSearch={false}
                searchValue=""
                onSearchChange={() => { }}
            />

            <div className="max-w-5xl mx-auto px-4 py-8">

                {/* Status Banner */}
                {onboardingStatus && onboardingStatus.onboarding_status !== "pending" && (
                    <div className="bg-white shadow-sm rounded-lg p-5 mb-6 border-l-4"
                        style={{
                            borderLeftColor: onboardingStatus.onboarding_status === "completed" ? "#16a34a" :
                                onboardingStatus.onboarding_status === "processing" ? "#ca8a04" :
                                    onboardingStatus.onboarding_status === "failed" ? "#dc2626" : "#6b7280"
                        }}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-full ${onboardingStatus.onboarding_status === "completed" ? "bg-green-50 text-green-600" :
                                    onboardingStatus.onboarding_status === "processing" ? "bg-yellow-50 text-yellow-600" :
                                        onboardingStatus.onboarding_status === "failed" ? "bg-red-50 text-red-600" :
                                            "bg-gray-100 text-gray-500"
                                }`}>
                                {onboardingStatus.onboarding_status === "completed" ? <CheckCircle className="h-5 w-5" /> :
                                    onboardingStatus.onboarding_status === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> :
                                        <AlertCircle className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-[#4B2A06] text-lg">
                                    {onboardingStatus.onboarding_status === "completed" ? "Onboarding Complete" :
                                        onboardingStatus.onboarding_status === "processing" ? "Onboarding In Progress" :
                                            onboardingStatus.onboarding_status === "completed_no_sop" ? "Basic Config Active" :
                                                "Onboarding Status"}
                                </h3>
                                {onboardingStatus.last_onboarded && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Last configured: {new Date(onboardingStatus.last_onboarded).toLocaleString()}
                                    </p>
                                )}

                                {/* Config Summary */}
                                {(onboardingStatus.onboarding_status === "completed") && (
                                    <div className="mt-4 flex gap-4 flex-wrap">
                                        <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-md">
                                            <Search className="h-4 w-4 text-[#4B2A06]" />
                                            <span className="text-gray-700 font-medium">{onboardingStatus.custom_subqueries_count} Subqueries</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-md">
                                            <Brain className="h-4 w-4 text-[#4B2A06]" />
                                            <span className="text-gray-700 font-medium">Agent 3: {onboardingStatus.has_agent3_prompt ? "Custom" : "Default"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-1.5 rounded-md">
                                            <Shield className="h-4 w-4 text-[#4B2A06]" />
                                            <span className="text-gray-700 font-medium">Agent 4: {onboardingStatus.has_agent4_prompt ? "Custom" : "Default"}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Page Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="w-full">
                    <h1 className="text-2xl font-bold text-[#4B2A06]">
                        {isReOnboarding ? "Update SOP & Re-Configure" : "Welcome to Smart DRHP Platform"}
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        {isReOnboarding
                            ? "Upload an updated SOP to re-configure your AI pipeline. All custom prompts and subqueries will be regenerated."
                            : "Let's tailor the AI experience for your fund's specific requirements."
                        }
                    </p>
                    </div>
                      {/* Skip Option (first-time only) */}
                            {!isReOnboarding && (
                                <button
                                    type="button"
                                    onClick={() => navigate('/dashboard')}
                                    className="w-50 justify-end text-center text-sm text-[#4B2A06] hover:text-[#4B2A06] transition-colors py-2 border border-[#4B2A06] rounded-md"
                                >
                                    Skip for now — use default configuration
                                </button>
                            )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Left Column - SOP Upload */}
                        <div className="lg:col-span-7 space-y-5">
                            <div className="bg-white shadow-sm rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileTextIcon className="h-5 w-5 text-[#4B2A06]" />
                                    <h2 className="text-lg font-bold text-[#4B2A06]">
                                        {isReOnboarding ? "Upload Updated SOP" : "Upload Your SOP"}
                                    </h2>
                                    {isReOnboarding && (
                                        <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">Required</span>
                                    )}
                                </div>

                                {/* Upload Area */}
                                <div className={`relative border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${sopFile
                                        ? "border-green-300 bg-green-50/30"
                                        : "border-gray-200 bg-gray-50/50 hover:border-[#4B2A06]/30 hover:bg-gray-50"
                                    }`}>
                                    <input
                                        type="file"
                                        accept=".pdf,.docx"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    {sopFile ? (
                                        <div className="flex flex-col items-center">
                                            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                                            <p className="font-semibold text-[rgba(38,40,43,1)]">{sopFile.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{(sopFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                                                <Upload className="h-6 w-6 text-[#4B2A06]" />
                                            </div>
                                            <p className="font-semibold text-[rgba(38,40,43,1)]">Upload your Fund's Custom Summary SOP</p>
                                            <p className="text-xs text-gray-400 mt-1">Accepts PDF or DOCX</p>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 mt-3">
                                    {isReOnboarding
                                        ? "The Onboarding Agent will re-analyze your SOP, refactor subqueries, and regenerate custom prompts for Agents 3 & 4."
                                        : "Our Onboarding Agent will analyze your SOP document to customize the summary generation structure and validation rules automatically."
                                    }
                                </p>

                                {/* Onboarding Pipeline Steps */}
                                {sopFile && (
                                    <div className="mt-5 bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm font-semibold text-[#4B2A06] mb-3 flex items-center gap-2">
                                            <Sparkles className="h-4 w-4" />
                                            AI Onboarding Pipeline
                                        </p>
                                        <div className="space-y-2.5">
                                            {[
                                                "Analyze SOP & extract section requirements",
                                                `Refactor subqueries for your domain (${isReOnboarding ? "re-" : ""}compare vs 10 defaults)`,
                                                "Customize Summarization Agent (Agent 3) prompt",
                                                "Customize Validation Agent (Agent 4) prompt"
                                            ].map((step, idx) => (
                                                <div key={idx} className="flex items-center gap-3 text-sm">
                                                    <span className="bg-[#4B2A06] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-gray-600">{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Target Investors */}
                            <div className="bg-white shadow-sm rounded-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <UsersIcon className="h-5 w-5 text-[#4B2A06]" />
                                    <h2 className="text-lg font-bold text-[#4B2A06]">Target Investors</h2>
                                    <span className="text-xs text-gray-400 font-medium">(Optional)</span>
                                </div>
                                <label htmlFor="target-investors" className="text-sm text-gray-500 block mb-2">
                                    List specific investors to prioritize matching (comma separated)
                                </label>
                                <textarea
                                    id="target-investors"
                                    placeholder="e.g. Sequoia Capital, Accel, Tiger Global..."
                                    {...register("target_investors")}
                                    className="w-full min-h-[100px] rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-[rgba(38,40,43,1)] placeholder-gray-400 focus:border-[#4B2A06]/30 focus:ring-0 focus:outline-none resize-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Right Column - Feature Toggles + Actions */}
                        <div className="lg:col-span-5 space-y-6">
                           
                            <div className="bg-white shadow-sm rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <SettingsIcon className="h-5 w-5 text-[#4B2A06]" />
                                    <h2 className="text-lg font-bold text-[#4B2A06]">AI Feature Configuration</h2>
                                </div>

                                <div className="space-y-3">
                                    {/* Toggle: Investor Matching */}
                                    <Controller
                                        control={control}
                                        name="investor_match_only"
                                        render={({ field }) => (
                                            <div
                                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${field.value ? "border-[#4B2A06]/20 bg-[#4B2A06]/[0.03]" : "border-gray-100 bg-gray-50/30 hover:border-gray-200"
                                                    }`}
                                                onClick={() => field.onChange(!field.value)}
                                            >
                                                <div className="flex-1 pr-4">
                                                    <div className="font-semibold text-sm text-[rgba(38,40,43,1)]">Investor Matching</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Analyze and match potential investors from the database.</div>
                                                </div>
                                                <ToggleSwitch checked={field.value} />
                                            </div>
                                        )}
                                    />

                                    {/* Toggle: Valuation Analysis */}
                                    <Controller
                                        control={control}
                                        name="valuation_matching"
                                        render={({ field }) => (
                                            <div
                                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${field.value ? "border-[#4B2A06]/20 bg-[#4B2A06]/[0.03]" : "border-gray-100 bg-gray-50/30 hover:border-gray-200"
                                                    }`}
                                                onClick={() => field.onChange(!field.value)}
                                            >
                                                <div className="flex-1 pr-4">
                                                    <div className="font-semibold text-sm text-[rgba(38,40,43,1)]">Valuation Analysis</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Perform detailed valuation comparison with peers.</div>
                                                </div>
                                                <ToggleSwitch checked={field.value} />
                                            </div>
                                        )}
                                    />

                                    {/* Toggle: Adverse Findings */}
                                    <Controller
                                        control={control}
                                        name="adverse_finding"
                                        render={({ field }) => (
                                            <div
                                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${field.value ? "border-[#4B2A06]/20 bg-[#4B2A06]/[0.03]" : "border-gray-100 bg-gray-50/30 hover:border-gray-200"
                                                    }`}
                                                onClick={() => field.onChange(!field.value)}
                                            >
                                                <div className="flex-1 pr-4">
                                                    <div className="font-semibold text-sm text-[rgba(38,40,43,1)]">Adverse Findings Research</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Conduct automated web research for red flags.</div>
                                                </div>
                                                <ToggleSwitch checked={field.value} />
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Action Section */}
                            <div className="bg-white shadow-sm rounded-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="h-5 w-5 text-[#4B2A06]" />
                                    <h2 className="text-lg font-bold text-[#4B2A06]">
                                        {isReOnboarding ? "Apply Changes" : "Finalize Setup"}
                                    </h2>
                                </div>
                                <p className="text-sm text-gray-500 mb-5">
                                    {isReOnboarding
                                        ? "Re-run the AI onboarding pipeline with updated configuration and SOP."
                                        : "Configure your pipeline and kickstart the AI onboarding agents."
                                    }
                                </p>

                                <div className="flex gap-3">
                                    {isReOnboarding && (
                                        <button
                                            type="button"
                                            onClick={() => navigate('/dashboard')}
                                            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#4B2A06] text-white text-sm font-semibold hover:bg-[#3a2105] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {isReOnboarding ? "Re-Configuring..." : "Configuring AI..."}
                                            </>
                                        ) : isReOnboarding ? (
                                            <>
                                                <RefreshCw className="h-4 w-4" />
                                                Update & Re-Onboard
                                            </>
                                        ) : (
                                            <>
                                                Complete Onboarding
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                           
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Custom Toggle Switch matching the dashboard's brown palette
const ToggleSwitch = ({ checked }: { checked: boolean }) => (
    <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-[#4B2A06]" : "bg-gray-200"
        }`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"
            }`} />
    </div>
);

// Simple Icons
const FileTextIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

const SettingsIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);

const UsersIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);

export default OnboardingPage;
