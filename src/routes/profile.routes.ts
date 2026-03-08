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
 * 🔹 TEST ROUTE
 * GET /api/profile/me
 * Used to verify:
 * - session cookie
 * - passport deserializeUser
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Authenticated user fetched successfully",
      user: dbUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/**
 * POST /api/profile/complete-profile
 */
router.post("/complete-profile", requireAuth, async (req, res) => {
  try {
    const user = req.user as any;

    let {
      wroNumber,
      examTarget,
      examGroup,
      attempt,
      mobile,
      dob,
      city,
      state,
      gender,
      username,
    } = req.body;

    // 🔐 BUSINESS RULE ENFORCEMENT
    if (examTarget === "FOUNDATION") {
      examGroup = null;
    }

    if (examTarget !== "FOUNDATION" && !examGroup) {
      return res.status(400).json({
        message: "Exam group is required for Inter and Final",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        wroNumber,
        examTarget,
        examGroup,
        attempt,
        mobile,
        dob: dob ? new Date(dob) : null,
        city,
        state,
        gender,
        username,
        profileCompleted: true,
      },
    });

    res.json({
      message: "Profile completed successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
});

/**
 * PUT /api/profile/update
 * Update user profile details after initial signup
 */
router.put("/update", requireAuth, async (req, res) => {
  try {
    const user = req.user as any;

    let {
      wroNumber,
      examTarget,
      examGroup,
      attempt,
      mobile,
      dob,
      city,
      state,
      gender,
      username,
    } = req.body;

    // 🔐 BUSINESS RULE ENFORCEMENT
    if (examTarget !== undefined) {
      if (examTarget === "FOUNDATION") {
        examGroup = null;
      } else if (!examGroup) {
        return res.status(400).json({
          message: "Exam group is required for Inter and Final",
        });
      }
    }

    // Prepare update data (excluding id and email)
    const updateData: any = {};
    if (wroNumber !== undefined) updateData.wroNumber = wroNumber;
    if (examTarget !== undefined) updateData.examTarget = examTarget;
    if (examGroup !== undefined) updateData.examGroup = examGroup;
    if (attempt !== undefined) updateData.attempt = attempt;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (gender !== undefined) updateData.gender = gender;
    if (username !== undefined) updateData.username = username;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
});
export default router;
