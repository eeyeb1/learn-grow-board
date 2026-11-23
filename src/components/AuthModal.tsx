import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Chrome, ArrowLeft, CheckCircle, Building2, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open straight into signup and highlight the Company / Organization option (used by "Post a Role" buttons). */
  highlightCompany?: boolean;
}

type AuthView = "login" | "signup" | "forgot-password" | "reset-sent";
type UserType = "applicant" | "company";

const AuthModal = ({ open, onOpenChange, highlightCompany = false }: AuthModalProps) => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<AuthView>("login");
  const [userType, setUserType] = useState<UserType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // When opened from a "Post a Role" button, jump straight to signup with the company option highlighted
  useEffect(() => {
    if (open && highlightCompany) {
      setView("signup");
      setUserType(null);
    }
  }, [open, highlightCompany]);

  const isLogin = view === "login";
  const isSignup = view === "signup";
  const isForgotPassword = view === "forgot-password";
  const isResetSent = view === "reset-sent";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message || "Invalid email or password");
          return;
        }
        toast.success("Welcome back!");
      } else {
        const { error } = await signUp(email, password, { 
          full_name: fullName,
          user_type: userType || "applicant"
        });
        if (error) {
          toast.error(error.message || "Failed to create account");
          return;
        }

        if (userType === "company") {
          sessionStorage.setItem("employer-pathway", "register");
          toast.success("Account created. Verify your email, then complete company verification.");
        } else {
          toast.success("Account created successfully!");
        }
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) {
        toast.error(error.message || "Failed to send reset email");
        return;
      }
      setView("reset-sent");
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (userType === "company") sessionStorage.setItem("employer-pathway", "register");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${userType === "company" ? "/employer/register" : "/"}`,
        },
      });
      if (error) {
        toast.error(error.message || "Failed to sign in with Google");
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setView("login");
    setUserType(null);
  };

  const getTitle = () => {
    switch (view) {
      case "login":
        return "Welcome Back";
      case "signup":
        if (!userType) return "Join Us";
        return userType === "company" ? "Register Your Company" : "Create Account";
      case "forgot-password":
        return "Reset Password";
      case "reset-sent":
        return "Check Your Email";
      default:
        return "Welcome";
    }
  };

  // Reset Sent Success View
  if (isResetSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-center">
              {getTitle()}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setView("forgot-password")}
            >
              Try again
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setView("login");
                setEmail("");
              }}
            >
              Back to Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-center">
              {getTitle()}
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-muted-foreground text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setView("login")}
            className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  // User Type Selection View (only for signup)
  if (isSignup && !userType) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-center">
              {getTitle()}
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-muted-foreground text-sm">
            How would you like to use the platform?
          </p>

          <div className="grid gap-4 mt-4">
            <button
              type="button"
              onClick={() => setUserType("applicant")}
              className="group relative flex flex-col items-center p-6 rounded-xl border-2 border-border hover:border-primary transition-all bg-card hover:bg-primary/5"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Experience Seeker</h3>
              <p className="text-sm text-muted-foreground text-center">
                Looking for volunteer opportunities to build skills and gain experience
              </p>
            </button>

            <button
              type="button"
              onClick={() => { onOpenChange(false); navigate('/employer/register'); }}
              className={`group relative flex flex-col items-center p-6 rounded-xl border-2 transition-all bg-card hover:bg-primary/5 overflow-hidden ${
                highlightCompany
                  ? "border-primary shadow-card"
                  : "border-border hover:border-primary"
              }`}
            >
              {highlightCompany && (
                <>
                  {/* Sweeping highlight: guides users to the employer account needed to post a role */}
                  <span className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-employer-sweep" />
                  <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    For posting roles
                  </span>
                </>
              )}
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Company / Organization</h3>
              <p className="text-sm text-muted-foreground text-center">
                Post volunteer roles and find talented individuals for your team
              </p>
            </button>
          </div>

          {highlightCompany && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Posting a role requires a Company / Organization account.
            </p>
          )}

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setView("login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Already have an account?{" "}
              <span className="text-primary font-medium">Sign in</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main Login/Signup View
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-center">
            {getTitle()}
          </DialogTitle>
          {isSignup && userType && (
            <button
              type="button"
              onClick={() => setUserType(null)}
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Change account type
            </button>
          )}
        </DialogHeader>

        {/* Social Login Buttons */}
        <div className="space-y-3 mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
        </div>

        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
            or continue with
          </span>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{userType === "company" ? "Contact Person Name" : "Full Name"}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={userType === "company" ? "Enter contact person name" : "Enter your full name"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required={isSignup}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setView("forgot-password")}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>{isLogin ? "Sign In" : userType === "company" ? "Register Company" : "Create Account"}</>
              )}
            </Button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => {
              setView(isLogin ? "signup" : "login");
              setUserType(null);
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <span className="text-primary font-medium">Sign up</span>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <span className="text-primary font-medium">Sign in</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
