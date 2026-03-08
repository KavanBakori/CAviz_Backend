import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";
import { QuizMode, QuizStatus } from "@prisma/client";

const router = Router();

// Auth guard
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Helper: Get mode-specific config
const getModeConfig = (mode: string, body: any) => {
  switch (mode) {
    case "AGAINST_TIME":
      return {
        duration: body.duration || 120, // seconds
        timeLimit: body.timeLimit || "2m",
      };
    case "CAN_YOU_SURVIVE":
      return {
        difficulty: body.difficulty || "MEDIUM",
        maxLives: body.difficulty === "EASY" ? 5 : body.difficulty === "HARD" ? 1 : 3,
        instantFeedback: true,
      };
    case "BASED_ON_QUESTIONS":
    default:
      return {
        allowNavigation: true,
        showHints: body.showHints || false,
      };
  }
};

// Helper: Get initial mode state
const getInitialModeState = (mode: string, config: any) => {
  switch (mode) {
    case "AGAINST_TIME":
      return {
        startTime: new Date().toISOString(),
        timeRemaining: config.duration,
      };
    case "CAN_YOU_SURVIVE":
      return {
        livesRemaining: config.maxLives,
        currentStreak: 0,
        mistakes: [],
      };
    default:
      return {};
  }
};

/**
 * POST /api/quiz/start
 * Start a new quiz session - supports multiple modes
 * Body: { unitIds: string[], mode?: string, questionCount?: number, duration?: number, difficulty?: string }
 */
