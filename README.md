# Notification System Evaluation (Stage 1)

This project implements a notification system with a frontend inbox, priority ranking, and logging middleware.

## Project Structure

- `notification_app_fe/`: Next.js frontend application.
- `notification_app_be/`: Placeholder for backend services.
- `logging_middleware/`: Shared logging utility.
- `notification_system_design.md`: Design documentation for Stage 1.
- `images/`: Screenshots of the application.

## Key Features

- **Candidate Registration & Auth**: Automated pre-test flow to obtain access tokens.
- **Notification Inbox**: Paginated feed with type-based filtering.
- **Priority Inbox**: Custom ranking algorithm based on type weight and recency.
- **Logging Middleware**: Integrated tracking of system events and API interactions.

## Setup

1. Configure environment variables in `notification_app_fe/.env.local`.
2. Run `npm run pretest:auth` in `notification_app_fe/` to authenticate.
3. Start the app with `npm run dev`.
