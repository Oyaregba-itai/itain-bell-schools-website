import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { User, Mail, Lock, Upload, Eye, EyeOff } from "lucide-react";

const ProfilePage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newFullName, setNewFullName] = useState(profile?.full_name || "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(profile?.profile_picture_url || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (profile?.profile_picture_url) setProfileImageUrl(profile.profile_picture_url);
  }, [profile?.profile_picture_url]);

  const handleUpdateFullName = async () => {
    if (!newFullName.trim()) {
      toast({ title: "Error", description: "Full name cannot be empty", variant: "destructive" });
      return;
    }

    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newFullName })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Success", description: "Full name updated successfully" });
      setIsUpdatingName(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsUpdatingName(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast({ title: "Error", description: "Please enter a new email", variant: "destructive" });
      return;
    }

    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast({ 
        title: "Email Update Sent", 
        description: "Check your emails to confirm the change. You may need to confirm this change from your new email address.",
      });
      setNewEmail("");
      setIsChangingEmail(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Error", description: "All password fields are required", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters long", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Success", description: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsChangingPassword(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileName = `profile-${user?.id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(fileName);

      setProfileImageUrl(data.publicUrl);

      // Update profile with image URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_picture_url: data.publicUrl })
        .eq("user_id", user?.id);

      if (updateError) throw updateError;

      toast({ title: "Success", description: "Profile picture updated successfully" });
      setIsUploadingImage(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={40} />
              )}
            </div>
            <label htmlFor="profile-picture-input" className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/80 transition">
              <Upload size={16} />
            </label>
            <input
              id="profile-picture-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-heading text-foreground">{profile?.full_name}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground capitalize mt-1">{profile?.role} Portal</p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Change Full Name */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-primary" size={20} />
            <h3 className="text-lg font-heading text-foreground">Full Name</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Update your full name</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Edit Full Name
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Full Name</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <Button
                  onClick={handleUpdateFullName}
                  disabled={isUpdatingName}
                  className="w-full"
                >
                  {isUpdatingName ? "Updating..." : "Update Full Name"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Change Email */}
        <div className="bg-card rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="text-primary" size={20} />
            <h3 className="text-lg font-heading text-foreground">Email Address</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Change your email address</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Change Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Email Address</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Current Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
                <div>
                  <Label htmlFor="new-email">New Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A confirmation email will be sent to your new email address.
                </p>
                <Button
                  onClick={handleChangeEmail}
                  disabled={isChangingEmail}
                  className="w-full"
                >
                  {isChangingEmail ? "Sending..." : "Change Email"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-xl p-6 shadow-card md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="text-primary" size={20} />
            <h3 className="text-lg font-heading text-foreground">Password</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Update your password regularly for security</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full"
                >
                  {isChangingPassword ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-card rounded-xl p-6 shadow-card">
        <h3 className="text-lg font-heading text-foreground mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Type:</span>
            <span className="font-medium capitalize">{profile?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member Since:</span>
            <span className="font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
