"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Home, Plus, Settings, CreditCard, Download } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();

  const navigation = [
    { name: t("home"), href: "/", icon: Home },
    { name: t("myProjects"), href: "/projects", icon: BookOpen },
    { name: t("newProject"), href: "/projects/new", icon: Plus },
    { name: t("downloads"), href: "/downloads", icon: Download },
    { name: t("pricing"), href: "/pricing", icon: CreditCard },
    { name: t("admin"), href: "/admin", icon: Settings },
  ];

  return (
    <header className="border-b border-dungeon-700 bg-dungeon-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-dungeon-900" />
            </div>
            <span className="font-bold text-xl text-gold-400 hidden sm:block font-medieval">
              Secret Passage
            </span>
          </Link>

          <nav className="flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
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
          </nav>
        </div>
      </div>
    </header>
  );
}
