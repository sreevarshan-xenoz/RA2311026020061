# 🚀 Notification System Evaluation (Stage 1)

Welcome! This project is a streamlined notification hub designed to keep you updated with the latest campus events, results, and placement alerts. We've focused on building a snappy, reliable experience with a smart priority ranking system.

## 🛠 What's inside?

- **`notification_app_fe/`**: Our sleek Next.js frontend where all the action happens.
- **`logging_middleware/`**: A shared utility that keeps our system's vitals in check.
- **`images/`**: A visual tour of the app in action.
- **`notification_system_design.md`**: Our blueprint for how everything works under the hood.

## ✨ Cool Features

- **Smart Priority Inbox**: We don't just show you a list; we rank alerts so you see the most important things (like Placements and Results) first.
- **Automated Auth**: A handy pre-test script to get you authenticated in seconds.
- **Live Feed**: Filter and browse notifications with ease, all while keeping track of what you've already seen.
- **Reliable Logging**: Every important event is tracked, making debugging a breeze.

## 📸 App Tour

Explore the interface of our notification system:

### Main Inbox (Desktop)
![Main Inbox Desktop](images/desktop_main_inbox.png)
*A comprehensive view of all notifications with type-based filters and pagination.*

### Priority Inbox (Desktop)
![Priority Inbox Desktop](images/desktop_priority_inbox.png)
*Our custom ranking algorithm in action, surfacing the most critical updates first.*

### Mobile Experience (Main & Priority)
![Mobile Main Inbox](images/mobile_main_inbox.png)
![Mobile Priority Inbox](images/mobile_priority_inbox.png)
*A fully responsive design ensuring you never miss an update on the go.*

## 🚦 Getting Started

We've made it easy to get up and running:

1. **Set the stage**: Drop your credentials into `notification_app_fe/.env.local`.
2. **Unlock access**: Head into `notification_app_fe/` and run `npm run pretest:auth`. This magic script handles your registration and grabs your token.
3. **Launch!**: Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

---

Built with ❤️ by [Your Name/Team] to make campus life just a little bit easier.

Happy exploring! 🥂
