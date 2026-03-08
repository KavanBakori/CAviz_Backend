# 🚀 Local Setup Guide - CA Project Backend

Complete guide for setting up the CA Project Backend on your local machine for the first time.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software:

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **PostgreSQL** (v14 or higher)
   - Download: https://www.postgresql.org/download/
   - Verify: `psql --version`

4. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

### Optional (Recommended):

- **VS Code** - For development
- **Postman** - For API testing
- **pgAdmin** or **DBeaver** - For database management

---

## 📥 Step 1: Clone the Repository

```bash
# Navigate to your desired directory
cd /path/to/your/projects

# Clone the repository
git clone <your-repo-url>

# Navigate into project directory
cd BACKEND
```

---

## 🗄️ Step 2: Set Up PostgreSQL Database

### Option A: Using pgAdmin (GUI)

1. Open **pgAdmin**
2. Right-click **Databases** → **Create** → **Database**
3. Database name: `ca_quiz`
4. Owner: Your PostgreSQL user (default: `postgres`)
5. Click **Save**

### Option B: Using Command Line

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ca_quiz;

# Verify
\l

# Exit
\q
```

### Create PostgreSQL User (Optional)

If you want a dedicated user:

```sql
CREATE USER ca_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ca_quiz TO ca_admin;
```

---

## 🔧 Step 3: Configure Environment Variables

1. **Create `.env` file** in the project root (BACKEND folder):

```bash
# Copy the example file (if exists)
cp .env.example .env

# Or create new file
touch .env
```

2. **Add the following configuration** to `.env`:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ca_quiz?schema=public"

# Session Secret (generate a random string)
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:5173"

# Optional: multiple frontend origins (comma-separated)
# CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Rate limiting (optional override)
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_AUTH_MAX=20
# RATE_LIMIT_PROFILE_MAX=100
# RATE_LIMIT_QUIZ_MAX=120

# Prisma Configuration
# Use this to view Prisma Studio on a different port
# PRISMA_STUDIO_PORT=5555
```

### 🔑 Getting Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `http://localhost:4000/auth/google/callback`
7. Copy **Client ID** and **Client Secret** to `.env`

### 📝 Update DATABASE_URL:

Replace `your_password` with your PostgreSQL password:
- Default user: `postgres`
- Default password: The one you set during PostgreSQL installation
- Database name: `ca_quiz`
- Port: `5432` (default)

Example:
```
DATABASE_URL="postgresql://postgres:admin123@localhost:5432/ca_quiz?schema=public"
```

---

## 📦 Step 4: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - Express, TypeScript, Prisma
# - Passport (Google OAuth)
# - All other dependencies from package.json
```

**Expected output:**
```
added XXX packages in XXs
```

---

## 🗃️ Step 5: Set Up Database Schema

### Generate Prisma Client:

```bash
npx prisma generate
```

This creates the Prisma Client based on your `schema.prisma` file.

### Push Schema to Database:

```bash
npx prisma db push
```

This creates all tables in your PostgreSQL database:
- User
- Profile
- Chapter
- Unit
- Question
- QuizSession
- QuizSessionUnit
- UserAnswer

**Expected output:**
```
✔ Generated Prisma Client
The database is now in sync with your Prisma schema.
```

### Verify Database Setup:

```bash
# Open Prisma Studio (Database GUI)
npx prisma studio
```

This opens a browser window at `http://localhost:5555` where you can view your empty tables.

---

## 📊 Step 6: Import Sample Data (Optional but Recommended)

### Check if CSV files exist:

```bash
ls csv/
```

You should see:
- `chapters.csv`
- `units.csv`
- `questions.csv`

### If CSV files exist:

```bash
# Run the import script
node import-from-csv.js
```

### If CSV files don't exist:

You can either:
1. **Create sample data manually** using Prisma Studio
2. **Use the API** to create test data
3. **Wait** until you get the actual CSV data

**Minimum data needed to test:**
- At least 1 Chapter
- At least 1-2 Units
- At least 10-20 Questions per Unit

---

## 🏃 Step 7: Run the Application

### Start Development Server:

```bash
npm run dev
```

**Expected output:**
```
Server is running on http://localhost:4000
Connected to database successfully
```

### Alternative: Build and Run Production:

```bash
# Build TypeScript to JavaScript
npm run build

# Run production build
npm start
```

---

## ✅ Step 8: Verify Setup

### 1. Test Health Endpoint:

Open browser or use curl:
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T..."
}
```

### 2. Test Google OAuth:

1. Open browser: http://localhost:4000/auth/google
2. Login with your Google account
3. Should redirect and show success or profile page

### 3. Get Your Session Cookie:

After login:
1. Press **F12** (DevTools)
2. Go to **Application** → **Cookies**
3. Copy `connect.sid` value
4. Save this for API testing

### 4. Test Authenticated Endpoint:

```bash
# Replace YOUR_COOKIE with actual cookie value
curl http://localhost:4000/api/profile/me \
  -H "Cookie: connect.sid=YOUR_COOKIE"
