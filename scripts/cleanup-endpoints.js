let db;

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  db = new PrismaClient();
  const apply = process.argv.includes("--apply");

  const marked = await db.passage.findMany({
    where: { isEndpoint: true },
    select: {
      id: true,
      number: true,
      projectId: true,
      project: {
        select: { title: true, user: { select: { email: true } } },
      },
      _count: { select: { outgoingLinks: true } },
    },
  });

  const toUnmark = marked.filter((p) => p._count.outgoingLinks > 0);
  const keep = marked.length - toUnmark.length;

  const byProject = {};
  for (const p of toUnmark) {
    const key = `${p.project.user.email} — ${p.project.title}`;
    byProject[key] = (byProject[key] || 0) + 1;
  }

  console.log(`Marcados [FIN]: ${marked.length}`);
  console.log(`  con enlaces de salida -> desmarcar: ${toUnmark.length}`);
  console.log(`  sin enlaces -> conservar: ${keep}`);
  console.log("Desmarcados por proyecto:");
  for (const [k, v] of Object.entries(byProject).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }

  if (!apply) {
    console.log("\nDRY-RUN (sin cambios). Ejecuta con --apply para desmarcar.");
    return;
  }

  const ids = toUnmark.map((p) => p.id);
  let updated = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const res = await db.passage.updateMany({
      where: { id: { in: ids.slice(i, i + 500) } },
      data: { isEndpoint: false },
    });
    updated += res.count;
  }
  const after = await db.passage.count({ where: { isEndpoint: true } });
  console.log(`\nDesmarcados: ${updated}. Marcados [FIN] restantes: ${after}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db && db.$disconnect());
