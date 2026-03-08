# API Testing Guide - CA Project Backend

## Scope
This guide is updated for the current backend behavior:
- Base URL is `http://localhost:4000`
- Session-cookie auth (Google OAuth + Passport)
- Credentialed CORS required for frontend integration
- Quiz APIs are gated by `profileCompleted` at API level

## Prerequisites
1. Start backend:
```bash
npm run dev
```
2. Ensure database is connected and seeded with chapters/units/questions.
3. Keep a browser available for Google OAuth login.
4. Optional tools:
- VS Code REST Client (`humao.rest-client`)
- Postman (`postman-collection.json`)
- Node script (`test-apis.js`)

## Environment Requirements
Set backend env values correctly:
```env
PORT=4000
FRONTEND_URL="http://localhost:5173"
# Optional multi-origin setup
# CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Rate limiting (optional override)
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_AUTH_MAX=20
# RATE_LIMIT_PROFILE_MAX=100
# RATE_LIMIT_QUIZ_MAX=120
```

## Authentication Setup
1. Open login URL in browser:
- `http://localhost:4000/auth/google`
2. Complete Google login.
3. Copy `connect.sid` cookie from browser DevTools.
4. Use cookie in API requests:
```http
Cookie: connect.sid=s%3A...
```

## Frontend Integration Requirements
For React/SPA testing from browser:
1. Use `withCredentials: true` in axios/fetch.
2. Ensure frontend origin matches backend CORS allow-list.
3. Never call `/auth/google` via XHR; use browser redirect.

Axios example:
```ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:4000/api",
  withCredentials: true,
});
```

## Endpoint Map

### Health
- `GET /health`
- `GET /health2`

### Authentication
- `GET /auth/google`
- `GET /auth/google/callback`
- `GET /auth/logout` (requires authenticated session)

### Profile
- `GET /api/profile/me`
- `POST /api/profile/complete-profile`
- `PUT /api/profile/update`

### Content
- `GET /api/content/chapters`
- `GET /api/content/chapters/:chapterId/units`
- `GET /api/content/units/:unitId/questions`

### Quiz (Profile Completed Required)
- `POST /api/quiz/start`
- `GET /api/quiz/history?page=1&limit=10`
- `GET /api/quiz/:sessionId/question/:index`
- `POST /api/quiz/:sessionId/answer`
- `GET /api/quiz/:sessionId/status`
- `POST /api/quiz/:sessionId/submit`

## Rate Limiting Behavior
The backend applies route-level request throttling using `express-rate-limit`.

- `/auth/*` default: `20` requests per IP per `15` minutes
- `/api/profile/*` default: `100` requests per IP per `15` minutes
- `/api/quiz/*` default: `120` requests per IP per `15` minutes

When a limit is exceeded, API returns `429` and `code: RATE_LIMIT_EXCEEDED`.

## Required Backend Gate Behavior
Quiz endpoints now enforce profile completion at API layer:
- `401` when session is missing/invalid.
- `403` with code `PROFILE_INCOMPLETE` when authenticated user has not completed profile.

Expected 403 response:
```json
{
  "message": "Complete profile before accessing quiz endpoints",
  "code": "PROFILE_INCOMPLETE"
}
```

## Primary Testing Workflow

### 1. Health checks
- `GET /health` -> 200
- `GET /health2` -> 200

### 2. Auth verification
- `GET /api/profile/me` with cookie -> 200 + user object
- `GET /api/profile/me` without cookie -> 401

### 3. Profile flow
- If `profileCompleted=false`, run `POST /api/profile/complete-profile`
- Verify business rules:
- FOUNDATION: `examGroup` not required
- INTER/FINAL: `examGroup` required

### 4. Content flow
- `GET /api/content/chapters`
- `GET /api/content/chapters/{chapterId}/units`
- `GET /api/content/units/{unitId}/questions`
- Verify `correctOptionIndex` is not exposed in questions list

### 5. Quiz flow
- `POST /api/quiz/start` using `unitIds` (array)
- `GET /api/quiz/{sessionId}/question/0`
- `POST /api/quiz/{sessionId}/answer`
- `GET /api/quiz/{sessionId}/status`
- `POST /api/quiz/{sessionId}/submit`
- `GET /api/quiz/history?page=1&limit=10`

## Quiz Request Samples

### Start quiz - BASED_ON_QUESTIONS
```json
{
  "unitIds": ["unit-id-1", "unit-id-2"],
  "mode": "BASED_ON_QUESTIONS",
  "questionCount": 20
}
```

### Start quiz - AGAINST_TIME
```json
{
  "unitIds": ["unit-id-1"],
  "mode": "AGAINST_TIME",
  "questionCount": 15,
  "duration": 120
}
```

### Start quiz - CAN_YOU_SURVIVE
```json
{
  "unitIds": ["unit-id-1"],
  "mode": "CAN_YOU_SURVIVE",
  "questionCount": 10,
  "difficulty": "MEDIUM"
}
```

### Save answer
```json
{
  "questionId": "question-id",
  "selectedOptionIndex": 2
}
```

## Validation Test Cases

### Profile validation
- INTER/FINAL without `examGroup` -> 400
- FOUNDATION without `examGroup` -> success

### Quiz mode validation
- AGAINST_TIME without `duration` -> 400
- CAN_YOU_SURVIVE with invalid difficulty -> 400

### Security and ownership
- Accessing other user's quiz session -> 403
- Answering after submission -> 400
- Unauthenticated quiz access -> 401

### Profile gate validation
- Auth user with `profileCompleted=false` calling quiz endpoint -> 403 `PROFILE_INCOMPLETE`
- Same user can still call profile endpoints to complete profile

### Rate limit validation
- Burst-hit `/auth/google` repeatedly -> expect `429` after threshold
- Burst-hit `/api/quiz/status` or `/api/quiz/start` repeatedly -> expect `429` after threshold

## Known Current Behavior
- API currently accepts out-of-range `selectedOptionIndex` values (for example `10`) and does not strictly reject with 400.
- Treat this as a known limitation unless backend validation is tightened.

## Error Matrix
- `401 Unauthorized`: missing/expired cookie
- `403 Forbidden`: ownership violations or `PROFILE_INCOMPLETE`
- `404 Not Found`: invalid IDs/resources
- `400 Bad Request`: payload/validation failures
- `429 Too Many Requests`: route limiter threshold exceeded
- `500 Internal Server Error`: unexpected backend/database error

## Terminal Testing Commands

### Automated full-suite
```bash
node test-apis.js "connect.sid=YOUR_COOKIE"
```

### Quick auth check
```bash
curl -X GET "http://localhost:4000/api/profile/me" \
  -H "Cookie: connect.sid=YOUR_COOKIE"
```

### Quick quiz gate check
```bash
curl -X POST "http://localhost:4000/api/quiz/start" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_COOKIE" \
  -d '{"unitIds":["unit-id-1"],"mode":"BASED_ON_QUESTIONS","questionCount":5}'
```

## Recommended Testing Order
1. Health
2. Auth (`/api/profile/me`)
3. Profile completion/update
4. Content endpoints
5. Quiz start/question/answer/status/submit/history
6. Error and security scenarios

## Related Files
- `api-tests.http`
- `test-apis.js`
- `postman-collection.json`
- `API_QUICK_REFERENCE.md`
