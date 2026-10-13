# Message Scheduler 📅✉️

A simple, secure, production-ready web application designed for scheduling automated messages and emails to teachers, parents, or other recipients on specific dates throughout the year.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ArockiaDass-123/message-scheduler01)

---

## 🎯 Core Concept: Workspaces / Tasks

Each **Workspace** encapsulates one distinct communication workflow:

- **Workspace 1**: *"Monthly Teacher Student Update"*
  - **Message**: *"Dear {{teacher_name}}, please send the monthly update for {{month}}..."*
  - **Recipients**: Subject Teachers (Arockiadass, Kumar, Priya, Sunita...)
  - **Schedules**: 05 Jan, 05 Feb, 05 Mar, 05 Apr ... 05 Dec (12 occurrences or more)
  - **Channels**: Email (Gmail API) and/or WhatsApp (Official Cloud API)

- **Workspace 2**: *"Quarterly Parent Feedback"*
  - Completely separate message, separate recipients, separate schedule, and separate history.

---

## ✨ Features & Architecture

### 1. Simple, Clean Dashboard
- Minimal, distraction-free home dashboard.
- Workspace summary cards displaying:
  - Workspace Name & Description
  - Next scheduled message date & time
  - Total recipients count
  - Scheduled count, Sent count, Pending count
  - `[Open Workspace]` button
- Quick sections for **Today's Scheduled**, **Upcoming Messages**, and **Recently Sent**.

### 2. Workspace Navigation (4 Simple Tabs)
- **MESSAGE**:
  - Message Subject editor
  - Rich text editor with formatting helpers (Bold, Bullet points, Numbered lists)
  - Interactive variable pills: `{{teacher_name}}`, `{{month}}`, `{{workspace_name}}`, `{{date}}`, `{{recipient_email}}`
  - Sending methods selection: `☑ Email (Gmail API)` `☐ WhatsApp (Official Cloud API)`
  - **Live Recipient Preview**: Displays exactly how the formatted email looks when rendered for a sample teacher.
- **RECIPIENTS**:
  - Simple recipient management (Name, Email, WhatsApp number)
  - `Select All` / `Deselect All` controls
  - Checkboxes to include or exclude individual recipients from this workspace
  - Add recipient modal & delete controls
- **CALENDAR (Most Important Feature)**:
  - Clean **12-month yearly interactive calendar** (e.g. 2026/2027)
  - Visual dot indicators (`●`) on dates with scheduled messages
  - Click any date to open the **Schedule Modal** with time picker and preview
  - **Confirmation step** before scheduling to prevent accidental dispatches
  - **Monthly Recurring Generator**: Generates 12 monthly occurrences in 1 click (e.g. 5th of every month at 09:00 AM)
  - **Custom Dates Batch Selector**: Click multiple dates on the calendar to schedule them all at once
  - Supports 1, 12, 20, 50, or 100+ schedules
  - Scheduled table with `[Send Now]` for instant testing, `[Retry]` for failures, and `[Cancel]`
- **HISTORY**:
  - Detailed audit log of every dispatch attempt
  - Delivery status chips: `✓ Sent` or `⚠ Failed`
  - Click any entry to inspect the rendered snapshot, individual recipients, timestamp, and API error reasons
  - `[ Retry ]` button to re-trigger failed sends

### 3. Server-Side Reliability & Background Worker
- **Server-side Execution**: Browser does **not** need to remain open; dispatches occur automatically on the server at the scheduled time.
- **Restart Tolerance**: When the server restarts, scheduled jobs remain persistent in the database.
- **Idempotency & Duplicate Prevention**: Uses unique composite idempotency keys (`ws_{id}_{minute}`) and transactional status locks (`Scheduled` → `Sending` → `Sent`/`Failed`) to guarantee messages are never sent twice.
- **Accurate Statuses**: Never silently marks a failed message as sent. Errors are recorded and retryable.

### 4. Official API Integrations
- **Email**: Official Google Gmail API with OAuth 2.0 flow and token refresh support.
- **WhatsApp**: Official Meta WhatsApp Business Cloud API (`v18.0` Graph API).
- **Timezone**: Default timezone `Asia/Kolkata` (IST), configurable in Settings.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start the Backend (FastAPI)
```powershell
cd backend
.\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is accessible at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.

### 2. Start the Frontend (Vite + React)
```powershell
cd frontend
npm run dev
```
The application opens at `http://localhost:3000`.

---

## 🔐 Google Account Login & Automatic Email Dispatch

You **no longer need to manually go to Settings** or generate App Passwords to connect your email!

1. On the login screen, click **"Sign in with Google"**.
2. Sign in with your Google account.
3. The system **automatically authorizes your Gmail account** with `gmail.send` permissions upon login.
4. Your account is immediately ready to schedule and dispatch emails to any recipient or teacher email addresses!

### Standard & Demo Credentials
- **Instant One-Click Login**: Click the **"Instant One-Click Login (Pre-configured Admin)"** button on the login screen.
- **Admin Email**: `admin@scheduler.local`
- **Password**: `admin123`

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (SQLite or PostgreSQL) | `sqlite:///./scheduler.db` |
| `SECRET_KEY` | JWT encryption secret | Production random key |
| `DEFAULT_TIMEZONE` | Default scheduling timezone | `Asia/Kolkata` |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID | Optional (configured via Settings) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth Client Secret | Optional (configured via Settings) |
| `WHATSAPP_PHONE_NUMBER_ID`| Meta WhatsApp Cloud Phone Number ID | Optional (configured via Settings) |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud Access Token | Optional (configured via Settings) |

---

## 🔒 Security Best Practices
- **No Passwords Stored**: Gmail and WhatsApp passwords are never requested or stored.
- **Encrypted Credentials**: Tokens are encrypted at rest using AES-128 Fernet keys.
- **Strict User Isolation**: All workspace, schedule, and recipient queries filter by `user_id == current_user.id`.
- **Server-Side Authorization**: Endpoints are protected by JWT Bearer tokens.
