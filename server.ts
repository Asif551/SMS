import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerResultModule } from './resultModule';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(express.json());

// Initialize Database
const db = new Database('school.db');
db.pragma('foreign_keys = ON');

// Setup Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    student_id TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    class_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    class_id INTEGER,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    class_id INTEGER,
    period_id INTEGER,
    subject_id INTEGER,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(class_id) REFERENCES classes(id),
    FOREIGN KEY(period_id) REFERENCES periods(id),
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS fee_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER UNIQUE,
    amount REAL NOT NULL,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS salary_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    amount REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    user_id INTEGER,
    amount REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS admit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER,
    student_id INTEGER,
    class_id INTEGER,
    generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(exam_id) REFERENCES exams(id),
    FOREIGN KEY(student_id) REFERENCES users(id),
    FOREIGN KEY(class_id) REFERENCES classes(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Add new columns to users table if they don't exist
try {
  db.exec('ALTER TABLE users ADD COLUMN home_town TEXT');
  db.exec('ALTER TABLE users ADD COLUMN nid_birth_cert TEXT');
  db.exec('ALTER TABLE users ADD COLUMN current_address TEXT');
  db.exec('ALTER TABLE users ADD COLUMN previous_school TEXT');
  db.exec('ALTER TABLE users ADD COLUMN parents_name TEXT');
} catch (e) {
  // Columns likely already exist
}

try {
  db.exec('ALTER TABLE attendance ADD COLUMN subject_id INTEGER');
} catch (e) {
  // Column likely already exists
}

const requireRole = (req: any, res: any, roles: string[]) => {
  if (!roles.includes(req.user.role)) {
    res.sendStatus(403);
    return false;
  }
  return true;
};

const validateRequiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
};

// Helper to log activities
const logActivity = (user_id: number | null, action: string, details: string) => {
  try {
    db.prepare('INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)').run(user_id, action, details);
  } catch (e) {
    console.error('Failed to log activity', e);
  }
};

// Seed Admin User if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (role, name, email, password_hash) VALUES (?, ?, ?, ?)').run('admin', 'System Admin', 'admin@school.com', hash);
}

// Seed default settings
const schoolNameExists = db.prepare('SELECT * FROM settings WHERE key = ?').get('school_name');
if (!schoolNameExists) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('school_name', 'My School');
}

// Seed some initial data for testing
const classExists = db.prepare('SELECT * FROM classes').get();
if (!classExists) {
  const insertClass = db.prepare('INSERT INTO classes (name) VALUES (?)');
  const class1 = insertClass.run('Class 1').lastInsertRowid;
  const class2 = insertClass.run('Class 2').lastInsertRowid;

  const insertPeriod = db.prepare('INSERT INTO periods (name) VALUES (?)');
  insertPeriod.run('Period 1');
  insertPeriod.run('Period 2');

  const hash = bcrypt.hashSync('student123', 10);
  db.prepare('INSERT INTO users (role, name, student_id, password_hash, class_id) VALUES (?, ?, ?, ?, ?)').run('student', 'John Doe', 'S001', hash, class1);
  db.prepare('INSERT INTO users (role, name, student_id, password_hash, class_id) VALUES (?, ?, ?, ?, ?)').run('student', 'Jane Smith', 'S002', hash, class1);
  
  const teacherHash = bcrypt.hashSync('teacher123', 10);
  db.prepare('INSERT INTO users (role, name, email, password_hash) VALUES (?, ?, ?, ?)').run('teacher', 'Mr. Teacher', 'teacher@school.com', teacherHash);
  
  const accountantHash = bcrypt.hashSync('accountant123', 10);
  db.prepare('INSERT INTO users (role, name, email, password_hash) VALUES (?, ?, ?, ?)').run('accountant', 'Mr. Accountant', 'accountant@school.com', accountantHash);
  
  db.prepare('INSERT INTO fee_structures (class_id, amount) VALUES (?, ?)').run(class1, 500);
  db.prepare('INSERT INTO fee_structures (class_id, amount) VALUES (?, ?)').run(class2, 600);
}

// Authentication Middleware
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

