# Full-Stack Notification Platform & Priority Inbox System

This repository contains the complete implementation and technical design for a high-performance, real-time notification platform. The project is structured to showcase backend streaming architecture, custom Express middleware, database and queue optimization designs, and a state-of-the-art React dashboard utilizing **Material UI (MUI)**.

---

## 📂 Repository Structure

The project is organized as follows:

```text
├── logging_middleware/        # Custom Express request/response logger middleware
├── notification_app_be/       # Express backend serving notification APIs & SSE stream (Port 4000)
├── notification_app_fe/       # React + Vite frontend built with Material UI (Port 3000)
├── notification_system_design.md # Restructured design doc covering architecture, database, indexes, queues & heaps
├── priority_notifications.js  # Standalone CLI script executing the Top-N Min-Heap priority algorithm
├── priority_inbox_screenshot.png # High-quality visual screenshot of the MUI Priority Inbox layout
└── README.md                  # Main entrypoint documentation
```

---

## ⚙️ Core Technical Features

### 🚀 Real-time Live Connection (SSE)
* Implemented **Server-Sent Events (SSE)** via `GET /api/notifications/stream` for low-overhead, real-time notification delivery directly to logged-in users.

### ⚡ Priority Min-Heap Algorithm
* Designed a composite priority score using:
  $$\text{Priority Score} = (\text{Weight} \times 10^{12}) + \text{Timestamp (ms)}$$
  * Weights: `Placement` = 3, `Result` = 2, `Event` = 1, `Other` = 0.
* Integrated a standalone custom **`MinHeap`** data structure in `priority_notifications.js` to dynamically track the Top-10 highest-priority items in $O(N \log K)$ memory complexity.

### 🎨 Material UI (MUI) Premium Dashboard
* Features a vibrant, clean design using custom typography, cohesive layouts, responsive grid patterns, and violet/purple accent branding.
* Built-in **interactive Settings Panel** to test API configuration dynamically and store authentication bearer keys locally.
* Graceful **fallback simulation logic** that automatically runs the dashboard with local high-fidelity mock data if the evaluation server returns a `401 Unauthorized` or network error.

---

## 🛠️ Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Run the Express Backend
```bash
cd notification_app_be
npm install
npm run dev
```
*Runs locally on [http://localhost:4000](http://localhost:4000)*

### 2. Run the Vite React Frontend
```bash
cd notification_app_fe
npm install
npm run dev
```
*Runs locally on [http://localhost:3000](http://localhost:3000)*

### 3. Run the CLI Priority Calculator
```bash
node priority_notifications.js
```
*Computes priority scores and outputs a cleanly formatted console table of the top-10 notifications.*

---

## 🔍 Verification & Screenshots

The system design answers (including database schemas, composite index optimization, performance strategies, and queue-based transactional logic) can be reviewed in [**`notification_system_design.md`**](notification_system_design.md).

Below are live screenshots of the running React dashboard:

---

### 🔔 My Notifications Tab
> Users log in with their **User ID** to load their personal notification history. The timeline shows all notifications with filter options — **ALL** or **UNREAD** — and a button to manually trigger a test SSE notification.

![My Notifications Tab](assets/screenshots/screenshot_my_notifications.png)

---

### ⚙️ API Configuration Settings
> The **Settings Panel** lets users configure the remote evaluation **API Endpoint URL** and **Bearer Token** at runtime — no code changes needed. Credentials are saved locally in the browser for future sessions.

![API Configuration Settings](assets/screenshots/screenshot_api_settings.png)

---

### 📥 Priority Inbox — Top N Feeds
> The **Priority Inbox** displays the Top-N notifications ranked by a composite priority score `(Weight × 10¹² + Timestamp)`. Users can filter by notification type, adjust page size, and paginate through results. Falls back to high-fidelity mock data when the API is unavailable.

![Priority Inbox Tab](assets/screenshots/screenshot_priority_inbox.png)

---

## 🧩 Backend Code Walkthrough

A quick look at the key backend functions powering the notification system.

---

### 📝 `createNotification` — Building a Notification Object
> This function creates a new notification with a unique ID, sets default values (`read: false`, `status: 'pending'`), pushes it to the in-memory store, and instantly streams it to the logged-in user via **SSE** using `notifyUser()`.

![createNotification function](assets/screenshots/code_create_notification.png)

---

### 🔎 `getNotificationsForUser`, `getUnreadCount` & `markRead`
> These three utility functions handle **fetching**, **filtering**, and **updating** notifications. `markRead()` not only marks the notification as read but also pushes a live `notification.update` event back to the client via SSE — keeping the UI in sync in real time.

![Notification helper functions](assets/screenshots/code_get_notifications.png)

---

### 🚀 Express App Setup & Middleware
> The Express server is wired up with **CORS**, **JSON body parsing**, and the custom **logging middleware** imported from the `logging_middleware` module. All notification utility functions are destructured from `./notifications` to keep the route file clean and modular.

![Express app setup](assets/screenshots/code_express_setup.png)

---

### 🛣️ API Routes — Notification Endpoints
> Four REST endpoints are defined: a **health check**, a **POST** to create notifications with input validation, a **GET** to fetch all notifications for a user, and a **GET** for the unread count. The `POST` route returns `HTTP 201` on success and `HTTP 400` on missing fields.

![Express API routes](assets/screenshots/code_express_routes.png)
