# 💻 Notification App Frontend

This is the heartbeat of our notification system! Built with **Next.js 15**, **TypeScript**, and **Material UI (MUI)**, it provides a clean and responsive interface for candidates to manage their alerts.

## 🚀 Getting Started

First, make sure you've set up your `.env.local` with the `NEXT_PUBLIC_EVALUATION_API_BASE`.

Then, kick off the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and you're good to go!

## 🧪 Pre-test Flow

Before you dive into the UI, you'll need to authenticate. We've simplified this with a dedicated script:

```bash
npm run pretest:auth
```

This script will:
1. Register your candidate profile (if it's your first time).
2. Authenticate and grab a fresh bearer token.
3. Save everything locally so the app is ready to use immediately.

## 🏗 Key Components

- **Main Inbox**: Your daily feed of notifications with handy filters.
- **Priority Inbox**: A dedicated space for the most critical updates, ranked by our custom algorithm.
- **Setup Panel**: Quickly re-authenticate or clear your local session data.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **UI Library**: [Material UI](https://mui.com)
- **Styling**: [Emotion](https://emotion.sh)
- **Data Fetching**: Native Fetch API with custom logging middleware

Happy coding! ✨
