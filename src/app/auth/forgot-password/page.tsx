"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; resetUrl?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setResult({
        success: true,
        message: data.message,
        resetUrl: data.resetUrl,
      });
    } catch (error) {
      setResult({
        success: false,
        message: "Error al enviar la solicitud",
      });
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="max-w-md mx-auto"
        >
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2 text-primary" />
              Recuperar contraseña
            </CardTitle>
            <CardDescription>
              Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
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
                  <div>
                    <p>{result.message}</p>
                    {result.resetUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">(Modo desarrollo — enlace de reseteo):</p>
                        <a href={result.resetUrl} className="text-xs text-gold-400 underline break-all">
                          {result.resetUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Link href="/auth/login">
                <Button variant="ghost" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading || result?.success}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        </motion.div>
      </main>
    </div>
  );
}
