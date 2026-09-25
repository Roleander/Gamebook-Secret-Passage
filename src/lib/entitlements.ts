import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export type Entitlements = {
  userId: string;
  isAdmin: boolean;
  plan: "free" | "pro" | "lifetime";
  planDisplayName: string;
  isPro: boolean;
  maxProjects: number | null;
  maxPassages: number | null;
  features: {
    exportTxt: true;
    exportAdvanced: boolean;
    autofix: boolean;
    analyze: boolean;
    shuffle: boolean;
  };
};

const ENTITLED_STATUSES = ["active", "trialing", "past_due"];

export async function getEntitlements(
  userId: string,
  role?: string | null
): Promise<Entitlements> {
  const isAdmin = role === "ADMIN";

  if (isAdmin) {
    return build(userId, true, "pro", "Admin", true);
  }

  const sub = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ENTITLED_STATUSES },
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });

  if (!sub) {
    return build(userId, false, "free", "Gratis");
  }

  const planName = sub.plan.name === "lifetime" ? "lifetime" : sub.plan.name === "pro" ? "pro" : "free";
  const isPro = planName === "pro" || planName === "lifetime";
  return build(userId, isPro, planName, sub.plan.displayName);
}

function build(
  userId: string,
  isPro: boolean,
  plan: Entitlements["plan"],
  planDisplayName: string,
  isAdmin = false
): Entitlements {
  return {
    userId,
    isAdmin,
    plan,
    planDisplayName,
    isPro,
    maxProjects: isPro ? null : 3,
    maxPassages: isPro ? null : 500,
    features: {
      exportTxt: true,
      exportAdvanced: isPro,
      autofix: isPro,
      analyze: isPro,
      shuffle: isPro,
    },
  };
}

export function upgradeRequired(feature: string, message?: string) {
  return NextResponse.json(
    {
      error: message || "Esta función requiere un plan Pro",
      code: "UPGRADE_REQUIRED",
      feature,
    },
    { status: 402 }
  );
}

export function limitReached(message: string) {
  return NextResponse.json(
    { error: message, code: "LIMIT_REACHED" },
    { status: 402 }
  );
}
