# Excel Data Import Guide

## Step 1: Check Existing Data

Before importing, see what's already in your database:

```bash
node check-existing-data.js
```

This will show you:
- All chapters and their units
- All units and question counts
- Sample questions

## Step 2: Prepare Your Excel Files

Place your Excel files in the project root with naming pattern:
- `CH 2.xlsx`
- `CH 3.xlsx`
- `CH 4.xlsx`
- ... up to `CH 10.xlsx`

### Required Excel Column Names

Your Excel sheets should have these columns (columns can be in any order):

| Column Name | Description | Example |
|-----------|-----------|---------|
| Question | The question text | "What is the accounting equation?" |
| Option 1 | First option | "Assets = Liabilities + Equity" |
| Option 2 | Second option | "Assets = Equity - Liabilities" |
| Option 3 | Third option | "Liabilities = Assets + Equity" |
| Option 4 | Fourth option | "Equity = Assets - Liabilities" |
| Correct Option | Correct answer (1, 2, 3, or 4) | "1" |
| Unit Name | The unit this question belongs to | "Unit 1" |

**Alternative Column Names Supported:**
- Question: `Question Text` or `question`
- Options: `A`, `B`, `C`, `D` (for alternative naming)
- Correct Option: `Correct`, `Answer`
- Unit: `Unit`, `unit`

### Example Excel Format

```
| Question | Option 1 | Option 2 | Option 3 | Option 4 | Correct Option | Unit Name |
|----------|----------|----------|----------|----------|----------------|-----------|
| What is the accounting equation? | Assets = Liabilities + Equity | Assets = Equity - Liabilities | Liabilities = Assets + Equity | Equity = Assets - Liabilities | 1 | Unit 1 |
| Which principle requires expenses to be matched with revenues? | Matching Principle | Revenue Recognition | Consistency | Conservatism | 1 | Unit 1 |
```

## Step 3: Install Dependencies

Install the xlsx library to read Excel files:

```bash
npm install xlsx
```

## Step 4: Import the Data

Run the import script:

```bash
node import-from-excel.js
```

The script will:
1. ✅ Find all `CH X.xlsx` files (Chapter 2-10)
2. ✅ Extract questions and options
3. ✅ Create chapters and units if they don't exist
4. ✅ Insert questions into the database
5. ✅ Skip duplicate questions
6. ✅ Show a summary of what was imported

## Example Output

```
======== STARTING EXCEL IMPORT ========

📥 Importing from: CH 2.xlsx
✅ Found 45 questions in the Excel file
✅ Using existing chapter: Chapter 2
📚 Found 3 unit(s): Unit 1, Unit 2, Unit 3
  ✅ Using existing unit: Unit 1
    📝 Imported 15 question(s) for Unit 1
  ✅ Created unit: Unit 2
    📝 Imported 15 question(s) for Unit 2
  ✅ Created unit: Unit 3
    📝 Imported 15 question(s) for Unit 3

======== IMPORT COMPLETE ========
✅ Total questions imported: 45
📁 Files processed: CH 2.xlsx
```

## Step 5: Verify the Import

After importing, check how much data was added:

```bash
node check-existing-data.js
```

## Important Notes

1. **File Naming**: Files must be named exactly as `CH 2.xlsx`, `CH 3.xlsx`, etc. (using a space between CH and the number)

2. **Column Headers**: Column headers are case-insensitive and support alternatives - the script will find them automatically

3. **Duplicate Prevention**: The script checks for duplicate questions within a unit before inserting

4. **Chapter Auto-Creation**: If a chapter doesn't exist, it will be created automatically with the chapter number as the order

5. **Unit Organization**: Questions are automatically grouped by the `Unit Name` column and assigned to the correct chapter

6. **Data Validation**: Any rows with missing question text or options will be skipped with a warning

## Troubleshooting

### "xlsx library not found"
```bash
npm install xlsx
```

### File not found error
Make sure your Excel files are in the project root directory (same location as package.json)

### Data not importing
1. Check column names match the required format
2. Ensure Excel file is not corrupted
3. Check that "Correct Option" values are 1, 2, 3, or 4
4. Run `node check-existing-data.js` to see the current state

### Duplicate questions warning
The script automatically skips duplicate questions. To force re-import:
1. Delete existing data from the database
2. Run the import again