```

Expected response:
```json
{
   "message": "Authenticated user fetched successfully",
   "user": {
      "id": "...",
      "email": "your@email.com",
      "profileCompleted": false
   }
}
```

If `profileCompleted` is `false`, quiz APIs are blocked until profile completion. Use:
- `POST /api/profile/complete-profile`
- then retry quiz endpoints.

Logout endpoint is also protected and requires an authenticated session:
```bash
curl http://localhost:4000/auth/logout \
   -H "Cookie: connect.sid=YOUR_COOKIE"
```

---

## 🧪 Step 9: Run Automated Tests

### Test with Node.js Script:

```bash
# Run all API tests
node test-apis.js "connect.sid=YOUR_COOKIE_VALUE"
```

**Expected output:**
```
=== CA PROJECT API TESTS ===
✓ Health Check 1 passed
✓ Health Check 2 passed
✓ Get current user passed
...
Total Tests: 23, Passed: 23, Failed: 0
✓ 🎉 All tests passed!
```

### Test with Postman:

1. Import `CA-Project-Postman-Collection.json`
2. Update `sessionCookie` variable
3. Run requests

See [POSTMAN_SETUP_GUIDE.md](POSTMAN_SETUP_GUIDE.md) for details.

### Test with REST Client (VS Code):

1. Install **REST Client** extension
2. Open `api-tests.http`
3. Update session cookie
4. Click **Send Request** above each request

---

## 📁 Project Structure Overview

```
BACKEND/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/             # Database migrations (if any)
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   ├── config/
│   │   ├── db.ts              # Database connection
│   │   └── passport.ts        # Google OAuth config
│   ├── lib/
│   │   └── prisma.ts          # Prisma Client instance
│   ├── middleware/            # Custom middleware
│   └── routes/
│       ├── auth.routes.ts     # Authentication routes
│       ├── profile.routes.ts  # Profile management
│       ├── content.routes.ts  # Chapters, Units, Questions
│       └── quiz.routes.ts     # Quiz modes (3 types)
├── csv/                       # CSV data files
├── .env                       # Environment variables (create this)
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── test-apis.js               # Automated tests
├── api-tests.http             # REST Client tests
└── CA-Project-Postman-Collection.json  # Postman collection
```

---

## 🎮 Understanding Quiz Modes

Your backend supports 3 quiz modes:

### 1. BASED_ON_QUESTIONS
- Default mode
- Multiple units support
- Navigation allowed (next/previous)
- No time limit
- Submit when done

### 2. AGAINST_TIME
- Timer-based quiz
- Specify duration (seconds)
- Auto-submits when time expires
- Real-time countdown

### 3. CAN_YOU_SURVIVE
- Lives-based system
- Difficulty levels: EASY (5 lives), MEDIUM (3 lives), HARD (1 life)
- Instant feedback after each answer
- Game over when lives = 0
- Streak tracking

See [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) for API details.

---

## 🔍 Common Commands Reference

```bash
# Development
npm run dev                    # Start dev server with hot reload
npm run build                  # Build TypeScript to JavaScript
npm start                      # Run production build

# Database
npx prisma generate            # Generate Prisma Client
npx prisma db push             # Push schema to database
npx prisma studio              # Open database GUI
npx prisma db seed             # Seed database (if configured)
npx prisma migrate dev         # Create migration
npx prisma migrate deploy      # Apply migrations (production)

# Testing
node test-apis.js "cookie"     # Run automated tests
npm test                       # Run test suite (if configured)

# Utilities
node import-from-csv.js        # Import CSV data
npm run lint                   # Run linter (if configured)
npm run format                 # Format code (if configured)
```

---

## 🐛 Troubleshooting

### Issue: `Cannot connect to database`

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Look for PostgreSQL service
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. Verify DATABASE_URL in `.env`
3. Test connection:
   ```bash
   psql -U postgres -d ca_quiz
   ```

4. Check PostgreSQL logs for errors

---

### Issue: `Module not found` errors

**Solutions:**
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   npm install
   ```

---

### Issue: `Prisma Client not generated`

**Solutions:**
```bash
# Generate Prisma Client
npx prisma generate

# If still fails, try:
rm -rf node_modules/.prisma
npx prisma generate
```

---

### Issue: Google OAuth not working

**Solutions:**
1. Verify credentials in `.env`
2. Check redirect URI in Google Console matches:
   ```
   http://localhost:4000/auth/google/callback
   ```
3. Ensure frontend URL is in Google Console's **Authorized JavaScript origins**
4. Clear browser cookies and try again

---

### Issue: Port 4000 already in use

**Solutions:**
1. Find and kill process:
   ```bash
   # Windows
   netstat -ano | findstr :4000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -i :4000
   kill -9 <PID>
   ```

