# 🌿 FoodSaver — Reduce Food Waste, Fight Hunger

A full-stack web application connecting restaurants with surplus food to NGOs and individuals in need.

**Developed by Hafeeza Shaik**

---

## 🗂 Project Structure

```
foodsaver-backend/
├── index.html ✅
├── login.html
├── assets/
│   ├── style.css
│   └── app.js
├── pages/
│   ├── browse.html
│   ├── upload.html
│   └── profile.html
├── server.js
├── database.js
└── package.json
```

---

## ⚙️ Backend Tech Stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Server      | Node.js + Express.js        |
| Database    | SQLite (via better-sqlite3) |
| Auth        | JWT (JSON Web Tokens)       |
| Passwords   | bcryptjs (hashed, salted)   |
| Sessions    | HTTP-only cookies           |

---

## 🚀 How to Run Locally

### Step 1 — Install Node.js
Download from https://nodejs.org (LTS version)

### Step 2 — Install dependencies
Open terminal in the project folder and run:
```bash
npm install
```

### Step 3 — Start the server
```bash
npm start
```

### Step 4 — Open in browser
```
http://localhost:3000
```

That's it! The database is created automatically on first run with demo data.

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| POST   | /api/auth/signup    | Create new account       |
| POST   | /api/auth/login     | Sign in, get JWT cookie  |
| POST   | /api/auth/logout    | Clear session cookie     |
| GET    | /api/auth/me        | Get current user info    |

### Listings
| Method | Endpoint                   | Description              |
|--------|----------------------------|--------------------------|
| GET    | /api/listings              | Get all listings         |
| GET    | /api/listings/:id          | Get single listing       |
| POST   | /api/listings              | Post new listing (auth)  |
| DELETE | /api/listings/:id          | Delete listing (auth)    |
| POST   | /api/listings/:id/claim    | Claim a listing (auth)   |

### Profile
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| PUT    | /api/profile          | Update profile (auth)    |
| GET    | /api/profile/stats    | Get user stats (auth)    |
| GET    | /api/profile/activity | Get activity log (auth)  |
| GET    | /api/my/listings      | My posted listings (auth)|
| GET    | /api/my/claims        | My claimed food (auth)   |

### Public
| Method | Endpoint    | Description           |
|--------|-------------|-----------------------|
| GET    | /api/stats  | Platform-wide stats   |

---

## 🌐 Deploy Online (Free)

### Option A — Railway (Recommended)
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Set environment variable: `JWT_SECRET=your_secret_here`
4. Done — live URL in seconds

### Option B — Render
1. Push to GitHub
2. render.com → New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `npm start`

### Option C — Glitch
1. glitch.com → Import from GitHub
2. Runs instantly, free forever

---

## 🔐 Security Features
- Passwords hashed with bcrypt (10 salt rounds)
- JWT stored in HTTP-only cookie (XSS-safe)
- Auth middleware on all protected routes
- SQL injection prevention via parameterised queries
- Foreign key constraints enforced in SQLite

---

## 📊 Database Schema

**users** — id, name, email, password (hashed), role, phone, org, city, created_at

**listings** — id, restaurant, contact, email, address, food, qty, unit, category, pickup, expiry_minutes, notes, veg, claimed, posted_by (→ users), created_at

**claims** — id, user_id (→ users), listing_id (→ listings), created_at

**activity** — id, user_id (→ users), type, description, ref_id, created_at

---

&copy; 2026 FoodSaver. Developed by Hafeeza Shaik.
