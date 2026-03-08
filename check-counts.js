const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const units = await prisma.unit.findMany({
    include: { chapter: true, _count: { select: { questions: true } } }
  });
  units.forEach(u => {
    console.log(`Ch ${u.chapter.order} - Unit ${u.name}: ${u._count.questions} q`);
  });
}
main().finally(() => prisma.$disconnect());
