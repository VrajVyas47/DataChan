# DATA-CHAN: Virtual Database Lab

> **Learn By Building And Learn By Querying**  
> An educational database laboratory and developer-grade MongoDB playground built for hands-on database learning.

---

## 🚀 Vision & Philosophy
Data-Chan addresses the fragmentation in database education. Instead of learning relational/NoSQL theory in slides, modeling in one tool, querying in a terminal, and solving coding challenges on another website, Data-Chan provides an end-to-end laboratory:

```
LEARN → DESIGN → BUILD → QUERY → EXPERIMENT → PRACTICE → EVALUATE → IMPROVE
```

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Key Principles |
| :--- | :--- | :--- |
| **Backend API** | Node.js + TypeScript + Express | RESTful `/api/v1`, modular domain modules, strict input validation |
| **Database** | MongoDB 6.0+ (Official Driver) | Platform collection validators, physical namespace isolation (`dc_<ws>_<db>`) |
| **Identity Authority** | Firebase Authentication | Identity issuance, password security, email verification, Firebase Auth Emulator support |
| **Authorization Authority** | Data-Chan API (Node.js/Express) | Authoritative session verification, RBAC, resource ownership policies, audit logs |
| **Session Model** | Firebase Server-Side Session Cookies | Secure, HttpOnly, SameSite=Lax `datachan_session` cookies; zero auth tokens in localStorage |
| **Query Engine** | Safe AST-based JavaScript Parser | **NO `eval()`, NO `vm`, NO `child_process`**. Safe AST traversal & operator whitelist |
| **Frontend** | Next.js 15 (App Router) + TypeScript | Server-side route middleware guards, Glassmorphic design, multi-theme token system |
| **Editor** | Monaco Editor | MongoDB MQL syntax highlighting, presets, keyboard shortcuts (`Ctrl+Enter`) |
| **Data Modeler** | React Flow | Visual canvas for MongoDB document modeling (embedding vs. referencing) |

---

## 📦 Project Structure

```
d:\Project\wad\
├── apps/
│   ├── api/            # Node.js + TypeScript Modular REST Backend (/api/v1)
│   │   ├── src/
│   │   │   ├── security/     # Session cookie, Firebase Admin, audit logger
│   │   │   ├── middleware/   # Authoritative session auth, RBAC, ownership guards
│   │   │   ├── modules/      # auth, admin, workspaces, databases, etc.
│   │   │   └── scripts/      # bootstrapAdmin.ts CLI
│   │   └── test/             # vitest security & query parser test suite
│   └── web/            # Next.js 15 + TypeScript Frontend
│       ├── src/
│       │   ├── middleware.ts # Next.js server-side session route guard
│       │   ├── lib/          # api.ts (credentials: 'include'), firebase.ts
│       │   └── app/          # /login, /dashboard, /workspace, /modeler, /admin
├── packages/
│   └── shared-types/   # Shared TypeScript domain contracts, DTOs & status types
├── docs/               # Architecture, API, Security, and Database specifications
├── docker-compose.yml  # Docker Compose for MongoDB, API, and Next.js
└── package.json        # Root npm workspaces configuration
```

---

## 🔐 Authoritative Security Model

Data-Chan enforces a strict **separation of concerns** with zero trust on client-side state:

1. **Authentication ("Who are you?")**:
   - Sole authority is **Firebase Authentication**.
   - No custom password hashing, no bcrypt in Node.js, no custom JWT issuance, no fake tokens.
   - Browser acquires a short-lived Firebase ID token and exchanges it via `POST /api/v1/auth/session`.
   - The backend validates the token via Firebase Admin SDK, provisions the user record if new (strictly as `student`), and sets a `HttpOnly`, `SameSite=Lax`, `Secure` (production) session cookie (`datachan_session`).
   - `localStorage` does **NOT** store authentication credentials.

2. **Authorization ("Are you allowed?")**:
   - Sole authority is the **Data-Chan Node.js Backend**.
   - Role-Based Access Control: `student`, `faculty`, `admin`.
   - Public registration strictly assigns `role = 'student'`. Clients cannot self-promote.
   - Route protection is enforced server-side via `requireRole(...)` and `requireOwnership(...)`.
   - Next.js Edge Middleware (`apps/web/src/middleware.ts`) protects routes before rendering.
   - All role transitions are restricted to administrators, synchronized to Firebase custom claims, and recorded in MongoDB `security_audit_logs`.

---

## 🏁 Quickstart

### Prerequisites
- Node.js v18+ (tested on v22/v24)
- npm v9+
- MongoDB 6.0+ (running locally on port 27017 or via Docker)
- Firebase Project credentials or local Firebase Auth Emulator

### Installation & Environment
```bash
# 1. Clone repository and install dependencies
npm install

# 2. Configure environment files
cp .env.example .env
# Edit .env and supply your Firebase credentials (or emulator host)

# 3. Build shared types
npm run build --workspace=@datachan/shared-types

# 4. Run the automated Security Test Suite
npm run test --workspace=@datachan/api

# 5. Start development servers
npm run dev
```

The API backend runs on `http://localhost:5000/api/v1` and the web interface on `http://localhost:3000`.

---

## 👑 Bootstrap Administrator Account

In Data-Chan, **there is NO public "Register as Admin" button**.
To promote or provision the initial administrator, use the secure server-side bootstrap CLI:

```bash
# Promote an existing Firebase user or provision an admin email:
npm run bootstrap:admin -- admin@datachan.org
```

This command:
1. Validates Firebase Admin connectivity.
2. Resolves the user in Firebase Auth and updates Firebase Custom Claims (`{ role: 'admin' }`).
3. Updates the authoritative MongoDB user record to `role: 'admin'`.
4. Writes an audit record in `security_audit_logs`.

---

## 🧪 Security & Automated Testing

The automated test suite verifies all security boundaries:
```bash
npm run test --workspace=@datachan/api
```

Test coverage includes:
- **Authentication Boundaries**: Missing cookie (401), malformed cookie (401), expired/revoked session (401), account suspended/disabled (403).
- **Backdoor Elimination**: Verifies `x-dev-role`, `x-dev-uid`, `x-dev-email`, and fake bearer tokens (`token_admin`) fail closed (401).
- **RBAC Enforcement**: Non-admins receive 403 on admin routes; students receive 403 on faculty/admin actions.
- **Resource Ownership**: Unauthorized access to another user's workspace returns 403.
- **Privilege Escalation Prevention**: `role: 'admin'` in registration or user profile updates is completely ignored.
- **Admin Self-Demotion Block**: Administrators cannot revoke their own admin privileges.

---

## 🎨 Themes
Data-Chan supports 5 accessible visual themes driven by semantic CSS tokens:
1. **Lavender Light** (Default academic aesthetic)
2. **Midnight Dark** (High-contrast charcoal developer mode)
3. **Ocean Blue** (Deep marine blue)
4. **Mint Lab** (Clean botanical green)
5. **Sunset Amber** (Warm terracotta and gold)

Switch themes seamlessly via **Settings** or the top navigation bar.
