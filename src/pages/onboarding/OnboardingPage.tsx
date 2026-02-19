
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, FileType, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';

const OnboardingPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [sopFile, setSopFile] = useState<File | null>(null);

    const { control, handleSubmit, register, formState: { errors } } = useForm({
        defaultValues: {
            investor_match_only: false,
            valuation_matching: false,
            adverse_finding: false,
            target_investors: "",
        }
    });

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
        if (!user?.domainId) {
            toast({
                title: "Error",
                description: "Domain ID not found for the current user.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append("domainId", user.domainId);

            if (sopFile) {
                formData.append("file", sopFile);
            }

            const config = {
                toggles: {
                    investor_match_only: data.investor_match_only,
                    valuation_matching: data.valuation_matching,
                    adverse_finding: data.adverse_finding
                },
                targetInvestors: data.target_investors ? data.target_investors.split(',').map((s: string) => s.trim()) : []
            };

            formData.append("config", JSON.stringify(config));

            // Call Python AI Platform directly or via Node proxy
            // Assuming direct call for this demo or update URL to match your environment
            // Using a relative path assuming proxy is set up in vite.config or backend handles it
            // Update: We'll target the Python API directly if exposed or via Node
            // Let's assume there's a proxy; typical pattern in this project seems to be direct or proxied.
            // Adjust URL as needed. For now assuming "/api/v1/onboarding/setup" if proxy or full URL

            // To be safe, usually frontend talks to Node backend. 
            // We should use the API service. But for now, fetch to localhost:8000 for AI platform directly if dev
            // Or use the provided API base URL.

            // NOTE: Replace with actual AI Platform URL if known, e.g., http://localhost:8000
            const API_URL = import.meta.env.VITE_AI_PLATFORM_URL || "http://localhost:8000";

            const response = await fetch(`${API_URL}/onboarding/setup`, {
                method: "POST",
                body: formData, // FormData automatically sets multipart/form-data
            });

            if (!response.ok) {
                throw new Error("Failed to submit onboarding data");
            }

            toast({
                title: "Onboarding Started",
                description: "Your configurations are being processed by our AI agents. This may take a few minutes.",
            });

            // Redirect to Dashboard
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (error) {
            console.error(error);
            toast({
                title: "Submission Failed",
                description: "There was an error submitting your details. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-3xl">
            <Card className="w-full shadow-lg">
                <CardHeader className="text-center border-b bg-muted/20">
                    <CardTitle className="text-2xl font-bold text-primary">Welcome to Smart DRHP Platform</CardTitle>
                    <CardDescription>Let's tailor the AI experience for your fund's specific requirements.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8 pt-6">

                        {/* 1. SOP Upload Section */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <FileTextIcon className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">Fund SOP & Template</h3>
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
                                Our Onboarding Agent will analyze your SOP document to customize the summary generation structure and validation rules automatically.
                            </p>
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
                    <CardFooter className="bg-muted/10 p-6 flex justify-end">
                        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Configuring Tenant AI...
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
