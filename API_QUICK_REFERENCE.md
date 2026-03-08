# API Quick Reference - React Frontend Integration

## Base URL
- Local backend: `http://localhost:4000`
- API base: `http://localhost:4000/api`

## Integration Checklist (Frontend)
1. Backend `.env` must include frontend origin:
```env
FRONTEND_URL="http://localhost:5173"
# Optional for multiple apps:
# CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Rate limiting (recommended production defaults)
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_AUTH_MAX=20
# RATE_LIMIT_PROFILE_MAX=100
# RATE_LIMIT_QUIZ_MAX=120
```
2. Frontend HTTP client must send credentials (cookies):
```ts
// axios example
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});
```
3. Start login using browser redirect, not XHR/fetch:
```ts
window.location.href = "http://localhost:4000/auth/google";
```
4. After login, call `GET /api/profile/me` to hydrate auth state.
5. If `profileCompleted === false`, route user to complete profile flow before quiz features.

## Auth And Session
- Session cookie name: `connect.sid`
- Auth mechanism: server session (Passport + Google OAuth)
- All endpoints except `/health` and `/health2` require authenticated session.

### Important Behavior
- Cookie-based auth requires `withCredentials: true` on frontend requests.
- CORS is configured with credentials support and explicit origin allow-list.
- Route groups are rate-limited using `express-rate-limit`.

## Rate Limiting
Applied per IP in a shared time window.

- `/auth/*` -> auth limiter (default `20` requests / `15 min`)
- `/api/profile/*` -> profile limiter (default `100` requests / `15 min`)
- `/api/quiz/*` -> quiz limiter (default `120` requests / `15 min`)

On limit exceeded, API returns `429` with payload:
```json
{
  "message": "Too many quiz requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## Profile Completion Gate (New)
Quiz endpoints are now guarded at API level.

- If user is not logged in: `401 { "message": "Unauthorized" }`
- If user is logged in but profile is incomplete: `403`
```json
{
  "message": "Complete profile before accessing quiz endpoints",
  "code": "PROFILE_INCOMPLETE"
}
```

This means frontend cannot access quiz APIs until profile completion is done via profile endpoints.

## Endpoints

### Health
- `GET /health`
- `GET /health2`

### Authentication
- `GET /auth/google` - Start Google OAuth flow in browser
- `GET /auth/google/callback` - Callback endpoint (handled by backend)
- `GET /auth/logout` - Logout and clear session (requires authenticated session)

### Profile
- `GET /api/profile/me` - Get current user
- `POST /api/profile/complete-profile` - Complete profile (sets `profileCompleted=true`)
- `PUT /api/profile/update` - Update profile fields

### Content
- `GET /api/content/chapters`
- `GET /api/content/chapters/:chapterId/units`
- `GET /api/content/units/:unitId/questions`

### Quiz (Requires profile completed)
- `POST /api/quiz/start`
- `GET /api/quiz/history?page=1&limit=10`
- `GET /api/quiz/:sessionId/question/:index`
- `POST /api/quiz/:sessionId/answer`
- `GET /api/quiz/:sessionId/status`
- `POST /api/quiz/:sessionId/submit`

## Request Examples

### Complete Profile (INTER or FINAL)
```json
{
  "wroNumber": "WRO123456",
  "examTarget": "INTER",
  "examGroup": "G1",
  "attempt": "JAN",
  "mobile": "9876543210",
  "dob": "2000-01-15",
  "city": "Mumbai",
  "state": "Maharashtra",
  "gender": "MALE"
}
```

### Complete Profile (FOUNDATION)
```json
{
  "wroNumber": "WRO123456",
  "examTarget": "FOUNDATION",
  "attempt": "MAY",
  "mobile": "9876543210",
  "dob": "2000-01-15",
  "city": "Mumbai",
  "state": "Maharashtra",
  "gender": "MALE"
}
```

### Start Quiz - BASED_ON_QUESTIONS
```json
{
  "unitIds": ["unit-id-1", "unit-id-2"],
  "mode": "BASED_ON_QUESTIONS",
  "questionCount": 20
}
```

### Start Quiz - AGAINST_TIME
```json
{
  "unitIds": ["unit-id-1"],
  "mode": "AGAINST_TIME",
  "questionCount": 15,
  "duration": 120
}
```

### Start Quiz - CAN_YOU_SURVIVE
```json
{
  "unitIds": ["unit-id-1"],
  "mode": "CAN_YOU_SURVIVE",
  "questionCount": 10,
  "difficulty": "MEDIUM"
}
```

### Save Answer
```json
{
  "questionId": "question-id",
  "selectedOptionIndex": 2
}
```

## Enums
- `examTarget`: `FOUNDATION`, `INTER`, `FINAL`
- `examGroup`: `G1`, `G2`, `BOTH`
- `attempt`: `JAN`, `MAY`, `SEP`
- `gender`: `MALE`, `FEMALE`, `OTHER`
- `mode`: `BASED_ON_QUESTIONS`, `AGAINST_TIME`, `CAN_YOU_SURVIVE`
- `difficulty`: `EASY`, `MEDIUM`, `HARD`

## Business Rules

### Profile
- FOUNDATION: `examGroup` is not required.
- INTER/FINAL: `examGroup` is required.

### Quiz
- `unitIds` is required and must be a non-empty array.
- AGAINST_TIME requires `duration`.
- CAN_YOU_SURVIVE accepts `difficulty` (`EASY`, `MEDIUM`, `HARD`).

## Typical Frontend Flow
1. User clicks Login -> redirect to `GET /auth/google`.
2. After callback/redirect, frontend calls `GET /api/profile/me`.
3. If unauthenticated -> show login.
4. If authenticated and `profileCompleted=false` -> show complete-profile form and call `POST /api/profile/complete-profile`.
5. After profile completion -> enable quiz pages and call quiz APIs.

## Common Errors

### 401 Unauthorized
- Cause: no cookie / expired cookie
- Action: login again

### 403 PROFILE_INCOMPLETE
- Cause: user profile not completed but quiz endpoint requested
- Action: complete profile first

### 400 Bad Request
- Cause: missing required fields, invalid mode/difficulty, invalid payload

### 404 Not Found
- Cause: invalid IDs (chapter, unit, session, question)

### 429 Too Many Requests
- Cause: per-IP rate limit exceeded on auth/profile/quiz route groups
- Action: retry after cooldown window or reduce polling/spam frequency

## cURL Quick Checks

### Auth check
```bash
curl -X GET "http://localhost:4000/api/profile/me" \
  -H "Cookie: connect.sid=YOUR_COOKIE"
```

### Quiz gate check (profile incomplete user)
```bash
curl -X POST "http://localhost:4000/api/quiz/start" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_COOKIE" \
  -d '{"unitIds":["unit-id-1"],"mode":"BASED_ON_QUESTIONS","questionCount":5}'
```

## Testing Options
- REST Client: `api-tests.http`
- Node script: `node test-apis.js "connect.sid=YOUR_COOKIE"`
- Postman: `postman-collection.json`
