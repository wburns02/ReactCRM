import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePortalLogin, usePortalVerify } from "@/api/hooks/usePortal";

interface LoginForm {
  email: string;
  phone: string;
}

interface VerifyForm {
  code: string;
}

type Step = "login" | "verify";

/**
 * Customer Portal Login Page
 * Uses magic link (email) or SMS code for authentication
 */
export function PortalLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loginMutation = usePortalLogin();
  const verifyMutation = usePortalVerify();

  const loginForm = useForm<LoginForm>();
  const verifyForm = useForm<VerifyForm>();

  const onSubmitLogin = async (data: LoginForm) => {
    setError("");
    setSuccess("");

    try {
      const payload =
        loginMethod === "email" ? { email: data.email } : { phone: data.phone };

      const result = await loginMutation.mutateAsync(payload);

      if (result.success) {
        setIdentifier(loginMethod === "email" ? data.email : data.phone);
        setSuccess(result.message || "Verification code sent!");
        setStep("verify");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(
        error.response?.data?.detail ||
          "Failed to send verification code. Please try again.",
      );
    }
  };

  const onSubmitVerify = async (data: VerifyForm) => {
    setError("");

    try {
      const payload =
        loginMethod === "email"
          ? { email: identifier, code: data.code }
          : { phone: identifier, code: data.code };

      const result = await verifyMutation.mutateAsync(payload);

      // Store portal token and customer data
      localStorage.setItem("portal_token", result.token);
      localStorage.setItem("portal_customer", JSON.stringify(result.customer));

      // Redirect to portal dashboard
      navigate("/portal");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(
        error.response?.data?.detail ||
          "Invalid verification code. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-4">🚽</div>
          <CardTitle>Customer Portal</CardTitle>
          <CardDescription>
            {step === "login"
              ? "Sign in to view your account, invoices, and request service"
              : "Enter the verification code we sent you"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && step === "verify" && (
            <div className="mb-4 p-3 rounded bg-green-100 text-green-700 text-sm">
              {success}
            </div>
          )}

          {step === "login" ? (
            <form
              onSubmit={loginForm.handleSubmit(onSubmitLogin)}
              className="space-y-4"
            >
              {/* Login method toggle */}
              <div className="flex rounded-md overflow-hidden border border-border">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    loginMethod === "email"
                      ? "bg-primary text-white"
                      : "bg-surface text-text-secondary hover:bg-surface-hover"
                  }`}
                  onClick={() => setLoginMethod("email")}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    loginMethod === "phone"
                      ? "bg-primary text-white"
                      : "bg-surface text-text-secondary hover:bg-surface-hover"
                  }`}
                  onClick={() => setLoginMethod("phone")}
                >
                  Phone
                </button>
              </div>

              {loginMethod === "email" ? (
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-text-primary mb-1"
                  >
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    {...loginForm.register("email", { required: true })}
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-text-primary mb-1"
                  >
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(512) 555-0123"
                    {...loginForm.register("phone", { required: true })}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending
                  ? "Sending..."
                  : "Send Verification Code"}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={verifyForm.handleSubmit(onSubmitVerify)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-text-primary mb-1"
                >
                  Verification Code
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  {...verifyForm.register("code", {
                    required: true,
                    minLength: 6,
                    maxLength: 6,
                  })}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify & Sign In"}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-text-muted hover:text-text-secondary"
                onClick={() => {
                  setStep("login");
                  setError("");
                  setSuccess("");
                }}
              >
                Use a different{" "}
                {loginMethod === "email" ? "email" : "phone number"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-text-muted">
              Need help? Call us at (512) 555-0123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
