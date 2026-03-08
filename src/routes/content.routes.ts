import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// Auth guard
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

/**
 * GET /api/content/chapters
 * Fetch all chapters ordered by order ASC
 */
router.get("/chapters", requireAuth, async (req: Request, res: Response) => {
  try {
    const chapters = await prisma.chapter.findMany({
      select: {
        id: true,
        name: true,
        order: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chapters" });
  }
});

/**
 * GET /api/content/chapters/:chapterId/units
 * Fetch units of a specific chapter
 */
router.get("/chapters/:chapterId/units", requireAuth, async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;

    // Validate chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }

    // Fetch units
    const units = await prisma.unit.findMany({
      where: {
        chapterId: chapterId,
      },
      select: {
        id: true,
        name: true,
        order: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    res.json(units);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch units" });
  }
});

/**
 * GET /api/content/units/:unitId/questions
 * Fetch questions of a specific unit
 * SECURITY: correctOptionIndex is NOT included
 */
router.get("/units/:unitId/questions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { unitId } = req.params;

    // Validate unit exists
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      return res.status(404).json({ message: "Unit not found" });
    }

    // Fetch questions WITHOUT correctOptionIndex
    const questions = await prisma.question.findMany({
      where: {
        unitId: unitId,
      },
      select: {
        id: true,
        questionText: true,
        options: true,
        // correctOptionIndex is intentionally excluded for security
      },
    });

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

/**
 * GET /api/content/chapters-with-units
 * Fetch all chapters with their nested units in a single request
 */
router.get("/chapters-with-units", requireAuth, async (req: Request, res: Response) => {
  try {
    const chapters = await prisma.chapter.findMany({
      select: {
        id: true,
        name: true,
        order: true,
        units: {
          select: {
            id: true,
            name: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chapters with units" });
  }
});

/**
 * POST /api/content/questions
 * Fetch questions for multiple unit IDs (with correctOptionIndex for client-side evaluation)
 * Body: { unitIds: string[] }
 */
router.post("/questions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { unitIds } = req.body;

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return res.status(400).json({ message: "unitIds array is required" });
    }

    console.log(`DB Query: Fetching questions for unitIds: [${unitIds.join(", ")}]`);

    const questions = await prisma.question.findMany({
      where: {
        unitId: { in: unitIds },
      },
      select: {
        id: true,
        questionText: true,
        options: true,
        correctOptionIndex: true,
        unitId: true,
        unit: {
          select: {
            id: true,
            name: true,
            order: true,
            chapterId: true,
            chapter: {
              select: {
                id: true,
                name: true,
                order: true,
              },
            },
          },
        },
      },
    });

    console.log(`DB Query: Found ${questions.length} questions.`);
    const breakdown = questions.reduce((acc: any, q) => {
      acc[q.unitId] = (acc[q.unitId] || 0) + 1;
      return acc;
    }, {});
    console.log("Questions per unit:", breakdown);

    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch questions" });
  }
});

export default router;