registerResultModule({
  app,
  db,
  authenticate,
  logActivity,
});

// --- API Routes ---

// Settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = settings.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settingsObj);
});

app.post('/api/settings', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { key, value } = req.body;
  try {
    const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
    logActivity(req.user.id, 'Update Settings', `Updated setting ${key}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Dashboard Stats
app.get('/api/dashboard/stats', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  
  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
  const totalTeachers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").get().count;
  const totalClasses = db.prepare("SELECT COUNT(*) as count FROM classes").get().count;
  const revenue = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'income'").get().total || 0;
  
  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, SUM(amount) as total 
    FROM transactions 
    WHERE type = 'income' 
    GROUP BY month 
    ORDER BY month DESC 
    LIMIT 6
  `).all();

  res.json({
    totalStudents,
    totalTeachers,
    totalClasses,
    revenue,
    monthlyRevenue: monthlyRevenue.reverse()
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { identifier, password, isStudent } = req.body;
  let user;

  if (isStudent) {
    user = db.prepare('SELECT * FROM users WHERE student_id = ?').get(identifier);
  } else {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(identifier);
  }

  if (user && bcrypt.compareSync(password, user.password_hash)) {
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name, class_id: user.class_id }, JWT_SECRET, { expiresIn: '24h' });
    logActivity(user.id, 'Login', 'User logged in');
    res.json({ token, user: { id: user.id, role: user.role, name: user.name } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get Current User
app.get('/api/me', authenticate, (req: any, res) => {
  const user = db.prepare('SELECT id, role, name, email, student_id, class_id FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// --- Admin Routes ---
app.get('/api/users', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') return res.sendStatus(403);
  const users = db.prepare('SELECT id, role, name, email, student_id, class_id, home_town, nid_birth_cert, current_address, previous_school, parents_name FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { role, name, email, student_id, password, class_id, home_town, nid_birth_cert, current_address, previous_school, parents_name } = req.body;
  
  if (student_id) {
    const existingStudent = db.prepare('SELECT id FROM users WHERE student_id = ?').get(student_id);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student ID must be unique' });
    }
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (role, name, email, student_id, password_hash, class_id, home_town, nid_birth_cert, current_address, previous_school, parents_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(role, name, email || null, student_id || null, hash, class_id ? Number(class_id) : null, home_town || null, nid_birth_cert || null, current_address || null, previous_school || null, parents_name || null);
    logActivity(req.user.id, 'Create User', `Created user ${name} (${role})`);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { role, name, email, student_id, password, class_id, home_town, nid_birth_cert, current_address, previous_school, parents_name } = req.body;
  
  if (student_id) {
    const existingStudent = db.prepare('SELECT id FROM users WHERE student_id = ? AND id != ?').get(student_id, req.params.id);
    if (existingStudent) {
      return res.status(400).json({ error: 'Student ID must be unique' });
    }
  }

  try {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET role=?, name=?, email=?, student_id=?, password_hash=?, class_id=?, home_town=?, nid_birth_cert=?, current_address=?, previous_school=?, parents_name=? WHERE id=?')
        .run(role, name, email || null, student_id || null, hash, class_id ? Number(class_id) : null, home_town || null, nid_birth_cert || null, current_address || null, previous_school || null, parents_name || null, req.params.id);
    } else {
      db.prepare('UPDATE users SET role=?, name=?, email=?, student_id=?, class_id=?, home_town=?, nid_birth_cert=?, current_address=?, previous_school=?, parents_name=? WHERE id=?')
        .run(role, name, email || null, student_id || null, class_id ? Number(class_id) : null, home_town || null, nid_birth_cert || null, current_address || null, previous_school || null, parents_name || null, req.params.id);
    }
    logActivity(req.user.id, 'Update User', `Updated user ${name} (${role})`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  
  const targetId = Number(req.params.id);

  // Prevent deleting the last admin
  if (req.user.id === targetId) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  try {
    const userToDelete = db.prepare('SELECT name, role FROM users WHERE id = ?').get(targetId);
    
    const transaction = db.transaction(() => {
      // Delete related records first to avoid foreign key constraint errors if any
      db.prepare('DELETE FROM attendance WHERE student_id=?').run(targetId);
      db.prepare('DELETE FROM transactions WHERE user_id=?').run(targetId);
      db.prepare('DELETE FROM salary_structures WHERE user_id=?').run(targetId);
      db.prepare('DELETE FROM admit_cards WHERE student_id=?').run(targetId);
      
      // Finally delete the user
      db.prepare('DELETE FROM users WHERE id=?').run(targetId);
    });
    
    transaction();
    if (userToDelete) {
      logActivity(req.user.id, 'Delete User', `Deleted user ${userToDelete.name} (${userToDelete.role})`);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/activity-log', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') return res.sendStatus(403);
  const logs = db.prepare(`
    SELECT a.id, a.action, a.details, a.created_at, u.name as user_name, u.role as user_role
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 100
  `).all();
  res.json(logs);
});

app.get('/api/classes', authenticate, (req: any, res) => {
  const classes = db.prepare('SELECT * FROM classes').all();
  res.json(classes);
});

app.post('/api/classes', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin'])) return;
  try {
    const name = validateRequiredString(req.body.name, 'Class name');
    const result = db.prepare('INSERT INTO classes (name) VALUES (?)').run(name);
    logActivity(req.user.id, 'Create Class', `Created class ${name}`);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/classes/:id', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin'])) return;
  try {
    const classId = Number(req.params.id);
    const name = validateRequiredString(req.body.name, 'Class name');
    const result = db.prepare('UPDATE classes SET name = ? WHERE id = ?').run(name, classId);
    if (result.changes === 0) return res.status(404).json({ error: 'Class not found.' });
    logActivity(req.user.id, 'Update Class', `Updated class ${name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/classes/:id', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin'])) return;
  const classId = Number(req.params.id);
  try {
    const classInfo = db.prepare('SELECT name FROM classes WHERE id = ?').get(classId) as any;
    if (!classInfo) return res.status(404).json({ error: 'Class not found.' });

    const studentCount = (db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND class_id = ?").get(classId) as any).count;
    if (studentCount > 0) {
      return res.status(400).json({ error: 'Move or remove students from this class before deleting it.' });
    }

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM attendance WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM admit_cards WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM fee_structures WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM marks WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM results WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM result_publications WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM subjects WHERE class_id = ?').run(classId);
      db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
    });

    transaction();
    logActivity(req.user.id, 'Delete Class', `Deleted class ${classInfo.name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Teacher Routes ---
app.get('/api/students/class/:classId', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin', 'teacher'])) return;
  const students = db.prepare("SELECT id, name, student_id FROM users WHERE role = 'student' AND class_id = ?").all(Number(req.params.classId));
  res.json(students);
});

app.post('/api/attendance', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin', 'teacher'])) return;
  const { class_id, subject_id, date, records } = req.body; // records: [{student_id, status}]
  
  const cId = Number(class_id);
  const subjectId = Number(subject_id);
  if (!cId || !subjectId || typeof date !== 'string' || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'class_id, subject_id, date, and records are required.' });
  }

  const subject = db.prepare('SELECT id FROM subjects WHERE id = ? AND class_id = ?').get(subjectId, cId);
  if (!subject) {
    return res.status(400).json({ error: 'Subject is not assigned to the selected class.' });
  }
  
  const insert = db.prepare('INSERT INTO attendance (student_id, class_id, subject_id, date, status) VALUES (?, ?, ?, ?, ?)');
  const update = db.prepare('UPDATE attendance SET status = ? WHERE student_id = ? AND class_id = ? AND subject_id = ? AND date = ?');
  
  const check = db.prepare('SELECT id FROM attendance WHERE student_id = ? AND class_id = ? AND subject_id = ? AND date = ?');
  const validateStudent = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'student' AND class_id = ?");

  const transaction = db.transaction((recs) => {
    for (const rec of recs) {
      const sId = Number(rec.student_id);
      if (!validateStudent.get(sId, cId)) throw new Error('Attendance contains a student outside the selected class.');
      if (!['Present', 'Absent'].includes(rec.status)) throw new Error('Attendance status must be Present or Absent.');
      const existing = check.get(sId, cId, subjectId, date);
      if (existing) {
        update.run(rec.status, sId, cId, subjectId, date);
      } else {
        insert.run(sId, cId, subjectId, date, rec.status);
      }
    }
  });

  try {
    transaction(records);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/attendance/summary', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin', 'teacher'])) return;
  const { class_id } = req.query;
  let query = `
    SELECT u.id, u.name, u.student_id,
           COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) as present_count,
           COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END), 0) as absent_count,
           COUNT(a.id) as total_days
    FROM users u
    LEFT JOIN attendance a ON u.id = a.student_id
    WHERE u.role = 'student'
  `;
  const params = [];
  if (class_id) {
    query += ' AND u.class_id = ?';
    params.push(Number(class_id));
  }
  query += ' GROUP BY u.id';
  
  const summary = db.prepare(query).all(...params);
  res.json(summary);
});

app.get('/api/attendance/history/:studentId', authenticate, (req: any, res) => {
  if (!requireRole(req, res, ['admin', 'teacher'])) return;
  const history = db.prepare(`
    SELECT a.*, s.name as subject_name
    FROM attendance a
    JOIN subjects s ON a.subject_id = s.id
    WHERE a.student_id = ?
    ORDER BY a.date DESC, s.name
  `).all(Number(req.params.studentId));
  res.json(history);
});

// --- Fees & Salaries Routes ---
app.get('/api/fees', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') return res.sendStatus(403);
  const fees = db.prepare('SELECT * FROM fee_structures').all();
  res.json(fees);
});

app.post('/api/fees', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { class_id, amount } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM fee_structures WHERE class_id = ?').get(Number(class_id));
    if (existing) {
      db.prepare('UPDATE fee_structures SET amount = ? WHERE class_id = ?').run(Number(amount), Number(class_id));
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO fee_structures (class_id, amount) VALUES (?, ?)').run(Number(class_id), Number(amount));
      res.json({ id: result.lastInsertRowid });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/salaries', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'accountant') return res.sendStatus(403);
  const salaries = db.prepare('SELECT * FROM salary_structures').all();
  res.json(salaries);
});

app.post('/api/salaries', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { user_id, amount } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM salary_structures WHERE user_id = ?').get(Number(user_id));
    if (existing) {
      db.prepare('UPDATE salary_structures SET amount = ? WHERE user_id = ?').run(Number(amount), Number(user_id));
      res.json({ success: true });
    } else {
      const result = db.prepare('INSERT INTO salary_structures (user_id, amount) VALUES (?, ?)').run(Number(user_id), Number(amount));
      res.json({ id: result.lastInsertRowid });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Accountant Routes ---
app.get('/api/salaries/status', authenticate, (req: any, res) => {
  if (req.user.role !== 'accountant' && req.user.role !== 'admin') return res.sendStatus(403);
  const status = db.prepare(`
    SELECT u.id, u.name, u.role, COALESCE(s.amount, 0) as monthly_salary,
           COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND type = 'expense'), 0) as total_paid
    FROM users u
    LEFT JOIN salary_structures s ON u.id = s.user_id
    WHERE u.role IN ('teacher', 'accountant', 'admin')
  `).all();
  res.json(status);
});

app.get('/api/transactions', authenticate, (req: any, res) => {
  if (req.user.role !== 'accountant' && req.user.role !== 'admin') return res.sendStatus(403);
  const transactions = db.prepare('SELECT t.*, u.name as user_name FROM transactions t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.date DESC').all();
  res.json(transactions);
});

app.post('/api/transactions', authenticate, (req: any, res) => {
  if (req.user.role !== 'accountant' && req.user.role !== 'admin') return res.sendStatus(403);
  const { type, user_id, amount, description } = req.body;
  try {
    const result = db.prepare('INSERT INTO transactions (type, user_id, amount, description) VALUES (?, ?, ?, ?)').run(type, user_id ? Number(user_id) : null, Number(amount), description);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', authenticate, (req: any, res) => {
  if (req.user.role !== 'accountant' && req.user.role !== 'admin') {
    return res.sendStatus(403);
  }

  const { id } = req.params;
  const { type, user_id, amount, description } = req.body;

  try {
    const result = db.prepare(`
      UPDATE transactions
      SET
        type = ?,
        user_id = ?,
        amount = ?,
        description = ?
      WHERE id = ?
    `).run(
      type,
      user_id ? Number(user_id) : null,
      Number(amount),
      description,
      Number(id)
    );

    res.json({
      success: true,
      changes: result.changes
    });

  } catch (err: any) {
    res.status(400).json({
      error: err.message
    });
  }
});

app.get('/api/fees/dues', authenticate, (req: any, res) => {
  if (req.user.role !== 'accountant' && req.user.role !== 'admin') return res.sendStatus(403);
  // Simple dues calculation: assuming 1 fee per month, total dues = fee_structure * months_passed - total_paid
  // For simplicity, we just return the fee structure and total paid per student
  const dues = db.prepare(`
    SELECT u.id, u.name, u.student_id, c.name as class_name, COALESCE(f.amount, 0) as monthly_fee,
           COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND type = 'income'), 0) as total_paid
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN fee_structures f ON c.id = f.class_id
    WHERE u.role = 'student'
  `).all();
  res.json(dues);
});

// --- Staff Routes ---
app.get('/api/staff/salary', authenticate, (req: any, res) => {
  if (req.user.role === 'student') return res.sendStatus(403);
  const salaryInfo = db.prepare(`
    SELECT COALESCE(s.amount, 0) as monthly_salary,
           COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = ? AND type = 'expense'), 0) as total_paid
    FROM users u
    LEFT JOIN salary_structures s ON u.id = s.user_id
    WHERE u.id = ?
  `).get(req.user.id, req.user.id);
  
  const history = db.prepare("SELECT * FROM transactions WHERE user_id = ? AND type = 'expense' ORDER BY date DESC").all(req.user.id);
  
  res.json({ salaryInfo: salaryInfo || { monthly_salary: 0, total_paid: 0 }, history });
});

// --- Student Routes ---
app.get('/api/student/fees', authenticate, (req: any, res) => {
  if (req.user.role !== 'student') return res.sendStatus(403);
  const feeInfo = db.prepare(`
    SELECT COALESCE(f.amount, 0) as monthly_fee,
           COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = ? AND type = 'income'), 0) as total_paid
    FROM users u
    LEFT JOIN fee_structures f ON u.class_id = f.class_id
    WHERE u.id = ?
  `).get(req.user.id, req.user.id);
  
  const history = db.prepare("SELECT * FROM transactions WHERE user_id = ? AND type = 'income' ORDER BY date DESC").all(req.user.id);
  
  res.json({ feeInfo: feeInfo || { monthly_fee: 0, total_paid: 0 }, history });
});

app.get('/api/student/attendance', authenticate, (req: any, res) => {
  if (req.user.role !== 'student') return res.sendStatus(403);
  const history = db.prepare(`
    SELECT a.*, s.name as subject_name
    FROM attendance a
    JOIN subjects s ON a.subject_id = s.id
    WHERE a.student_id = ?
    ORDER BY a.date DESC, s.name
  `).all(req.user.id);
  res.json(history);
});

// --- Admit Card Routes ---
app.get('/api/exams', authenticate, (req: any, res) => {
  const exams = db.prepare('SELECT * FROM exams').all();
  res.json(exams);
});

app.post('/api/exams', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  try {
    const result = db.prepare('INSERT INTO exams (name, date) VALUES (?, ?)').run(req.body.name, req.body.date);
    res.json({ id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admit-cards/generate/:examId/:classId', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const students = db.prepare("SELECT id, name, student_id FROM users WHERE role = 'student' AND class_id = ?").all(Number(req.params.classId));
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(Number(req.params.examId));
  const classInfo = db.prepare('SELECT * FROM classes WHERE id = ?').get(Number(req.params.classId));
  
  res.json({ students, exam, classInfo });
});


// Vite Middleware for Development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
