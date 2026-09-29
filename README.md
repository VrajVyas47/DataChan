# DATA-CHAN: Virtual Database Lab

> **Learn By Building And Learn By Querying**  
> An educational database laboratory and developer-grade MongoDB playground built for hands-on database learning.

---

## 🚀 Vision & Philosophy
Data-Chan addresses the fragmentation in database education. Instead of learning relational/NoSQL theory in slides, modeling in one tool, querying in a terminal, and solving coding challenges on another website, Data-Chan provides an end-to-end laboratory:

```
LEARN → DESIGN → BUILD → QUERY → EXPERIMENT → PRACTICE → EVALUATE → IMPROVE
```

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Key Principles |
| :--- | :--- | :--- |
| **Backend API** | Node.js + TypeScript + Express | RESTful `/api/v1`, modular domain modules, strict input validation |
| **Database** | MongoDB 6.0+ (Official Node.js Driver) | Centralized connection pool, physical namespace isolation (`dc_<ws>_<db>`) |
| **Authentication** | Firebase Authentication + Admin SDK | Client Firebase tokens verified server-side, zero password storage in Mongo |
| **Query Engine** | Pure AST-based JavaScript Parser | **NO `eval()`, NO `vm`, NO `child_process`**. Safe AST traversal & operator whitelist |
| **Frontend** | Next.js (App Router) + TypeScript | Responsive Bento layout, multi-theme token system, typed API client |
| **Editor** | Monaco Editor | MongoDB MQL syntax highlighting, presets, keyboard shortcuts (`Ctrl+Enter`) |
| **Data Modeler** | React Flow | Visual canvas for MongoDB document modeling (embedding vs. referencing) |

---

## 📦 Project Structure

```
d:\Project\wad\
├── apps/
│   ├── api/            # Node.js + TypeScript Modular REST Backend (/api/v1)
│   └── web/            # Next.js + TypeScript + Tailwind CSS Frontend
├── packages/
│   └── shared-types/   # Shared TypeScript domain contracts & DTOs
├── docs/               # Architecture, API, Security, and Database specifications
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── security.md
│   ├── frontend.md
│   ├── testing.md
│   ├── theme-system.md
│   └── decisions/      # Architecture Decision Records (ADRs)
├── docker-compose.yml  # Docker Compose for MongoDB, API, and Next.js
└── package.json        # Root npm workspaces configuration
```

---

## 🏁 Quickstart

### Prerequisites
- Node.js v18+ (tested on v24)
- npm v9+
- MongoDB 6.0+ (running locally on port 27017 or via Docker)

### Installation
```bash
# Clone and install workspace dependencies
npm install

# Build shared types
npm run build --workspace=@datachan/shared-types

# Start backend and frontend concurrently
npm run dev
```

The API runs on `http://localhost:5000/api/v1` and the web interface on `http://localhost:3000`.

---

## 🎨 Themes
Data-Chan supports 5 accessible visual themes driven by semantic CSS tokens:
1. **Lavender Light** (Default academic aesthetic)
2. **Midnight Dark** (High-contrast charcoal developer mode)
3. **Ocean Blue** (Deep marine blue)
4. **Mint Lab** (Clean botanical green)
5. **Sunset Amber** (Warm terracotta and gold)

Switch themes seamlessly via **Settings** or the top navigation bar.
