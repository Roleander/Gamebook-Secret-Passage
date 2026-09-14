"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Home, Plus, Settings, CreditCard } from "lucide-react";

const navigation = [
  { name: "Inicio", href: "/", icon: Home },
  { name: "Mis Proyectos", href: "/projects", icon: BookOpen },
  { name: "Nuevo Proyecto", href: "/projects/new", icon: Plus },
  { name: "Precios", href: "/pricing", icon: CreditCard },
  { name: "Admin", href: "/admin", icon: Settings },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-secondary/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-primary hidden sm:block">
              Secret Passage
            </span>
          </Link>

          <nav className="flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
