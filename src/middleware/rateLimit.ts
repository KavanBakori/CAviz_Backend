import rateLimit from "express-rate-limit";

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);

const createLimiter = (maxRequests: number, scope: string) =>
  rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: `Too many ${scope} requests. Please try again later.`,
      code: "RATE_LIMIT_EXCEEDED",
    },
  });

export const authRateLimiter = createLimiter(
  parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  "authentication"
);

export const profileRateLimiter = createLimiter(
  parsePositiveInt(process.env.RATE_LIMIT_PROFILE_MAX, 100),
  "profile"
);

export const quizRateLimiter = createLimiter(
  parsePositiveInt(process.env.RATE_LIMIT_QUIZ_MAX, 120),
  "quiz"
);
