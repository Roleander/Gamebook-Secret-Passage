"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setRegistered(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("Auth.invalidCredentials"));
      setLoading(false);
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/projects";
      router.push(callbackUrl.startsWith("/") ? callbackUrl : "/projects");
      router.refresh();
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
            Secret Passage
          </CardTitle>
          <CardDescription>
            {t("Auth.loginSubtitle")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {registered && !error && (
              <div className="p-3 text-sm text-green-500 bg-green-500/10 rounded-md border border-green-500/30">
                {t("Auth.registeredSuccess")}
              </div>
            )}
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
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
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary">
                {t("Auth.forgotPassword")}
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("Auth.loggingIn") : t("Auth.login")}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t("Auth.noAccount")}{" "}
              <Link
                href={
                  searchParams.get("callbackUrl")
                    ? `/auth/register?callbackUrl=${encodeURIComponent(searchParams.get("callbackUrl")!)}`
                    : "/auth/register"
                }
                className="text-primary hover:underline"
              >
                {t("Auth.signupLink")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dungeon" />}>
      <LoginForm />
    </Suspense>
  );
}
