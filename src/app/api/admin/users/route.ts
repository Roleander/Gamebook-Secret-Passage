import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getStripe, cancelSubscriptionAtProvider } from "@/lib/billing";
import { del } from "@vercel/blob";
import { z } from "zod";
import { parseOr400 } from "@/lib/api-validate";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  const { role } = session.user as { id: string; role?: string };
  if (role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }),
    };
  }
  return { session };
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const take = 20;
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total, donationSums, activeSubs] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: { select: { projects: true, donations: true } },
        },
      }),
      db.user.count({ where }),
      db.donation.groupBy({
        by: ["userId"],
        _sum: { amount: true },
      }),
      db.subscription.findMany({
        where: { status: { in: ["active", "trialing"] } },
        select: { userId: true, plan: { select: { displayName: true } } },
      }),
    ]);

    const donationByUser = new Map(
      donationSums.map((d) => [d.userId, d._sum.amount || 0])
    );
    const planByUser = new Map(
      activeSubs.map((s) => [s.userId, s.plan.displayName])
    );

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        projectCount: u._count.projects,
        donationCount: u._count.donations,
        donationTotal: donationByUser.get(u.id) || 0,
        plan: planByUser.get(u.id) || "Gratis",
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / take)),
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

const roleSchema = z.object({
  userId: z.string().min(1).max(100),
  role: z.enum(["USER", "ADMIN"], { error: "Rol no válido" }),
});

export async function PATCH(req: Request) {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;

    const parsed = parseOr400(roleSchema, await req.json().catch(() => null));
    if (!parsed.ok) return parsed.response;
    const { userId, role } = parsed.data;

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (target.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "No se puede quitar el rol del único administrador" },
          { status: 400 }
        );
      }
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Error al actualizar el rol" },
      { status: 500 }
    );
  }
}

const deleteSchema = z.object({
  userId: z.string().min(1).max(100),
});

export async function DELETE(req: Request) {
  try {
    const guard = await requireAdmin();
    if (guard.error) return guard.error;
    const session = guard.session!;

    const parsed = parseOr400(deleteSchema, await req.json().catch(() => null));
    if (!parsed.ok) return parsed.response;
    const { userId } = parsed.data;

    const sessionId = (session.user as { id: string }).id;
    if (userId === sessionId) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (target.role === "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "No se puede eliminar el único administrador" },
          { status: 400 }
        );
      }
    }

    const activeSubscription = await db.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing"] } },
    });
    if (activeSubscription) {
      try {
        await cancelSubscriptionAtProvider(activeSubscription);
      } catch (subError) {
        console.error("Admin delete: subscription cancel error:", subError);
      }
    }

    if (target.stripeCustomerId) {
      try {
        await getStripe().customers.del(target.stripeCustomerId);
      } catch (stripeError) {
        console.error("Admin delete: Stripe customer delete error:", stripeError);
      }
    }

    if (target.avatar) {
      try {
        await del(target.avatar);
      } catch (blobError) {
        console.error("Admin delete: avatar delete error:", blobError);
      }
    }

    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 }
    );
  }
}
