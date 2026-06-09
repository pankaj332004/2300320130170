# Notification App (Backend)

Minimal Node/Express backend for the notification system.

Quick start:

Windows PowerShell:

```powershell
cd notification_app_be
npm install
npm run dev
```

API:
- `POST /notify` { to, message } -> creates a notification
- `GET /health` -> health check
