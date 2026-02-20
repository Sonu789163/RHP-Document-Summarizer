
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, CheckCircle, AlertCircle, RefreshCw, Shield, Brain, Search } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import { domainService, OnboardingStatus } from '@/services/domainService';

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
            <div className="container mx-auto py-10 max-w-3xl flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl">
            {/* Onboarding Status Banner */}
            {onboardingStatus && onboardingStatus.onboarding_status !== "pending" && (
                <Card className="mb-6 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-start space-x-4">
                            <div className={`p-2 rounded-full ${
                                onboardingStatus.onboarding_status === "completed" ? "bg-green-100 text-green-600" :
                                onboardingStatus.onboarding_status === "processing" ? "bg-yellow-100 text-yellow-600" :
                                onboardingStatus.onboarding_status === "failed" ? "bg-red-100 text-red-600" :
                                "bg-gray-100 text-gray-600"
                            }`}>
                                {onboardingStatus.onboarding_status === "completed" ? <CheckCircle className="h-5 w-5" /> :
                                 onboardingStatus.onboarding_status === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> :
                                 <AlertCircle className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">
                                    {onboardingStatus.onboarding_status === "completed" ? "Onboarding Complete" :
                                     onboardingStatus.onboarding_status === "processing" ? "Onboarding In Progress" :
                                     onboardingStatus.onboarding_status === "completed_no_sop" ? "Basic Config Active" :
                                     "Onboarding Status"}
                                </h3>
                                {onboardingStatus.last_onboarded && (
                                    <p className="text-sm text-muted-foreground">
                                        Last configured: {new Date(onboardingStatus.last_onboarded).toLocaleString()}
                                    </p>
                                )}

                                {/* Config Summary */}
                                {(onboardingStatus.onboarding_status === "completed") && (
                                    <div className="mt-3 grid grid-cols-3 gap-3">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Search className="h-4 w-4 text-primary" />
                                            <span>{onboardingStatus.custom_subqueries_count} Subqueries</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Brain className="h-4 w-4 text-primary" />
                                            <span>Agent 3: {onboardingStatus.has_agent3_prompt ? "Custom" : "Default"}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Shield className="h-4 w-4 text-primary" />
                                            <span>Agent 4: {onboardingStatus.has_agent4_prompt ? "Custom" : "Default"}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="w-full shadow-lg">
                <CardHeader className="text-center border-b bg-muted/20">
                    <CardTitle className="text-2xl font-bold text-primary">
                        {isReOnboarding ? "Update SOP & Re-Configure" : "Welcome to Smart DRHP Platform"}
                    </CardTitle>
                    <CardDescription>
                        {isReOnboarding 
                            ? "Upload an updated SOP to re-configure your AI pipeline. All custom prompts and subqueries will be regenerated."
                            : "Let's tailor the AI experience for your fund's specific requirements."
                        }
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8 pt-6">

                        {/* 1. SOP Upload Section */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <FileTextIcon className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">
                                    {isReOnboarding ? "Upload Updated SOP" : "Fund SOP & Template"}
                                </h3>
                                {isReOnboarding && (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Required</span>
                                )}
                            </div>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer bg-muted/10 relative">
                                <Input
                                    type="file"
                                    accept=".pdf,.docx"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                {sopFile ? (
                                    <div className="flex flex-col items-center text-green-600">
                                        <CheckCircle className="h-10 w-10 mb-2" />
                                        <p className="font-medium">{sopFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(sopFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <Upload className="h-10 w-10 mb-2" />
                                        <p className="font-medium">Upload your Fund's Custom Summary SOP</p>
                                        <p className="text-xs mt-1">Accepts PDF or DOCX</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {isReOnboarding 
                                    ? "The Onboarding Agent will re-analyze your SOP, refactor subqueries, and regenerate custom prompts for Agents 3 & 4."
                                    : "Our Onboarding Agent will analyze your SOP document to customize the summary generation structure and validation rules automatically."
                                }
                            </p>

                            {/* What happens during onboarding */}
                            {sopFile && (
                                <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                                    <p className="text-sm font-medium text-primary">AI Onboarding Pipeline:</p>
                                    <div className="space-y-1.5 text-sm text-muted-foreground">
                                        <div className="flex items-center space-x-2">
                                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                                            <span>Analyze SOP & extract section requirements</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                                            <span>Refactor subqueries for your domain ({isReOnboarding ? "re-" : ""}compare vs 10 defaults)</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                                            <span>Customize Summarization Agent (Agent 3) prompt</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                                            <span>Customize Validation Agent (Agent 4) prompt</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr />

                        {/* 2. AI Feature Toggles */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <SettingsIcon className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">AI Feature Configuration</h3>
                            </div>

                            <div className="grid gap-4">
                                <div className="flex items-center justify-between space-x-4 border p-4 rounded-md">
                                    <div className="flex flex-col space-y-1">
                                        <Label htmlFor="investor-match" className="font-medium">Investor Matching</Label>
                                        <span className="text-sm text-muted-foreground">Analyze and match potential investors from the database.</span>
                                    </div>
                                    <Controller
                                        control={control}
                                        name="investor_match_only"
                                        render={({ field }) => (
                                            <Switch checked={field.value} onCheckedChange={field.onChange} id="investor-match" />
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-4 border p-4 rounded-md">
                                    <div className="flex flex-col space-y-1">
                                        <Label htmlFor="valuation-match" className="font-medium">Valuation Analysis</Label>
                                        <span className="text-sm text-muted-foreground">Perform detailed valuation comparison with peers.</span>
                                    </div>
                                    <Controller
                                        control={control}
                                        name="valuation_matching"
                                        render={({ field }) => (
                                            <Switch checked={field.value} onCheckedChange={field.onChange} id="valuation-match" />
                                        )}
                                    />
                                </div>

                                <div className="flex items-center justify-between space-x-4 border p-4 rounded-md">
                                    <div className="flex flex-col space-y-1">
                                        <Label htmlFor="adverse-finding" className="font-medium">Adverse Findings Research</Label>
                                        <span className="text-sm text-muted-foreground">Conduct automated web research for red flags.</span>
                                    </div>
                                    <Controller
                                        control={control}
                                        name="adverse_finding"
                                        render={({ field }) => (
                                            <Switch checked={field.value} onCheckedChange={field.onChange} id="adverse-finding" />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Target Investors */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <UsersIcon className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">Target Investors (Optional)</h3>
                            </div>
                            <Label htmlFor="target-investors">List specific investors to prioritize matching (comma separated)</Label>
                            <Textarea
                                id="target-investors"
                                placeholder="e.g. Sequoia Capital, Accel, Tiger Global..."
                                {...register("target_investors")}
                                className="min-h-[100px]"
                            />
                        </div>

                    </CardContent>
                    <CardFooter className="bg-muted/10 p-6 flex justify-end gap-3">
                        {isReOnboarding && (
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => navigate('/dashboard')}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isReOnboarding ? "Re-Configuring AI Pipeline..." : "Configuring Tenant AI..."}
                                </>
                            ) : isReOnboarding ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Update & Re-Onboard
                                </>
                            ) : (
                                "Complete Onboarding"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

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
