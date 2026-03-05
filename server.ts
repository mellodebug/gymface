import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

console.log("Starting GymFace Server...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database Setup
const db = new Database("gymface.db");
db.pragma("journal_mode = WAL");

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS gyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    stripe_account_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'recepcao', 'gerente')) NOT NULL,
    FOREIGN KEY(gym_id) REFERENCES gyms(id)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stripe_price_id TEXT,
    FOREIGN KEY(gym_id) REFERENCES gyms(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    face_encoding_encrypted TEXT,
    status TEXT DEFAULT 'active',
    plan_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(gym_id) REFERENCES gyms(id),
    FOREIGN KEY(plan_id) REFERENCES plans(id)
  );

  CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    gym_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(gym_id) REFERENCES gyms(id)
  );
`);

// Seed initial data if empty
const gymCount = db.prepare("SELECT COUNT(*) as count FROM gyms").get() as any;
if (gymCount.count === 0) {
  const gymResult = db.prepare("INSERT INTO gyms (name) VALUES (?)").run("GymFace Demo");
  const gymId = gymResult.lastInsertRowid;
  
  const hashedPassword = bcrypt.hashSync("password", 10);
  db.prepare("INSERT INTO users (gym_id, email, password, role) VALUES (?, ?, ?, ?)")
    .run(gymId, "admin@gymface.com", hashedPassword, "admin");
    
  db.prepare("INSERT INTO plans (gym_id, name, price, stripe_price_id) VALUES (?, ?, ?, ?)")
    .run(gymId, "Plano Pro", 99.90, "price_mock_123");
}

// Middleware
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- API Routes ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, gym_id: user.gym_id, role: user.role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "24h" }
  );

  res.json({ token, user: { id: user.id, email: user.email, role: user.role, gym_id: user.gym_id } });
});

// Students
app.get("/api/students", authenticate, (req: any, res) => {
  const students = db.prepare(`
    SELECT s.*, p.name as plan_name 
    FROM students s 
    LEFT JOIN plans p ON s.plan_id = p.id 
    WHERE s.gym_id = ?
  `).all(req.user.gym_id);
  res.json(students);
});

app.post("/api/students", authenticate, (req: any, res) => {
  const { name, email, plan_id, status, face_encoding } = req.body;
  
  let encryptedEncoding = null;
  if (face_encoding) {
    encryptedEncoding = CryptoJS.AES.encrypt(
      JSON.stringify(face_encoding),
      process.env.ENCODING_AES_KEY || "encoding_secret"
    ).toString();
  }

  const result = db.prepare(
    "INSERT INTO students (gym_id, name, email, plan_id, status, face_encoding_encrypted) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(req.user.gym_id, name, email, plan_id, status || 'active', encryptedEncoding);

  res.json({ id: result.lastInsertRowid });
});

app.put("/api/students/:id", authenticate, (req: any, res) => {
  const { name, email, plan_id, status, face_encoding } = req.body;
  const { id } = req.params;

  let query = "UPDATE students SET name = ?, email = ?, plan_id = ?, status = ?";
  let params = [name, email, plan_id, status];

  if (face_encoding) {
    const encryptedEncoding = CryptoJS.AES.encrypt(
      JSON.stringify(face_encoding),
      process.env.ENCODING_AES_KEY || "encoding_secret"
    ).toString();
    query += ", face_encoding_encrypted = ?";
    params.push(encryptedEncoding);
  }

  query += " WHERE id = ? AND gym_id = ?";
  params.push(id, req.user.gym_id);

  db.prepare(query).run(...params);

  res.json({ success: true });
});

app.delete("/api/students/:id", authenticate, (req: any, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM students WHERE id = ? AND gym_id = ?").run(id, req.user.gym_id);
  res.json({ success: true });
});

// Plans
app.get("/api/plans", authenticate, (req: any, res) => {
  const plans = db.prepare("SELECT * FROM plans WHERE gym_id = ?").all(req.user.gym_id);
  res.json(plans);
});

// Recognition Data
app.get("/api/recognition/data", authenticate, (req: any, res) => {
  const students = db.prepare(`
    SELECT id, name, face_encoding_encrypted 
    FROM students 
    WHERE gym_id = ? AND face_encoding_encrypted IS NOT NULL AND status = 'active'
  `).all(req.user.gym_id);

  const decryptedStudents = students.map((s: any) => {
    try {
      const bytes = CryptoJS.AES.decrypt(
        s.face_encoding_encrypted,
        process.env.ENCODING_AES_KEY || "encoding_secret"
      );
      const encoding = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return { id: s.id, name: s.name, encoding };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  res.json(decryptedStudents);
});

// Recognition & Access
app.post("/api/access/verify", authenticate, (req: any, res) => {
  const { student_id, status } = req.body;
  
  // Log access
  db.prepare("INSERT INTO access_logs (student_id, gym_id, status) VALUES (?, ?, ?)")
    .run(student_id, req.user.gym_id, status);

  // In a real scenario, here you would trigger the GPIO/TCP call
  console.log(`[GATE CONTROL] Releasing gate for student ${student_id} at gym ${req.user.gym_id}`);
  
  res.json({ success: true, message: "Gate released" });
});

// Dashboard Stats
app.get("/api/dashboard/stats", authenticate, (req: any, res) => {
  const gym_id = req.user.gym_id;
  
  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students WHERE gym_id = ?").get(gym_id) as any;
  const activeStudents = db.prepare("SELECT COUNT(*) as count FROM students WHERE gym_id = ? AND status = 'active'").get(gym_id) as any;
  
  const dailyAccess = db.prepare(`
    SELECT date(timestamp) as date, COUNT(*) as count 
    FROM access_logs 
    WHERE gym_id = ? AND timestamp >= date('now', '-7 days')
    GROUP BY date(timestamp)
  `).all(gym_id);

  res.json({
    totalStudents: totalStudents.count,
    activeStudents: activeStudents.count,
    dailyAccess
  });
});

// Stripe Integration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "mock_key", {
  apiVersion: "2025-01-27.acacia" as any,
});

app.post("/api/payments/create-checkout", authenticate, async (req: any, res) => {
  const { plan_id } = req.body;
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(plan_id) as any;

  if (!plan) return res.status(404).json({ error: "Plan not found" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price: plan.stripe_price_id,
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${process.env.APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.APP_URL}/dashboard?canceled=true`,
      metadata: {
        gym_id: req.user.gym_id.toString(),
        user_id: req.user.id.toString()
      }
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware for Dev
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
        host: true
      },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      console.log(`[Vite] Serving ${url}`);
      try {
        let template = await fs.promises.readFile(
          path.resolve(__dirname, "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 GymFace Server started successfully!`);
    console.log(`📡 Listening on port ${PORT}`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
