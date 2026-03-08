import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";

const router = Router();

const frontendBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
const authSuccessRedirect = process.env.AUTH_SUCCESS_REDIRECT || frontendBaseUrl;
const authProfileIncompleteRedirect =
  process.env.AUTH_PROFILE_INCOMPLETE_REDIRECT || `${frontendBaseUrl}/complete-profile`;
const authFailureRedirect =
  process.env.AUTH_FAILURE_REDIRECT || `${frontendBaseUrl}/login?error=oauth_failed`;

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// Step 1: redirect to Google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Step 2: Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }), // authFailureRedirect
  (req, res) => {
    const user = req.user as any;

    if (!user.profileCompleted) {
      return res.redirect("http://localhost:5173/SignupPage");; // authProfileIncompleteRedirect
    }

    return res.redirect("http://localhost:5173/home"); authSuccessRedirect
  }
);

//Step 3: logout
router.get("/logout", requireAuth, (req: Request, res: Response) => {
  req.logout (err => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
});

export default router;
