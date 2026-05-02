# Notification System Design (Stage 1)

## Scope

Stage 1 delivers a working notification inbox flow with:

1. Pre-test setup (register, auth, token handling, logging).
2. Standard notification feed with filters, pagination, and viewed state.
3. Priority inbox that selects top 10 notifications using weight + recency ranking.

## End-to-End Flow

## 1) Pre-test setup

Frontend setup page collects:

- email
- name
- mobileNo
- githubUsername
- rollNo
- accessCode
- clientID
- clientSecret

Execution path:

1. First run: `/register` is called to receive `clientID` and `clientSecret`.
2. Next runs: stored credentials are reused and registration is skipped.
3. `/auth` is called with credentials and setup identity data.
4. Bearer token is stored in session storage.
5. Middleware logging records success/failure for register/auth/api actions.

## 2) Notification feed

Feed API:

- `GET /notifications?limit=...&page=...&notification_type=...`

Capabilities:

- filter by type (`all`, `Placement`, `Result`, `Event`)
- pagination (`page`, `limit`)
- unread/viewed badges
- viewed IDs persisted in local storage
- viewed action logging on click/open

## 3) Priority inbox (Top 10)

Priority inbox fetches candidate notifications and ranks them by:

- type weight
- recency score

Type weights:

- Placement: `1.00`
- Result: `0.75`
- Event: `0.50`
- fallback: `0.25`

Recency score:

- `1 / (1 + ageHours / 12)`

Final score:

- `(typeWeight * 0.7) + (recencyScore * 0.3)`

Ranking behavior:

1. Sort descending by final score.
2. Tie-break by newest timestamp first.
3. Return top 10.

This gives a stable, human-friendly ranking while preserving the required business preference:

- Placement > Result > Event

and still rewarding recent alerts.

## Storage Model

Session storage:

- `evaluationBearerToken`
- `evaluationClientCredentials`
- `evaluationFailedLogs`

Local storage:

- `viewedNotificationIds`

## Logging Middleware Use

Logged events include:

- register success/failure
- auth success/failure
- notifications fetch success/failure
- filter changes
- notification open/view actions
- runtime storage clear action

## Output Artifacts for Stage 1

- Working frontend flow in `notification_app_fe`
- Priority inbox page in `notification_app_fe/app/priority/page.tsx`
- Screenshot artifacts in `images/`
- This design document in `notification_system_design.md`
