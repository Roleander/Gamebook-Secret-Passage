"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { authError } from "@/lib/auth-errors";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError(t("Auth.passwordMismatch"));
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(t("Auth.passwordTooShort"));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(authError(t, data, "Auth.registerError"));
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const callbackUrl = params.get("callbackUrl");
      router.push(callbackUrl ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}&registered=true` : "/auth/login?registered=true");
    } catch (err) {
      setError(t("Auth.connectionError"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md"
      >
      <Card className="w-full max-w-md border-medieval">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4">
            <Image
              src="/icon.png"
              alt="Secret Passage"
              width={40}
              height={40}
              priority
              className="rounded-full"
            />
          </div>
          <CardTitle className="text-2xl font-pixel text-primary">
            {t("Auth.registerButton")}
          </CardTitle>
          <CardDescription>
            {t("Auth.registerSubtitle")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {t("Auth.name")}
              </label>
              <Input
                id="name"
                type="text"
                placeholder={t("Auth.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("Auth.email")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t("Auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("Auth.password")}
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                {t("Auth.confirmPassword")}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("Auth.creatingAccount") : t("Auth.registerButton")}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t("Auth.hasAccount")}{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                {t("Auth.loginLink")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      </motion.div>
    </div>
  );
}
