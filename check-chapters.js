const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const chapters = await prisma.chapter.findMany({ select: { id: true, name: true, order: true } });
  chapters.sort((a,b) => a.order - b.order).forEach(c => {
    console.log(`${c.order}: ${c.name} [ID: ${c.id}]`);
  });
}
main().finally(() => prisma.$disconnect());
