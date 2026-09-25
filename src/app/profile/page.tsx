"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/avatar-upload";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { LogoUpload } from "@/components/logo-upload";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n";
import { User, Lock, CreditCard, Palette, Settings, Globe, CheckCircle } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  theme: string | null;
  role: string;
  createdAt: string;
  subscription: {
    plan: { name: string; displayName: string; price: number } | null;
    status: string;
  } | null;
  donations: {
    id: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { applyTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [siteConfig, setSiteConfig] = useState<Record<string, string>>({});
  const [savedLogo, setSavedLogo] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
    if (status === "authenticated") {
      fetchProfile();
      fetchSiteConfig();
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "true") {
      setSuccessKey("Profile.subscribedAlert");
    } else if (params.get("donated") === "true") {
      setSuccessKey("Profile.donatedAlert");
    }
    if (params.get("subscribed") || params.get("donated")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setName(data.name || "");
        setBio(data.bio || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteConfig = async () => {
    try {
      const response = await fetch("/api/admin/config");
      if (response.ok) {
        const data = await response.json();
        setSiteConfig(data);
        setSavedLogo(data.siteLogo || null);
      }
    } catch {}
  };

  const logoDirty = !!siteConfig.siteLogo && siteConfig.siteLogo !== savedLogo;

  const handleSaveLogo = async () => {
    if (!siteConfig.siteLogo) return;
    setSavingLogo(true);
    try {
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteLogo: siteConfig.siteLogo }),
      });
      if (response.ok) {
        setSavedLogo(siteConfig.siteLogo);
        window.dispatchEvent(new Event("site-config-updated"));
        setSuccessKey("Profile.logoSavedAlert");
      } else {
        const error = await response.json();
        alert(error.error || t("Profile.logoErrorAlert"));
      }
    } catch (error) {
      console.error("Error saving logo:", error);
      alert(t("Profile.connectionError"));
    } finally {
      setSavingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      if (response.ok) {
        alert(t("Profile.profileUpdated"));
        fetchProfile();
      } else {
        const error = await response.json();
        alert(error.error || t("Profile.profileUpdateError"));
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert(t("Profile.passwordMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      alert(t("Profile.passwordTooShort"));
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.ok) {
        alert(t("Profile.passwordChanged"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        alert(error.error || t("Profile.passwordChangeError"));
      }
    } catch (error) {
      console.error("Error changing password:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeUpdate = async (theme: string) => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (response.ok) {
        try {
          const parsed = JSON.parse(theme);
          applyTheme(parsed);
          window.dispatchEvent(new Event("theme-updated"));
        } catch {}
        setSuccessKey("Profile.themeSavedAlert");
        fetchProfile();
      } else {
        const error = await response.json();
        alert(error.error || t("Profile.themeErrorAlert"));
      }
    } catch (error) {
      console.error("Error saving theme:", error);
      alert(t("Profile.connectionError"));
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/subscriptions/manage", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || t("Profile.manageSubError"));
      }
    } catch (error) {
      console.error("Error managing subscription:", error);
      alert(t("Profile.connectionError"));
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm(t("Profile.confirmCancelSub"))) return;
    try {
      const response = await fetch("/api/subscriptions/manage", { method: "DELETE" });
      const data = await response.json();
      if (response.ok) {
        alert(t("Profile.subCancelled"));
        fetchProfile();
      } else {
        alert(data.error || t("Profile.cancelError"));
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert(t("Profile.connectionError"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dungeon">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-primary font-pixel mb-8 flex items-center gap-3">
          <User className="w-8 h-8" />
          {t("Profile.title")}
        </h1>

        {successKey && (
          <div className="mb-6 p-4 rounded border border-green-500 bg-green-500/10 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-green-500 font-semibold">{t(successKey)}</p>
          </div>
        )}

        {/* Avatar + Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t("Profile.personalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AvatarUpload
              currentAvatar={profile.avatar}
              onAvatarUpdate={(url) => setProfile({ ...profile, avatar: url })}
            />

            <div>
              <label className="text-sm text-muted-foreground">{t("Profile.name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
                placeholder={t("Profile.namePlaceholder")}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">{t("Profile.bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
                rows={3}
                placeholder={t("Profile.bioPlaceholder")}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>{t("Profile.emailLabel")}: {profile.email}</p>
              <p>{t("Profile.memberSince")} {new Date(profile.createdAt).toLocaleDateString(locale)}</p>
              {profile.role === "ADMIN" && (
                <p className="text-primary font-semibold">{t("Profile.roleAdmin")}</p>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? t("Profile.saving") : t("Profile.saveProfile")}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t("Profile.changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">{t("Profile.currentPassword")}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("Profile.newPassword")}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("Profile.confirmPassword")}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
              {t("Profile.changePasswordBtn")}
            </Button>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t("Profile.subscription")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.subscription ? (
              <div>
                <p className="font-semibold">{profile.subscription.plan?.displayName || t("Profile.activePlan")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Profile.statusLabel")} {profile.subscription.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("Profile.priceLabel")} {profile.subscription.plan?.price} EUR
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                    {t("Profile.manageSubscription")}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleCancelSubscription}>
                    {t("Profile.cancelBtn")}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-2">{t("Profile.noSubscription")}</p>
                <Button variant="outline" onClick={() => router.push("/pricing")}>
                  {t("Profile.seePlans")}
                </Button>
              </div>
            )}

            {profile.donations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">{t("Profile.recentDonations")}</p>
                {profile.donations.map((d) => (
                  <div key={d.id} className="text-xs text-muted-foreground">
                    {d.amount} {d.currency} — {d.paymentMethod} — {new Date(d.createdAt).toLocaleDateString(locale)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theme Customization */}
        <ThemeCustomizer
          currentTheme={profile.theme}
          onThemeUpdate={handleThemeUpdate}
        />

        {/* Admin Section */}
        {profile.role === "ADMIN" && (
          <Card className="mt-6 border-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t("Profile.siteAdmin")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t("Profile.siteLogo")}
                </h3>
                <LogoUpload
                  currentLogo={siteConfig.siteLogo || null}
                  onLogoUpdate={(url) => setSiteConfig({ ...siteConfig, siteLogo: url })}
                />
                {logoDirty && (
                  <div className="mt-3 flex items-center gap-3">
                    <Button size="sm" onClick={handleSaveLogo} disabled={savingLogo}>
                      {savingLogo ? t("Profile.saving") : t("Profile.saveLogo")}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {t("Profile.unsavedLogo")}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t("Profile.quickLinks")}</h3>
                <Button variant="outline" onClick={() => router.push("/admin")} className="w-full">
                  {t("Profile.adminPanel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
