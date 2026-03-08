const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// To use this script, first install xlsx: npm install xlsx
let XLSX;
try {
  XLSX = require('xlsx');
} catch (error) {
  console.error('❌ xlsx library not found. Install it with: npm install xlsx');
  process.exit(1);
}

const prisma = new PrismaClient();

async function importFromExcel(filePath, chapterName) {
  try {
    console.log(`\n📥 Importing from: ${filePath}`);
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      console.log('⚠️  No data found in Excel file');
      return;
    }

    console.log(`✅ Found ${data.length} questions in the Excel file`);

    // Check if chapter exists, if not create it
    let chapter = await prisma.chapter.findFirst({
      where: { name: chapterName }
    });

    if (!chapter) {
      const chapterNumber = parseInt(chapterName.split(' ')[1]) || 2;
      chapter = await prisma.chapter.create({
        data: {
          name: chapterName,
          order: chapterNumber
        }
      });
      console.log(`✅ Created chapter: ${chapterName}`);
    } else {
      console.log(`✅ Using existing chapter: ${chapterName}`);
    }

    // Group questions by unit
    const unitMap = new Map();
    data.forEach((row) => {
      const unitName = row['Unit Name'] || row['Unit'] || row['unit'] || 'Default Unit';
      if (!unitMap.has(unitName)) {
        unitMap.set(unitName, []);
      }
      unitMap.get(unitName).push(row);
    });

    console.log(`📚 Found ${unitMap.size} unit(s): ${Array.from(unitMap.keys()).join(', ')}`);

    // Process each unit
    let totalQuestionsImported = 0;
    let unitOrder = 1;

    for (const [unitName, questions] of unitMap.entries()) {
      // Check if unit exists
      let unit = await prisma.unit.findFirst({
        where: {
          name: unitName,
          chapterId: chapter.id
        }
      });

      if (!unit) {
        unit = await prisma.unit.create({
          data: {
            name: unitName,
            order: unitOrder++,
            chapterId: chapter.id
          }
        });
        console.log(`  ✅ Created unit: ${unitName}`);
      } else {
        console.log(`  ✅ Using existing unit: ${unitName}`);
      }

      // Import questions for this unit
      for (const qData of questions) {
        // Parse question text and options
        const questionText = qData['Question'] || qData['Question Text'] || qData['question'] || '';
        
        // Get options - look for common column names
        const option1 = qData['Option 1'] || qData['A'] || qData['option1'] || '';
        const option2 = qData['Option 2'] || qData['B'] || qData['option2'] || '';
        const option3 = qData['Option 3'] || qData['C'] || qData['option3'] || '';
        const option4 = qData['Option 4'] || qData['D'] || qData['option4'] || '';

        if (!questionText || (!option1 && !option2 && !option3 && !option4)) {
          console.log(`    ⚠️  Skipped invalid question: ${questionText.substring(0, 40)}...`);
          continue;
        }

        // Get correct option
        let correctOptionIndex = 0;
        const correctOption = (qData['Correct Option'] || qData['Correct'] || qData['Answer'] || '1').toString().toUpperCase().trim();
        
        if (correctOption === '2' || correctOption === 'B') correctOptionIndex = 1;
        else if (correctOption === '3' || correctOption === 'C') correctOptionIndex = 2;
        else if (correctOption === '4' || correctOption === 'D') correctOptionIndex = 3;
        else if (correctOption === '1' || correctOption === 'A') correctOptionIndex = 0;

        // Check if question already exists
        const existingQuestion = await prisma.question.findFirst({
          where: {
            questionText: questionText,
            unitId: unit.id
          }
        });

        if (!existingQuestion) {
          await prisma.question.create({
            data: {
              questionText: questionText,
              options: [option1, option2, option3, option4].filter(o => o),
              correctOptionIndex: correctOptionIndex,
              unitId: unit.id
            }
          });
          totalQuestionsImported++;
        }
      }

      console.log(`    📝 Imported ${questions.length} question(s) for ${unitName}`);
    }

    console.log(`\n✅ Successfully imported ${totalQuestionsImported} new questions for ${chapterName}!`);
    return totalQuestionsImported;

  } catch (error) {
    console.error(`❌ Error importing from ${filePath}:`, error.message);
    throw error;
  }
}

async function importAllChapters() {
  try {
    console.log('\n======== STARTING EXCEL IMPORT ========\n');

    const baseDir = path.dirname(__filename);
    const filesImported = [];
    let totalImported = 0;

    // Look for CH 2.xlsx, CH 3.xlsx, etc.
    for (let chapter = 2; chapter <= 10; chapter++) {
      const fileName = `CH ${chapter}.xlsx`;
      const filePath = path.join(baseDir, fileName);

      if (fs.existsSync(filePath)) {
        const count = await importFromExcel(filePath, `Chapter ${chapter}`);
        if (count) {
          filesImported.push(fileName);
          totalImported += count;
        }
      } else {
        console.log(`⚠️  File not found: ${fileName}`);
      }
    }

    console.log('\n======== IMPORT COMPLETE ========');
    console.log(`✅ Total questions imported: ${totalImported}`);
    if (filesImported.length > 0) {
      console.log(`📁 Files processed: ${filesImported.join(', ')}`);
    }

  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importAllChapters();