router.post("/start", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { unitIds, mode, questionCount, duration, difficulty } = req.body;

    // Validation
    if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
      return res.status(400).json({ error: "unitIds array is required" });
    }

    const validModes = ["BASED_ON_QUESTIONS", "AGAINST_TIME", "CAN_YOU_SURVIVE"];
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(", ")}` });
    }

    const selectedMode = (mode || "BASED_ON_QUESTIONS") as QuizMode;

    // Mode-specific validation
    if (selectedMode === "AGAINST_TIME" && !duration) {
      return res.status(400).json({ error: "duration is required for AGAINST_TIME mode" });
    }

    if (selectedMode === "CAN_YOU_SURVIVE") {
      const validDifficulties = ["EASY", "MEDIUM", "HARD"];
      if (difficulty && !validDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: `Invalid difficulty. Must be one of: ${validDifficulties.join(", ")}` });
      }
    }

    // Get config and initial state
    const modeConfig = getModeConfig(selectedMode, req.body);
    const modeState = getInitialModeState(selectedMode, modeConfig);

    // Verify units exist
    const units = await prisma.unit.findMany({
      where: { id: { in: unitIds } },
    });

    if (units.length !== unitIds.length) {
      return res.status(404).json({ error: "One or more units not found" });
    }

    // Get questions from selected units
    const allQuestions = await prisma.question.findMany({
      where: { unitId: { in: unitIds } },
      select: { id: true },
    });

    if (allQuestions.length === 0) {
      return res.status(400).json({ error: "No questions found in selected units" });
    }

    // Determine question count
    let finalQuestionCount = questionCount || allQuestions.length;
    if (finalQuestionCount > allQuestions.length) {
      finalQuestionCount = allQuestions.length;
    }

    // Shuffle and select questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, finalQuestionCount);

    // Create quiz session with JSON config
    const session = await prisma.quizSession.create({
      data: {
        userId: user.id,
        mode: selectedMode,
        totalQuestions: finalQuestionCount,
        modeConfig: modeConfig as any,
        modeState: modeState as any,
        startedAt: new Date(),
        units: {
          create: unitIds.map((unitId) => ({ unitId })),
        },
        questions: {
          create: selectedQuestions.map((q, index) => ({
            questionId: q.id,
            order: index,
          })),
        },
      },
      include: {
        units: { include: { unit: true } },
        questions: { include: { question: true } },
      },
    });

    res.json({
      sessionId: session.id,
      mode: session.mode,
      totalQuestions: session.totalQuestions,
      config: session.modeConfig,
      state: session.modeState,
      units: session.units.map((u) => ({ id: u.unit.id, name: u.unit.name })),
    });
  } catch (error) {
    console.error("Error starting quiz:", error);
    res.status(500).json({ error: "Failed to start quiz" });
  }
});

/**
 * GET /api/quiz/history
 * Get authenticated user's quiz history
 * Query: page?: number, limit?: number
 */
router.get("/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);

    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 10;

    const skip = (page - 1) * limit;

    const [totalSessions, sessions] = await Promise.all([
      prisma.quizSession.count({
        where: { userId: user.id },
      }),
      prisma.quizSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          units: {
            include: {
              unit: {
                select: {
                  id: true,
                  name: true,
                  chapterId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalSessions / limit);

    res.json({
      page,
      limit,
      totalSessions,
      totalPages,
      history: sessions.map((session) => ({
        sessionId: session.id,
        mode: session.mode,
        status: session.status,
        totalQuestions: session.totalQuestions,
        score: session.score,
        correctCount: session.correctCount,
        incorrectCount: session.incorrectCount,
        skippedCount: session.skippedCount,
        percentage: session.percentage,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        createdAt: session.createdAt,
        units: session.units.map((item) => ({
          id: item.unit.id,
          name: item.unit.name,
          chapterId: item.unit.chapterId,
        })),
      })),
    });
  } catch (error) {
    console.error("Error getting quiz history:", error);
    res.status(500).json({ error: "Failed to get quiz history" });
  }
});

/**
 * GET /api/quiz/:sessionId/question/:index
 * Get a specific question by index
 */
router.get("/:sessionId/question/:index", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { sessionId, index } = req.params;
    const questionIndex = parseInt(index);

    // Get session
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          where: { order: questionIndex },
          include: { question: true },
        },
        answers: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Quiz session not found" });
    }

    if (session.userId !== user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Quiz is not in progress" });
    }

    const sessionQuestion = session.questions[0];
    if (!sessionQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Check time limit for AGAINST_TIME mode
    let timeExpired = false;
    if (session.mode === "AGAINST_TIME") {
      const config = session.modeConfig as any;
      const elapsed = (Date.now() - new Date(session.startedAt!).getTime()) / 1000;
      if (elapsed >= config.duration) {
        timeExpired = true;
        // Auto-submit
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      }
    }

    if (timeExpired) {
      return res.status(400).json({ error: "Time expired", timeUp: true });
    }

    // Get existing answer
    const existingAnswer = session.answers.find((a) => a.questionId === sessionQuestion.questionId);

    // Build response based on mode
    const response: any = {
      sessionId: session.id,
      questionIndex,
      totalQuestions: session.totalQuestions,
      question: {
        id: sessionQuestion.question.id,
        text: sessionQuestion.question.questionText,
        options: sessionQuestion.question.options,
      },
      selectedAnswer: existingAnswer?.selectedOptionIndex ?? null,
      isAnswered: sessionQuestion.isAnswered,
    };

    // Add mode-specific data
    const modeState = session.modeState as any;
    if (session.mode === "AGAINST_TIME") {
      const config = session.modeConfig as any;
      const elapsed = (Date.now() - new Date(session.startedAt!).getTime()) / 1000;
      response.timeRemaining = Math.max(0, config.duration - elapsed);
      response.duration = config.duration;
    }

    if (session.mode === "CAN_YOU_SURVIVE") {
      response.livesRemaining = modeState?.livesRemaining;
      response.currentStreak = modeState?.currentStreak || 0;
      response.difficulty = (session.modeConfig as any)?.difficulty;
      // Show feedback for already answered questions
      if (sessionQuestion.isAnswered) {
        response.feedback = {
          isCorrect: sessionQuestion.wasCorrect,
          correctAnswer: sessionQuestion.question.correctOptionIndex,
        };
      }
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting question:", error);
    res.status(500).json({ error: "Failed to get question" });
  }
});

/**
 * POST /api/quiz/:sessionId/answer
 * Submit answer for current question
 */
router.post("/:sessionId/answer", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { sessionId } = req.params;
    const { questionId, selectedOptionIndex } = req.body;

    if (selectedOptionIndex === undefined || selectedOptionIndex === null) {
      return res.status(400).json({ error: "selectedOptionIndex is required" });
    }

    // Get session
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: { where: { questionId }, include: { question: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Quiz session not found" });
    }

    if (session.userId !== user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Quiz is not in progress" });
    }

    const sessionQuestion = session.questions[0];
    if (!sessionQuestion) {
      return res.status(404).json({ error: "Question not found in this session" });
    }

    const question = sessionQuestion.question;
    const isCorrect = selectedOptionIndex === question.correctOptionIndex;

    // Update or create answer
    await prisma.quizAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      create: {
        sessionId,
        questionId,
        selectedOptionIndex,
        isCorrect,
        answeredAt: new Date(),
      },
      update: {
        selectedOptionIndex,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    // Update session question
    await prisma.quizSessionQuestion.update({
      where: { id: sessionQuestion.id },
      data: {
        isAnswered: true,
        wasCorrect: isCorrect,
        answeredAt: new Date(),
      },
    });

    // Mode-specific logic
    const response: any = { success: true };

    if (session.mode === "CAN_YOU_SURVIVE") {
      const modeState = (session.modeState as any) || {};
      const config = session.modeConfig as any;

      if (!isCorrect) {
        // Lost a life
        modeState.livesRemaining = (modeState.livesRemaining || config.maxLives) - 1;
        modeState.currentStreak = 0;
        modeState.mistakes = [...(modeState.mistakes || []), questionId];

        // Check if game over
        if (modeState.livesRemaining <= 0) {
          await prisma.quizSession.update({
            where: { id: sessionId },
            data: {
              status: "FAILED",
              modeState: modeState as any,
              completedAt: new Date(),
            },
          });

          response.gameOver = true;
          response.status = "FAILED";
        } else {
          await prisma.quizSession.update({
            where: { id: sessionId },
            data: { modeState: modeState as any },
          });
        }
      } else {
        // Correct answer
        modeState.currentStreak = (modeState.currentStreak || 0) + 1;
        await prisma.quizSession.update({
          where: { id: sessionId },
          data: { modeState: modeState as any },
        });
      }

      // Send instant feedback
      response.feedback = {
        isCorrect,
        correctAnswer: question.correctOptionIndex,
        livesRemaining: modeState.livesRemaining,
        currentStreak: modeState.currentStreak,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

/**
 * POST /api/quiz/:sessionId/submit
 * Submit/finish the entire quiz
 */
router.post("/:sessionId/submit", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { sessionId } = req.params;

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: { include: { question: true } },
        answers: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Quiz session not found" });
    }

    if (session.userId !== user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (session.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Quiz is not in progress" });
    }

    // Calculate results
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;

    for (const sessionQuestion of session.questions) {
      const answer = session.answers.find((a) => a.questionId === sessionQuestion.questionId);

      if (!answer || answer.selectedOptionIndex === null) {
        skippedCount++;
      } else if (answer.isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }

    const totalQuestions = session.totalQuestions || session.questions.length;
    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
    const score = correctCount * 10; // 10 points per correct

    // Determine final status
    let finalStatus: QuizStatus = "COMPLETED";
    if (session.mode === "CAN_YOU_SURVIVE") {
      const modeState = session.modeState as any;
      if (modeState?.livesRemaining <= 0) {
        finalStatus = "FAILED";
      }
    }

    // Update session
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: {
        status: finalStatus,
        score,
        correctCount,
        incorrectCount,
        skippedCount,
        percentage,
        completedAt: new Date(),
      },
    });

    res.json({
      sessionId,
      status: finalStatus,
      score,
      correctCount,
      incorrectCount,
      skippedCount,
      totalQuestions,
      percentage: parseFloat(percentage.toFixed(2)),
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
});

/**
 * GET /api/quiz/:sessionId/status
 * Get current quiz status (for polling)
 */
router.get("/:sessionId/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { sessionId } = req.params;

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: true,
        answers: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Quiz session not found" });
    }

    if (session.userId !== user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const answeredCount = session.questions.filter((q) => q.isAnswered).length;

    const response: any = {
      sessionId: session.id,
      mode: session.mode,
      status: session.status,
      totalQuestions: session.totalQuestions,
      answeredCount,
    };

    // Mode-specific data
    if (session.mode === "AGAINST_TIME" && session.status === "IN_PROGRESS") {
      const config = session.modeConfig as any;
      const elapsed = (Date.now() - new Date(session.startedAt!).getTime()) / 1000;
      response.timeRemaining = Math.max(0, config.duration - elapsed);
      response.duration = config.duration;
    }

    if (session.mode === "CAN_YOU_SURVIVE") {
      const modeState = session.modeState as any;
      response.livesRemaining = modeState?.livesRemaining;
      response.currentStreak = modeState?.currentStreak || 0;
    }

    // If completed, include results
    if (session.status === "COMPLETED" || session.status === "FAILED") {
      response.results = {
        score: session.score,
        correctCount: session.correctCount,
        incorrectCount: session.incorrectCount,
        skippedCount: session.skippedCount,
        percentage: session.percentage,
      };
    }

    res.json(response);
  } catch (error) {
    console.error("Error getting quiz status:", error);
    res.status(500).json({ error: "Failed to get quiz status" });
  }
});

export default router;
