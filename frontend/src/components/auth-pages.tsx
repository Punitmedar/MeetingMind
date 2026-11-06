import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileAudio2,
  KeyRound,
  ListChecks,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  forgotPassword,
  loginUser,
  registerUser,
  resetPassword,
  verifyResetToken,
} from "@/lib/api";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function validatePasswordStrength(pwd: string): string | null {
  if (pwd.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(pwd)) {
    return "Password must include at least one letter.";
  }
  if (!/\d/.test(pwd)) {
    return "Password must include at least one number.";
  }
  return null;
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#EAE6FA] via-[#E4DCF9] to-[#DCD3F7] p-3 text-foreground sm:p-6 lg:p-8 dark:from-workspace dark:via-background dark:to-workspace">
      {/* Top right theme toggle */}
      <ThemeToggle className="fixed top-3 right-3 z-50 shadow-xs sm:top-5 sm:right-5" />

      {/* Main Container */}
      <div className="grid w-full max-w-[960px] grid-cols-1 overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_20px_50px_-20px_rgba(72,58,168,0.18)] sm:rounded-[28px] lg:min-h-[580px] lg:grid-cols-12">
        {/* Left Branding Panel */}
        <div className="relative flex flex-col justify-between border-b border-border/70 bg-gradient-to-br from-[#F5F2FD] via-[#EEE8FC] to-[#E3DCFA] p-6 sm:p-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-10 dark:border-border dark:from-[#231E3F] dark:via-[#1D1836] dark:to-[#17132D]">
          <div className="flex items-center justify-between">
            <Brand />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-card lg:hidden"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
          </div>

          <div className="my-4 lg:my-auto lg:py-6">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl lg:text-2xl">
              Every meeting deserves a clear outcome.
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Turn conversations into searchable transcripts, summaries, decisions and action items.
            </p>

            {/* Three genuine product capabilities */}
            <ul className="mt-4 hidden space-y-2.5 text-xs font-medium text-foreground/85 sm:block sm:mt-6 sm:space-y-3 sm:text-sm">
              <li className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <FileAudio2 className="size-4" />
                </span>
                <span>Audio and video transcription</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-success-soft text-success">
                  <CheckCircle2 className="size-4" />
                </span>
                <span>Summaries, minutes and decisions</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <ListChecks className="size-4" />
                </span>
                <span>Action items with owners and deadlines</span>
              </li>
            </ul>
          </div>

          <div className="hidden items-center justify-between text-xs text-muted-foreground lg:flex">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-3.5" />
              Back to home
            </Link>
            <span>&copy; {new Date().getFullYear()} MeetingMind</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-center bg-card p-6 sm:p-10 lg:col-span-7 lg:p-12">
          <div className="mx-auto w-full max-w-[380px]">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setServerError("");
    const errors: { email?: string; password?: string } = {};

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Please enter your password.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(normalizedEmail, password);
      toast.success(`Welcome back, ${data.name || data.email}`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Invalid email or password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your MeetingMind workspace to access your meetings."
    >
      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-foreground">
            Email address
          </label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.email;
                  return n;
                });
              }
            }}
            placeholder="Enter your email address"
            autoComplete="email"
            required
            disabled={loading}
            className={`h-11 rounded-xl bg-card ${
              fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-medium text-foreground">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => {
                    const n = { ...prev };
                    delete n.password;
                    return n;
                  });
                }
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
              className={`h-11 rounded-xl bg-card pr-10 ${
                fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl font-medium shadow-xs"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setServerError("");
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      errors.name = "Please enter your full name (at least 2 characters).";
    }

    if (!normalizedEmail) {
      errors.email = "Please enter your email address.";
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    const pwdError = validatePasswordStrength(password);
    if (pwdError) {
      errors.password = pwdError;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await registerUser(normalizedEmail, password, trimmedName);
      toast.success("Account created successfully! Please sign in.");
      navigate({ to: "/login" });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Start organizing your meeting transcripts, summaries, and action items."
    >
      <form onSubmit={handleRegister} className="space-y-3.5" noValidate>
        <div>
          <label
            htmlFor="register-name"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Full name
          </label>
          <Input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.name;
                  return n;
                });
              }
            }}
            placeholder="Enter your full name"
            autoComplete="name"
            required
            disabled={loading}
            className={`h-11 rounded-xl bg-card ${
              fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Email address
          </label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) {
                setFieldErrors((prev) => {
                  const n = { ...prev };
                  delete n.email;
                  return n;
                });
              }
            }}
            placeholder="Enter your email address"
            autoComplete="email"
            required
            disabled={loading}
            className={`h-11 rounded-xl bg-card ${
              fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => {
                    const n = { ...prev };
                    delete n.password;
                    return n;
                  });
                }
              }}
              placeholder="Create a password"
              autoComplete="new-password"
              required
              disabled={loading}
              className={`h-11 rounded-xl bg-card pr-10 ${
                fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">
              At least 8 characters with at least one letter and one number.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="register-confirm-password"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Confirm password
          </label>
          <div className="relative">
            <Input
              id="register-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => {
                    const n = { ...prev };
                    delete n.confirmPassword;
                    return n;
                  });
                }
              }}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              disabled={loading}
              className={`h-11 rounded-xl bg-card pr-10 ${
                fieldErrors.confirmPassword
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl font-medium shadow-xs"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign In
        </Link>
      </div>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [serverError, setServerError] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setServerError("");
    setFieldError(undefined);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFieldError("Please enter your email address.");
      return;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setFieldError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(normalizedEmail);
      setSubmittedMessage(response.message);
      setSmtpConfigured(response.smtp_configured);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Failed to submit password reset request.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email address to receive a password reset link."
    >
      {submittedMessage ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="font-semibold">Request received</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{submittedMessage}</p>
            </div>
          </div>

          {smtpConfigured === false && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-xs leading-5 text-foreground">
              <p className="font-semibold text-warning">SMTP Email Delivery Not Configured</p>
              <p className="mt-1 text-muted-foreground">
                A single-use reset token has been generated, but outgoing SMTP email is not
                configured in <code className="font-mono">backend/.env</code>.
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button asChild variant="outline" className="h-11 w-full rounded-xl">
              <Link to="/login">Return to Sign In</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Email address
            </label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(undefined);
              }}
              placeholder="Enter your email address"
              autoComplete="email"
              required
              disabled={loading}
              className={`h-11 rounded-xl bg-card ${
                fieldError ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {fieldError && <p className="mt-1 text-xs text-destructive">{fieldError}</p>}
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl font-medium shadow-xs"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const rawToken = (params.get("token") ?? "").trim();
    setToken(rawToken);

    if (!rawToken) {
      setTokenValid(false);
      setVerifying(false);
      return;
    }

    verifyResetToken(rawToken)
      .then((res) => {
        setTokenValid(Boolean(res.valid));
      })
      .catch(() => {
        setTokenValid(false);
      })
      .finally(() => {
        setVerifying(false);
      });
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setServerError("");
    const errors: { newPassword?: string; confirmPassword?: string } = {};

    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) {
      errors.newPassword = pwdError;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      toast.success("Password reset successfully! You can now sign in.");
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 1500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your MeetingMind account."
    >
      {verifying ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      ) : !tokenValid ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
            <KeyRound className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Invalid or expired reset link</p>
              <p className="mt-1 leading-5">
                This password reset link is invalid, has already been used, or has expired. Please
                request a new link.
              </p>
            </div>
          </div>

          <Button asChild className="h-11 w-full rounded-xl">
            <Link to="/forgot-password">Request New Reset Link</Link>
          </Button>
        </div>
      ) : success ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="font-semibold">Password updated</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your password has been updated. Redirecting to sign in...
              </p>
            </div>
          </div>
          <Button asChild className="h-11 w-full rounded-xl">
            <Link to="/login">Go to Sign In</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="reset-new-password"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              New password
            </label>
            <div className="relative">
              <Input
                id="reset-new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => {
                      const n = { ...prev };
                      delete n.newPassword;
                      return n;
                    });
                  }
                }}
                placeholder="Create a new password"
                autoComplete="new-password"
                required
                disabled={loading}
                className={`h-11 rounded-xl bg-card pr-10 ${
                  fieldErrors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {fieldErrors.newPassword ? (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.newPassword}</p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                At least 8 characters with at least one letter and one number.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="mb-1.5 block text-xs font-medium text-foreground"
            >
              Confirm new password
            </label>
            <Input
              id="reset-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => {
                    const n = { ...prev };
                    delete n.confirmPassword;
                    return n;
                  });
                }
              }}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              required
              disabled={loading}
              className={`h-11 rounded-xl bg-card ${
                fieldErrors.confirmPassword
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl font-medium shadow-xs"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
