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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage("¡Suscripción activada correctamente!");
    } else if (params.get("donated") === "true") {
      setSuccessMessage("¡Gracias por tu donación!");
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
      }
    } catch {}
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
        alert("Perfil actualizado");
        fetchProfile();
      } else {
        const error = await response.json();
        alert(error.error || "Error al actualizar perfil");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
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
        alert("Contraseña cambiada");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const error = await response.json();
        alert(error.error || "Error al cambiar contraseña");
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
        alert("Tema guardado");
        fetchProfile();
      }
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/subscriptions/manage", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "No se pudo gestionar la suscripción");
      }
    } catch (error) {
      console.error("Error managing subscription:", error);
      alert("Error de conexión");
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("¿Seguro que quieres cancelar tu suscripción?")) return;
    try {
      const response = await fetch("/api/subscriptions/manage", { method: "DELETE" });
      const data = await response.json();
      if (response.ok) {
        alert("Suscripción cancelada");
        fetchProfile();
      } else {
        alert(data.error || "Error al cancelar");
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("Error de conexión");
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
          Mi Perfil
        </h1>

        {successMessage && (
          <div className="mb-6 p-4 rounded border border-green-500 bg-green-500/10 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-green-500 font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Avatar + Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AvatarUpload
              currentAvatar={profile.avatar}
              onAvatarUpdate={(url) => setProfile({ ...profile, avatar: url })}
            />

            <div>
              <label className="text-sm text-muted-foreground">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Biografía</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
                rows={3}
                placeholder="Cuéntanos sobre ti..."
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Email: {profile.email}</p>
              <p>Miembro desde: {new Date(profile.createdAt).toLocaleDateString("es")}</p>
              {profile.role === "ADMIN" && (
                <p className="text-primary font-semibold">Rol: Administrador</p>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Guardando..." : "Guardar perfil"}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Cambiar Contraseña
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full mt-1 p-2 rounded border border-border bg-input text-foreground"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={saving || !currentPassword || !newPassword}>
              Cambiar contraseña
            </Button>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.subscription ? (
              <div>
                <p className="font-semibold">{profile.subscription.plan?.displayName || "Plan activo"}</p>
                <p className="text-sm text-muted-foreground">
                  Estado: {profile.subscription.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  Precio: {profile.subscription.plan?.price} EUR
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                    Gestionar suscripción
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleCancelSubscription}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-2">No tienes una suscripción activa.</p>
                <Button variant="outline" onClick={() => router.push("/pricing")}>
                  Ver planes
                </Button>
              </div>
            )}

            {profile.donations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-2">Donaciones recientes:</p>
                {profile.donations.map((d) => (
                  <div key={d.id} className="text-xs text-muted-foreground">
                    {d.amount} {d.currency} — {d.paymentMethod} — {new Date(d.createdAt).toLocaleDateString("es")}
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
                Administración del Sitio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Logo del Sitio
                </h3>
                <LogoUpload
                  currentLogo={siteConfig.siteLogo || null}
                  onLogoUpdate={(url) => setSiteConfig({ ...siteConfig, siteLogo: url })}
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Enlaces rápidos</h3>
                <Button variant="outline" onClick={() => router.push("/admin")} className="w-full">
                  Ir al Panel de Admin (estadísticas)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
