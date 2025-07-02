import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { accessToken, refreshToken } = await authService.login(
        values.email,
        values.password
      );
      login(accessToken, refreshToken);
      toast.success("Login successful!");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 w-full max-w-lg mx-auto">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xl font-extrabold text-[#444] mb-2" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your email"
                  className="rounded-xl border border-[#E5E5E5] px-6 py-6 text-lg focus:ring-2 focus:ring-[#4B2A06] focus:border-[#4B2A06] shadow-none bg-white h-16"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xl font-extrabold text-[#444] mb-2" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    className="rounded-xl border border-[#E5E5E5] px-6 py-6 text-lg focus:ring-2 focus:ring-[#4B2A06] focus:border-[#4B2A06] shadow-none bg-white pr-12 h-16"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex justify-end -mt-6 mb-2">
          <button
            type="button"
            className="text-[#4B2A06] text-base font-semibold hover:underline focus:outline-none"
            onClick={() => navigate('/forgot-password')}
            style={{ fontFamily: 'Inter, Arial, sans-serif' }}
          >
            Forgot Password
          </button>
        </div>
        <Button
          type="submit"
          className="w-full bg-[#4B2A06] text-white text-xl font-bold py-6 rounded-xl shadow-none hover:bg-[#3a2004] transition h-16"
          disabled={isLoading}
          style={{ fontFamily: 'Inter, Arial, sans-serif' }}
        >
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Log in
        </Button>
      </form>
    </Form>
  );
}
