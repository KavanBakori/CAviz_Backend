const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingData() {
  try {
    console.log('\n======== CHECKING EXISTING DATA ========\n');

    // Check Chapters
    const chapters = await prisma.chapter.findMany({
      include: {
        units: true
      }
    });
    console.log(`\n📚 CHAPTERS (Total: ${chapters.length})`);
    console.log('-------------------------------------------');
    if (chapters.length === 0) {
      console.log('❌ No chapters found');
    } else {
      chapters.forEach(ch => {
        console.log(`  • ${ch.name} (Order: ${ch.order}, ID: ${ch.id})`);
        console.log(`    └─ Units: ${ch.units.length}`);
      });
    }

    // Check Units
    const units = await prisma.unit.findMany({
      include: {
        chapter: true,
        questions: true
      }
    });
    console.log(`\n📖 UNITS (Total: ${units.length})`);
    console.log('-------------------------------------------');
    if (units.length === 0) {
      console.log('❌ No units found');
    } else {
      units.forEach(unit => {
        console.log(`  • ${unit.name} (Order: ${unit.order})`);
        console.log(`    └─ Chapter: ${unit.chapter.name}`);
        console.log(`    └─ Questions: ${unit.questions.length}`);
      });
    }

    // Check Questions
    const questions = await prisma.question.findMany({
      include: {
        unit: {
          include: {
            chapter: true
          }
        }
      }
    });
    console.log(`\n❓ QUESTIONS (Total: ${questions.length})`);
    console.log('-------------------------------------------');
    if (questions.length === 0) {
      console.log('❌ No questions found');
    } else {
      // Show first 5 questions as sample
      questions.slice(0, 5).forEach((q, idx) => {
        console.log(`  ${idx + 1}. ${q.questionText.substring(0, 60)}...`);
        console.log(`     └─ Chapter: ${q.unit.chapter.name} → Unit: ${q.unit.name}`);
        console.log(`     └─ Options: ${q.options.length}, Correct: Option ${q.correctOptionIndex + 1}`);
      });
      if (questions.length > 5) {
        console.log(`  ... and ${questions.length - 5} more questions`);
      }
    }

    // Summary
    console.log('\n======== SUMMARY ========');
    console.log(`Total Chapters: ${chapters.length}`);
    console.log(`Total Units: ${units.length}`);
    console.log(`Total Questions: ${questions.length}`);

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingData();
