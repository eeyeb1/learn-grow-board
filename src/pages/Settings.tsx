import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Bell, Shield, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";

const Settings = () => {
  const { user, userType } = useAuth();
  const { 
    profile, 
    loading: profileLoading, 
    uploading,
    updateProfile, 
    updateNotificationPreferences, 
    uploadAvatar,
    sendPasswordReset 
  } = useUserProfile();
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [fullName, setFullName] = useState("");

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [applicationUpdates, setApplicationUpdates] = useState(true);
  const [newOpportunities, setNewOpportunities] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Sync form state with profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmailNotifications(profile.email_notifications ?? true);
      setApplicationUpdates(profile.application_updates ?? true);
      setNewOpportunities(profile.new_opportunities ?? false);
      setMarketingEmails(profile.marketing_emails ?? false);
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12 md:pt-28">
          <div className="container mx-auto px-4">
            <Card className="max-w-md mx-auto p-8 text-center">
              <SettingsIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-bold text-xl text-foreground mb-2">
                Sign In Required
              </h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to access your settings.
              </p>
              <Button variant="hero" onClick={() => setAuthModalOpen(true)}>
                Sign In
              </Button>
            </Card>
          </div>
        </section>
        <Footer />
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName });
    setSaving(false);
    
    if (error) {
      toast.error("Failed to update profile. Please try again.");
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    const { error } = await updateNotificationPreferences({
      email_notifications: emailNotifications,
      application_updates: applicationUpdates,
      new_opportunities: newOpportunities,
      marketing_emails: marketingEmails,
    });
    setSaving(false);
    
    if (error) {
      toast.error("Failed to save preferences. Please try again.");
    } else {
      toast.success("Notification preferences saved");
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    const { error } = await uploadAvatar(file);
    
    if (error) {
      toast.error("Failed to upload avatar. Please try again.");
    } else {
      toast.success("Avatar updated successfully");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async () => {
    const { error } = await sendPasswordReset();
    
    if (error) {
      toast.error("Failed to send reset email. Please try again.");
    } else {
      toast.success("Password reset email sent to your inbox");
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion requires confirmation. Please contact support.");
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="pt-24 pb-12 md:pt-28">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="pt-24 pb-8 md:pt-28 gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground">
                Settings
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Settings Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="account" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Account</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card className="p-6">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-6">
                    Profile Information
                  </h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                          <img 
                            src={profile.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User className="w-10 h-10 text-primary" />
                        )}
                      </div>
                      <button 
                        onClick={handleAvatarClick}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Profile Photo</p>
                      <p className="text-sm text-muted-foreground">
                        JPG, PNG or GIF. Max 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={user.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed directly. Contact support if needed.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Account Type</Label>
                      <div className="px-3 py-2 rounded-md bg-muted text-sm text-muted-foreground">
                        {userType === "company" ? "Company Account" : "Experience Seeker"}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <Button variant="hero" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card className="p-6">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-6">
                    Notification Preferences
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Application Updates</p>
                        <p className="text-sm text-muted-foreground">
                          {userType === "company"
                            ? "Get notified when you receive new applications"
                            : "Get notified when your application status changes"}
                        </p>
                      </div>
                      <Switch
                        checked={applicationUpdates}
                        onCheckedChange={setApplicationUpdates}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">New Opportunities</p>
                        <p className="text-sm text-muted-foreground">
                          {userType === "company"
                            ? "Get notified about platform updates"
                            : "Get notified about new roles matching your interests"}
                        </p>
                      </div>
                      <Switch
                        checked={newOpportunities}
                        onCheckedChange={setNewOpportunities}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Marketing Emails</p>
                        <p className="text-sm text-muted-foreground">
                          Tips, resources, and product updates
                        </p>
                      </div>
                      <Switch
                        checked={marketingEmails}
                        onCheckedChange={setMarketingEmails}
                      />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <Button variant="hero" onClick={handleSaveNotifications} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </Button>
                </Card>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account">
                <div className="space-y-6">
                  {/* Password Section */}
                  <Card className="p-6">
                    <h2 className="font-display font-semibold text-lg text-foreground mb-2">
                      Change Password
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      We'll send a password reset link to your email address.
                    </p>
                    <Button variant="outline" onClick={handleChangePassword}>
                      Send Reset Link
                    </Button>
                  </Card>

                  {/* Danger Zone */}
                  <Card className="p-6 border-destructive/50">
                    <h2 className="font-display font-semibold text-lg text-destructive mb-2">
                      Danger Zone
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                      Delete Account
                    </Button>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Settings;
