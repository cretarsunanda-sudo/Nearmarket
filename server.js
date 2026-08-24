const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "near-market-change-this-secret";

const db = new Database("near-market.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  phone TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  item_name TEXT,
  quantity INTEGER DEFAULT 1,
  total REAL DEFAULT 0,
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Login required"
    });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired login"
    });
  }
}

/* =========================
   REGISTER
========================= */

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      phone,
      password,
      role = "customer"
    } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        error: "Name, phone and password are required"
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: "Password must be at least 4 characters"
      });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE phone = ?")
      .get(phone);

    if (existing) {
      return res.status(409).json({
        error: "This phone number is already registered"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users
        (name, phone, password, role)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        name.trim(),
        phone.trim(),
        hash,
        role === "seller" ? "seller" : "customer"
      );

    const user = db
      .prepare(`
        SELECT id, name, phone, role
        FROM users
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    const token = createToken(user);

    res.json({
      success: true,
      message: "Registration successful",
      token,
      user
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Registration failed"
    });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {
  try {
    const {
      phone,
      password
    } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        error: "Phone and password are required"
      });
    }

    const user = db
      .prepare(`
        SELECT *
        FROM users
        WHERE phone = ?
      `)
      .get(phone.trim());

    if (!user) {
      return res.status(401).json({
        error: "Invalid phone or password"
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        error: "Invalid phone or password"
      });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role
    };

    const token = createToken(safeUser);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

/* =========================
   CURRENT USER
========================= */

app.get("/api/me", auth, (req, res) => {
  const user = db
    .prepare(`
      SELECT id, name, phone, role
      FROM users
      WHERE id = ?
    `)
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  res.json({
    user
  });
});

/* =========================
   SERVICES
========================= */

app.get("/api/services", (req, res) => {
  const services = db
    .prepare(`
      SELECT
        id,
        name,
        category,
        description,
        phone,
        created_at
      FROM services
      ORDER BY id DESC
    `)
    .all();

  res.json({
    services
  });
});

app.post("/api/services", auth, (req, res) => {
  try {
    const {
      name,
      category,
      description,
      phone
    } = req.body;

    if (!name || !category || !phone) {
      return res.status(400).json({
        error: "Name, category and phone are required"
      });
    }

    const result = db
      .prepare(`
        INSERT INTO services
        (user_id, name, category, description, phone)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        req.user.id,
        name.trim(),
        category.trim(),
        description || "",
        phone.trim()
      );

    const service = db
      .prepare(`
        SELECT *
        FROM services
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      service
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Could not add service"
    });
  }
});

/* =========================
   ORDERS
========================= */

app.post("/api/orders", auth, (req, res) => {
  try {
    const {
      item_name,
      quantity = 1,
      total = 0,
      address,
      phone
    } = req.body;

    if (!item_name || !address || !phone) {
      return res.status(400).json({
        error: "Item, address and phone are required"
      });
    }

    const result = db
      .prepare(`
        INSERT INTO orders
        (user_id, item_name, quantity, total, address, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        req.user.id,
        item_name,
        Number(quantity),
        Number(total),
        address,
        phone
      );

    const order = db
      .prepare(`
        SELECT *
        FROM orders
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      order
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Order could not be created"
    });
  }
});

app.get("/api/orders", auth, (req, res) => {
  const orders = db
    .prepare(`
      SELECT *
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
    `)
    .all(req.user.id);

  res.json({
    orders
  });
});

/* =========================
   ADMIN
========================= */

app.get("/api/admin/users", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  const users = db
    .prepare(`
      SELECT
        id,
        name,
        phone,
        role,
        created_at
      FROM users
      ORDER BY id DESC
    `)
    .all();

  res.json({
    users
  });
});

app.get("/api/admin/orders", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required"
    });
  }

  const orders = db
    .prepare(`
      SELECT *
      FROM orders
      ORDER BY id DESC
    `)
    .all();

  res.json({
    orders
  });
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Near Market"
  });
});

/* =========================
   FRONTEND FALLBACK
========================= */

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Near Market running on port ${PORT}`);
});
