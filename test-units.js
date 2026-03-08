const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const chapters = await prisma.chapter.findMany({
      include: {
        units: {
          include: {
            _count: {
              select: { questions: true }
            }
          }
        }
      }
    });

    for (const ch of chapters) {
      console.log(`\nChapter ${ch.order}: ${ch.name}`);
      if (ch.units.length === 0) {
        console.log(`  - NO UNITS`);
      }
      for (const u of ch.units) {
        console.log(`  - Unit ${u.order}: ${u.name} (${u._count.questions} questions) [ID: ${u.id}]`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
