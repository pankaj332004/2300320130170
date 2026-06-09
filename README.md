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

* The system design answers (including database schemas, composite index optimization, performance strategies, and queue-based transactional logic) can be reviewed in [**`notification_system_design.md`**](notification_system_design.md).
* A capture of the running Priority Inbox in the MUI dashboard is saved as [**`priority_inbox_screenshot.png`**](priority_inbox_screenshot.png) in the workspace root.
