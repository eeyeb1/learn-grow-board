import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Phone, Chrome, Github, Linkedin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMethod = "email" | "phone";

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Connect to your authentication backend
      if (isLogin) {
        // Simulate login
        console.log("Login with:", { email, password });
        toast.success("Welcome back!");
      } else {
        // Simulate signup
        console.log("Sign up with:", { email, password, fullName });
        toast.success("Account created successfully!");
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!codeSent) {
        // TODO: Connect to your SMS verification backend
        console.log("Send verification code to:", phoneNumber);
        setCodeSent(true);
        toast.success("Verification code sent!");
      } else {
        // TODO: Verify the code with your backend
        console.log("Verify code:", { phoneNumber, verificationCode });
        toast.success(isLogin ? "Welcome back!" : "Account created successfully!");
        onOpenChange(false);
        resetForm();
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // TODO: Connect to your OAuth provider
    console.log(`Login with ${provider}`);
    toast.info(`${provider} login coming soon!`);
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setPhoneNumber("");
    setVerificationCode("");
    setCodeSent(false);
    setAuthMethod("email");
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </DialogTitle>
        </DialogHeader>

        {/* Social Login Buttons */}
        <div className="space-y-3 mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("Google")}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("GitHub")}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin("LinkedIn")}
          >
            <Linkedin className="w-4 h-4 mr-2" />
            Continue with LinkedIn
          </Button>
        </div>

        <div className="relative my-4">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
            or continue with
          </span>
        </div>

        {/* Auth Method Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={authMethod === "email" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setAuthMethod("email");
              setCodeSent(false);
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button
            type="button"
            variant={authMethod === "phone" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => {
              setAuthMethod("phone");
              setCodeSent(false);
            }}
          >
            <Phone className="w-4 h-4 mr-2" />
            Phone
          </Button>
        </div>

        {/* Email Form */}
        {authMethod === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
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
              <Label htmlFor="password">Password</Label>
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
                <>{isLogin ? "Sign In" : "Create Account"}</>
              )}
            </Button>
          </form>
        )}

        {/* Phone Form */}
        {authMethod === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            {!isLogin && !codeSent && (
              <div className="space-y-2">
                <Label htmlFor="fullNamePhone">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullNamePhone"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  required
                  disabled={codeSent}
                />
              </div>
            </div>

            {codeSent && (
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="text-center tracking-widest"
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setCodeSent(false)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Didn't receive a code? Try again
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {codeSent ? "Verifying..." : "Sending code..."}
                </>
              ) : (
                <>{codeSent ? "Verify Code" : "Send Verification Code"}</>
              )}
            </Button>
          </form>
        )}

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={toggleMode}
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
