"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BookOpen, Home, Plus, Settings, CreditCard, Download, LogOut, User, LogIn, UserPlus } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { signOut, useSession } from "next-auth/react";

export function Header() {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [siteLogo, setSiteLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.siteLogo) setSiteLogo(data.siteLogo);
      })
      .catch(() => {});
  }, []);

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const navigation = [
    { name: t("Navigation.home"), href: "/", icon: Home },
    { name: t("Navigation.myProjects"), href: "/projects", icon: BookOpen },
    { name: t("Navigation.newProject"), href: "/projects/new", icon: Plus },
    { name: t("Navigation.downloads"), href: "/downloads", icon: Download },
    { name: t("Navigation.pricing"), href: "/pricing", icon: CreditCard },
    ...(isAdmin ? [{ name: t("Navigation.admin"), href: "/admin", icon: Settings }] : []),
  ];

  return (
    <header className="border-b border-dungeon-700 bg-dungeon-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            {siteLogo ? (
              <img src={siteLogo} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-dungeon-900" />
              </div>
            )}
            <span className="font-bold text-xl text-gold-400 hidden sm:block font-medieval">
              Secret Passage
            </span>
          </Link>

          <nav className="flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gold-500 text-dungeon-900"
                      : "text-dungeon-300 hover:bg-dungeon-700 hover:text-dungeon-100"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              );
            })}
            <div className="ml-2">
              <LanguageSelector />
            </div>
            {!session && status !== "loading" && (
              <>
                <Link
                  href="/auth/login"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ml-2",
                    pathname === "/auth/login"
                      ? "bg-gold-500 text-dungeon-900"
                      : "text-dungeon-300 hover:bg-dungeon-700 hover:text-dungeon-100"
                  )}
                  title={t("Auth.login")}
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline">{t("Auth.login")}</span>
                </Link>
                <Link
                  href="/auth/register"
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ml-1",
                    pathname === "/auth/register"
                      ? "bg-gold-500 text-dungeon-900"
                      : "bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 hover:text-gold-300"
                  )}
                  title={t("Auth.register")}
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden md:inline">{t("Auth.register")}</span>
                </Link>
              </>
            )}
            {session && (
              <Link
                href="/profile"
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ml-2",
                  pathname === "/profile"
                    ? "bg-gold-500 text-dungeon-900"
                    : "text-dungeon-300 hover:bg-dungeon-700 hover:text-dungeon-100"
                )}
                title="Mi perfil"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Perfil</span>
              </Link>
            )}
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-dungeon-300 hover:bg-dungeon-700 hover:text-dungeon-100 transition-colors ml-2"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Salir</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
