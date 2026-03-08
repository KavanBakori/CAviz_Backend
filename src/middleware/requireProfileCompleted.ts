import { Request, Response, NextFunction } from "express";

export const requireProfileCompleted = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as { profileCompleted?: boolean } | undefined;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!user.profileCompleted) {
    return res.status(403).json({
      message: "Complete profile before accessing quiz endpoints",
      code: "PROFILE_INCOMPLETE",
    });
  }

  return next();
};
