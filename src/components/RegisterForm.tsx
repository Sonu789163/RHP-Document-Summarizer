import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { authService } from "@/services/authService";

const formSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address." }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long." })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter.",
      })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter.",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number." })
      .regex(/[^a-zA-Z0-9]/, {
        message: "Password must contain at least one special character.",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { accessToken, refreshToken } = await authService.register({
        email: values.email,
        password: values.password,
      });
      login(accessToken, refreshToken);
      toast.success("Account created successfully!");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        "Registration failed. Please try again.";
      if (errorMessage.toLowerCase().includes("user already exists")) {
        toast.error("Email already registered.", {
          action: {
            label: "Log In",
            onClick: onSwitchToLogin,
          },
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <div className="w-full max-w-lg mx-auto min-h-[520px] flex flex-col justify-center">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                {/* <FormMessage /> */}
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
                {/* <FormMessage /> */}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl font-extrabold text-[#444] mb-2" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      className="rounded-xl border border-[#E5E5E5] px-6 py-6 text-lg focus:ring-2 focus:ring-[#4B2A06] focus:border-[#4B2A06] shadow-none bg-white pr-12 h-16"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-6 w-6" />
                      ) : (
                        <Eye className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                </FormControl>
                {/* <FormMessage /> */}
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full bg-[#4B2A06] text-white text-base font-semibold py-3 rounded-lg shadow-none hover:bg-[#3a2004] transition"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register
          </Button>
        </form>
      </div>
    </Form>
  );
}
