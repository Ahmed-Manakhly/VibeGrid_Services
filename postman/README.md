# 📮 VibeGrid REST API — Postman Collection & Evaluation Guide

This directory contains the official **Postman Collection (v2.1.0)** and **Environment Presets** for evaluating the complete VibeGrid Microservices Architecture over public REST API ingress.

---

## 📁 Files Included

1. **`VibeGrid.postman_collection.json`**: Master collection with 10 structured folders covering all platform capabilities:
   - `00. System Health & Readiness` (`/api/health`, `/api/ready`)
   - `01. Authentication & Identity` (Registration, Dev Bypass OTP `123456`, Login, Session `/api/auth/me`, Token Refresh)
   - `02. Taxonomy & Categorization` (Feed Filters, Trending Tags, Admin Category & Vibe Creation)
   - `03. User Profiles & Settings` (Profile Updates, Topic Interests Mapping)
   - `04. Developer Communities & Guilds` (Guild List, Suggested Communities, Create Guild, Join Guild)
   - `05. Rich Posts & Feeds` (Feed Retrieval, MinIO Upload Pipeline, Dilemma Polls, Code Snippets, Q&A)
   - `06. Social Graph & Discovery` (Follow/Unfollow, Suggested Users, User Search)
   - `07. Social Engagement Matrix` (Post Likes, Nested Comments, Poll Voting, Re-Grids, Accepted Solutions)
   - `08. Bookmarks & Notifications` (Bookmarks, Real-Time Notifications Query & Read-State Update)
   - `09. Direct Messaging & Conversations` (Private 1-on-1 Chat Channels, Real-time Messages)

2. **`VibeGrid.postman_environment.json`**: Pre-configured environment presets for **Local Dev** (`http://localhost:3000/api`) and **Production VPS** (`https://www.vibegrid.manakhly.tech/api`).

3. **`../scripts/generate-postman-collection.js`**: Canonical generator script allowing one-click re-generation of the collection whenever route contracts evolve.

---

## 🚀 Quick Start Guide (Postman Desktop)

### 1. Import Files
1. Open **Postman Desktop**.
2. Click **Import** (top left).
3. Select both `VibeGrid.postman_collection.json` and `VibeGrid.postman_environment.json`.

### 2. Select Active Environment
- Select **`VibeGrid Environment (Local / Prod)`** from the environment dropdown in the top right.
- The `base_url` is pre-set to `https://www.vibegrid.manakhly.tech/api` (or toggle to `http://localhost:3000/api` for local development).

### 3. Authenticate & Auto-Capture Tokens
1. Open folder **`01. Authentication & Identity`**.
2. Run **`Login as Persona (POST /api/auth/login)`** (or `Login as Platform Admin`).
3. **Automatic Magic:** The collection test script automatically intercepts the `Set-Cookie` (`access_token=...`) header and JSON response, instantly saving `{{jwt_token}}`, `{{cookie_header}}`, `{{user_id}}`, and `{{user_role}}` into collection variables.
4. **Pre-request Inheritance:** All subsequent requests automatically inject both:
   - `Authorization: Bearer {{jwt_token}}`
   - `Cookie: access_token={{jwt_token}}`

### 4. Dynamic Chaining (No Manual Copy-Pasting Required!)
- Creating a Post automatically saves `{{post_id}}`.
- Creating a Poll automatically saves `{{poll_id}}`.
- Querying Feed Filters automatically saves sample `{{category_id}}` and `{{vibe_id}}`.
- Starting a Direct Message conversation automatically saves `{{conversation_id}}`.

---

## ⚡ Running Headless via Newman CLI

To run the full collection from the command line:

```bash
# Install Newman if not already installed
npm install -g newman

# Run the collection against the production VPS
newman run postman/VibeGrid.postman_collection.json \
  -e postman/VibeGrid.postman_environment.json \
  --insecure
```
