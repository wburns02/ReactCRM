import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage, hasAuthToken } from "@/api/client.ts";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import {
  markSessionValidated,
  sanitizeRedirectUrl,
  cleanupLegacyAuth,
  storeSessionToken,
} from "@/lib/security";

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login page - handles user authentication
 *
 * SECURITY:
 * - Supports both cookie auth (preferred) and token auth (migration)
 * - Sanitizes redirect URLs to prevent open redirect attacks
 * - Cleans up legacy tokens on successful cookie auth
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SECURITY: Sanitize return URL to prevent open redirect
  // Default to "/" which triggers RoleBasedRedirect (techs → /my-dashboard, others → /dashboard)
  const rawReturnUrl = searchParams.get("return") || "/";
  const returnUrl = sanitizeRedirectUrl(rawReturnUrl);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check if already logged in (has valid session/token)
  useEffect(() => {
    if (hasAuthToken()) {
      const checkAuth = async () => {
        try {
          const { data } = await apiClient.get("/auth/me");
          if (data?.user) {
            // Session is valid, update state and redirect
            markSessionValidated(data.user.id);
            navigate(returnUrl, { replace: true });
          }
        } catch {
          // Session is invalid, stay on login
        }
      };
      checkAuth();
    }
  }, [navigate, returnUrl]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/auth/login", {
        email: data.email,
        password: data.password,
      });

      // Store JWT for Bearer auth fallback — mobile browsers block third-party
      // cookies (frontend and API are on different domains), so we also send
      // the token as a Bearer header on every request.
      const token = response.data?.access_token || response.data?.token;
      if (token) {
        storeSessionToken(token);
      }
      cleanupLegacyAuth();

      if (response.data?.user) {
        markSessionValidated(response.data.user.id);
      } else {
        markSessionValidated();
      }

      queryClient.clear();
      navigate(returnUrl, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-body p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl">🚽</span>
          </div>
          <h1 className="text-2xl font-bold text-mac-dark-blue">
            Mac Service Platform
          </h1>
          <p className="text-text-secondary mt-2">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  error={!!errors.email}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-danger">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register("password")}
                  error={!!errors.password}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-text-muted text-sm mt-6">
          Having trouble signing in? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