2. Or change port in `.env`:
   ```env
   PORT=4001
   ```

---

### Issue: TypeScript errors

**Solutions:**
1. Check `tsconfig.json` exists
2. Verify TypeScript is installed:
   ```bash
   npm install -D typescript
   ```
3. Regenerate type definitions:
   ```bash
   npx prisma generate
   ```

---

### Issue: CORS errors from frontend

**Solutions:**
1. Update `FRONTEND_URL` in `.env`
2. If you have multiple frontend apps, set `CORS_ORIGINS` with comma-separated origins
3. Check CORS configuration in `src/app.ts`
4. Ensure credentials are included in fetch requests (`withCredentials: true` / `credentials: "include"`)

Example axios client:
```ts
const api = axios.create({
   baseURL: "http://localhost:4000/api",
   withCredentials: true,
});
```

---

### Issue: Session not persisting

**Solutions:**
1. Check `SESSION_SECRET` is set in `.env`
2. Clear browser cookies
3. Verify session middleware configuration
4. Check if using HTTPS (cookies might need secure flag)

---

### Issue: `429 Too Many Requests`

**Cause:** Rate limit exceeded on `/auth/*`, `/api/profile/*`, or `/api/quiz/*`.

**Solutions:**
1. Wait for the limiter window to reset (default 15 minutes)
2. Reduce request burst/polling frequency in frontend
3. Adjust rate limit env vars for local development if needed
4. Verify no script or bot is unintentionally spamming endpoints

---

## 🔒 Security Checklist

Before deploying or sharing:

- [ ] Change `SESSION_SECRET` to a strong random string
- [ ] Never commit `.env` file to Git
- [ ] Add `.env` to `.gitignore`
- [ ] Use environment-specific URLs (not localhost) in production
- [ ] Enable HTTPS in production
- [ ] Restrict CORS origins in production
- [ ] Configure production-ready rate limits for auth/profile/quiz routes
- [ ] Use strong database passwords
- [ ] Regularly update dependencies: `npm audit fix`

---

## 📚 Additional Resources

### Documentation Files:
- [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) - API endpoints reference
- [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) - Detailed testing guide
- [POSTMAN_SETUP_GUIDE.md](POSTMAN_SETUP_GUIDE.md) - Postman collection guide

### External Resources:
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/)
- [Passport.js Documentation](http://www.passportjs.org/)

---

## 🆘 Getting Help

If you encounter issues not covered here:

1. **Check server logs** - Look for error messages in terminal
2. **Check database** - Use Prisma Studio to verify data
3. **Check browser console** - For frontend/OAuth issues
4. **Review environment variables** - Ensure all are set correctly
5. **Search error messages** - Google the specific error
6. **Check dependencies** - Run `npm outdated` to see if updates are needed

---

## ✅ Setup Verification Checklist

Use this to verify your setup is complete:

### Environment:
- [ ] Node.js v18+ installed
- [ ] PostgreSQL running
- [ ] `.env` file created and configured
- [ ] All environment variables set

### Dependencies:
- [ ] `npm install` completed successfully
- [ ] No errors in `node_modules`

### Database:
- [ ] Database `ca_quiz` created
- [ ] `npx prisma generate` completed
- [ ] `npx prisma db push` completed
- [ ] Prisma Studio shows tables
- [ ] Sample data imported (optional)

### Server:
- [ ] `npm run dev` starts without errors
- [ ] Health endpoint responds
- [ ] Google OAuth redirects correctly
- [ ] Can login and get session cookie

### Testing:
- [ ] Can access authenticated endpoints
- [ ] Automated tests pass
- [ ] Postman collection works
- [ ] Can create and complete a quiz

---

## 🎉 You're All Set!

Your local setup is complete! You can now:

1. **Develop** - Make changes and test locally
2. **Test APIs** - Use Postman, REST Client, or automated tests
3. **Add Data** - Import more chapters/units/questions
4. **Integrate Frontend** - Connect your React/Next.js frontend
5. **Add Features** - Implement new quiz modes or features

**Next Steps:**
- Review the API documentation
- Test all 3 quiz modes
- Import complete question bank
- Start frontend integration

**Happy Coding! 🚀**

---

## 📝 Quick Start Summary

For experienced developers, here's the TL;DR:

```bash
# 1. Clone and install
git clone <repo>
cd BACKEND
npm install

# 2. Setup database
createdb ca_quiz
cp .env.example .env  # Then edit with your credentials

# 3. Setup Prisma
npx prisma generate
npx prisma db push

# 4. Import data (optional)
node import-from-csv.js

# 5. Run
npm run dev

# 6. Test
# Open http://localhost:4000/auth/google
# Copy session cookie
node test-apis.js "connect.sid=YOUR_COOKIE"
```

That's it! Server running on http://localhost:4000 🎉
