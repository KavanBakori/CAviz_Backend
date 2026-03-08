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
      },
      orderBy: { order: 'asc' }
    });

    console.log("DATABASE CONTENT SUMMARY:");
    console.log("=========================");
    for (const ch of chapters) {
      const totalQuestions = ch.units.reduce((acc, u) => acc + u._count.questions, 0);
      console.log(`Chapter ${ch.order}: ${ch.name} (Total Questions: ${totalQuestions})`);
      for (const u of ch.units) {
        console.log(`  - Unit ${u.order}: ${u.name} (ID: ${u.id}) -> ${u._count.questions} questions`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
