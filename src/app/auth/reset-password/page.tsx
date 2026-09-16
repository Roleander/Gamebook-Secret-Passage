"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setResult({
        success: false,
        message: "Token no proporcionado. Solicita un nuevo enlace de recuperación.",
      });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setResult({ success: false, message: "Las contraseñas no coinciden" });
      return;
    }

    if (password.length < 6) {
      setResult({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error || "Error al restablecer la contraseña" });
      }
    } catch (error) {
      setResult({ success: false, message: "Error al conectar con el servidor" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio de sesión
        </Link>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2 text-primary" />
              Nueva contraseña
            </CardTitle>
            <CardDescription>
              Introduce tu nueva contraseña.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {result && (
                <div className={`p-3 text-sm rounded-md flex items-start gap-2 ${
                  result.success
                    ? "bg-green-500/10 border border-green-500/50 text-green-500"
                    : "bg-destructive/10 border border-destructive/50 text-destructive"
                }`}>
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <p>{result.message}</p>
                </div>
              )}

              {!token && !result && (
                <div className="p-3 text-sm rounded-md bg-destructive/10 border border-destructive/50 text-destructive flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>No se proporcionó un token válido. Solicita un nuevo enlace de recuperación.</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Nueva contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!token || result?.success}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar contraseña
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={!token || result?.success}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/auth/login">
                <Button variant="ghost" type="button">
                  Cancelar
                </Button>
              </Link>
              {result?.success ? (
                <Link href="/auth/login">
                  <Button>Iniciar sesión</Button>
                </Link>
              ) : (
                <Button type="submit" disabled={loading || !token}>
                  {loading ? "Restableciendo..." : "Restablecer contraseña"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dungeon flex items-center justify-center text-muted-foreground">Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
