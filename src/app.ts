import express, { Request, Response } from "express";
import session from "express-session";
import cors, { CorsOptions } from "cors";
import passport from "./config/passport";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import contentRoutes from "./routes/content.routes";
import quizRoutes from "./routes/quiz.routes";
import { requireProfileCompleted } from "./middleware/requireProfileCompleted";
import {
  authRateLimiter,
  profileRateLimiter,
  quizRateLimiter,
} from "./middleware/rateLimit";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (Postman/curl) that do not send Origin.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// CORS must run before routes so credentialed cross-origin requests can succeed.
app.use(cors(corsOptions));

// Parse JSON
app.use(express.json());

// 🚨 REQUIRED for Railway / proxy / HTTPS
app.set("trust proxy", 1);

// ✅ Session configuration (works for both local and production)
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    name: "connect.sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,           // false for localhost, true for production
      sameSite: isProduction ? "none" : "lax",  // lax for localhost, none for production
      maxAge: 24 * 60 * 60 * 1000,    // 24 hours
    },
  })
);

// Passport middleware (ORDER MATTERS)
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRateLimiter, authRoutes);
app.use("/api/profile", profileRateLimiter, profileRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/quiz", quizRateLimiter, requireProfileCompleted, quizRoutes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health2", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok from health2" });
});

export default app;
