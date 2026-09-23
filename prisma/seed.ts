import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const plans = [
    {
      name: "free",
      displayName: "Gratis",
      description: "Para empezar a crear",
      price: 0,
      currency: "EUR",
      interval: "month",
      features: [
        "3 proyectos",
        "500 pasajes por proyecto",
        "Exportar TXT",
        "Detección de enlaces básica",
      ],
      maxProjects: 3,
      maxPassages: 500,
      isActive: true,
    },
    {
      name: "pro",
      displayName: "Pro",
      description: "Para autores serios",
      price: 9.99,
      currency: "EUR",
      interval: "month",
      features: [
        "Proyectos ilimitados",
        "Pasajes ilimitados",
        "Exportar PDF, EPUB, ODT, DOC, DOCX",
        "Auto-fix avanzado",
        "Agentes de IA",
        "Barajar contenido",
        "Soporte prioritario",
      ],
      maxProjects: null,
      maxPassages: null,
      isActive: true,
    },
    {
      name: "lifetime",
      displayName: "De por vida",
      description: "Pago único, acceso para siempre",
      price: 49,
      currency: "EUR",
      interval: "one-time",
      features: [
        "Todo lo de Pro",
        "Acceso de por vida",
        "Actualizaciones incluidas",
        "Acceso anticipado a funciones",
      ],
      maxProjects: null,
      maxPassages: null,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await db.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Plan "${plan.name}" created/updated`);
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
