import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../lib/prisma";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0].value!;
        const firstName = profile.name?.givenName || "";
        const lastName = profile.name?.familyName || "";
        const profileImage = profile.photos?.[0].value;

        // 1. Check if user already exists
        let user = await prisma.user.findUnique({
          where: { googleId },
        });

        // 2. If not exists, create new user
        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId,
              email,
              firstName,
              lastName,
              username: email.split('@')[0], // Default from email
              profileImage,
              profileCompleted: false,
            },
          });
        }

        // 3. Pass user to session
        return done(null, user);
      } catch (error) {
        return done(error as any, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});


export default passport;
