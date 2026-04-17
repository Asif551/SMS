import { average, calculateFinalGrade, calculateGradeDetails } from './gradePolicy';

type RegisterArgs = {
  app: any;
  db: any;
  authenticate: any;
  logActivity: (userId: number | null, action: string, details: string) => void;
};

const ensureSchema = (db: any) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      marks REAL NOT NULL,
      percentage REAL NOT NULL,
      grade TEXT NOT NULL,
      gpa REAL NOT NULL,
      entered_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, subject_id, exam_id),
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(entered_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      overall_percentage REAL NOT NULL,
      overall_gpa REAL NOT NULL,
      final_grade TEXT NOT NULL,
      final_status TEXT NOT NULL,
      total_subjects INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, exam_id),
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS result_publications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      state TEXT NOT NULL DEFAULT 'draft',
      published_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(class_id, exam_id),
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class_id);
    CREATE INDEX IF NOT EXISTS idx_marks_class_exam_subject ON marks(class_id, exam_id, subject_id, student_id);
    CREATE INDEX IF NOT EXISTS idx_results_class_exam ON results(class_id, exam_id);
    CREATE INDEX IF NOT EXISTS idx_result_publications_class_exam ON result_publications(class_id, exam_id);
  `);

  try {
    db.exec("ALTER TABLE exams ADD COLUMN result_state TEXT NOT NULL DEFAULT 'draft'");
  } catch {
    // Already exists.
  }
};

const requireRole = (req: any, res: any, roles: string[]) => {
  if (!roles.includes(req.user.role)) {
    res.sendStatus(403);
    return false;
  }
  return true;
};

const ensurePublicationRow = (db: any, classId: number, examId: number) => {
  db.prepare(`
    INSERT INTO result_publications (class_id, exam_id, state)
    VALUES (?, ?, 'draft')
    ON CONFLICT(class_id, exam_id) DO NOTHING
  `).run(classId, examId);
  return db.prepare('SELECT * FROM result_publications WHERE class_id = ? AND exam_id = ?').get(classId, examId) as any;
};

const assertDraft = (db: any, classId: number, examId: number) => {
  const publication = ensurePublicationRow(db, classId, examId);
  if (publication.state === 'published') {
    throw new Error('Results are already published for this class and exam. Unpublish to edit marks.');
  }
};

const getClassSubjects = (db: any, classId: number) =>
  db.prepare('SELECT id, name FROM subjects WHERE class_id = ? ORDER BY name').all(classId) as any[];

const getStudentMap = (db: any, classId: number) =>
  db.prepare(`
    SELECT id, name, student_id
    FROM users
    WHERE role = 'student' AND class_id = ?
    ORDER BY name
  `).all(classId) as any[];

const validateEntities = (db: any, studentId: number, classId: number, subjectId: number) => {
  const student = db.prepare("SELECT id, class_id FROM users WHERE id = ? AND role = 'student'").get(studentId) as any;
  if (!student) throw new Error('Student not found.');
  if (student.class_id !== classId) throw new Error('Student does not belong to the selected class.');

  const subject = db.prepare('SELECT id, class_id FROM subjects WHERE id = ?').get(subjectId) as any;
  if (!subject) throw new Error('Subject not found.');
  if (subject.class_id !== classId) throw new Error('Subject is not assigned to the selected class.');
};

const recalculateStudentResult = (db: any, studentId: number, classId: number, examId: number) => {
  const rows = db.prepare(`
    SELECT percentage, gpa, grade
    FROM marks
    WHERE student_id = ? AND class_id = ? AND exam_id = ?
  `).all(studentId, classId, examId) as { percentage: number; gpa: number; grade: string }[];

  if (!rows.length) {
    db.prepare('DELETE FROM results WHERE student_id = ? AND exam_id = ?').run(studentId, examId);
    return null;
  }

  const overall_percentage = average(rows.map((row) => row.percentage));
  const overall_gpa = average(rows.map((row) => row.gpa));
  const { final_grade, final_status } = calculateFinalGrade(overall_percentage, rows.some((row) => row.grade === 'F'));

  db.prepare(`
    INSERT INTO results (student_id, class_id, exam_id, overall_percentage, overall_gpa, final_grade, final_status, total_subjects, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(student_id, exam_id) DO UPDATE SET
      class_id = excluded.class_id,
      overall_percentage = excluded.overall_percentage,
      overall_gpa = excluded.overall_gpa,
      final_grade = excluded.final_grade,
      final_status = excluded.final_status,
      total_subjects = excluded.total_subjects,
      updated_at = CURRENT_TIMESTAMP
  `).run(studentId, classId, examId, overall_percentage, overall_gpa, final_grade, final_status, rows.length);

  return { overall_percentage, overall_gpa, final_grade, final_status, total_subjects: rows.length };
};

const buildClassResults = (db: any, classId: number, examId: number) => {
  const classInfo = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!classInfo || !exam) throw new Error('Class or exam not found.');

  const subjects = getClassSubjects(db, classId);
  const students = getStudentMap(db, classId);
  const publication = ensurePublicationRow(db, classId, examId);

  const marks = db.prepare(`
    SELECT
      m.id,
      m.student_id,
      m.subject_id,
      m.marks,
      m.percentage,
      m.grade,
      m.gpa
    FROM marks m
    WHERE m.class_id = ? AND m.exam_id = ?
  `).all(classId, examId) as any[];

  const markMap = new Map<string, any>();
  marks.forEach((row) => markMap.set(`${row.student_id}:${row.subject_id}`, row));

  const resultRows = db.prepare(`
    SELECT student_id, overall_percentage, overall_gpa, final_grade, final_status
    FROM results
    WHERE class_id = ? AND exam_id = ?
  `).all(classId, examId) as any[];
  const summaryMap = new Map<number, any>();
  resultRows.forEach((row) => summaryMap.set(row.student_id, row));

  const rows = students.map((student) => {
    const subject_results = subjects.map((subject) => {
      const cell = markMap.get(`${student.id}:${subject.id}`);
      return {
        subject_id: subject.id,
        subject_name: subject.name,
        mark_id: cell?.id || null,
        marks: cell?.marks ?? null,
        percentage: cell?.percentage ?? null,
        grade: cell?.grade ?? null,
        gpa: cell?.gpa ?? null,
      };
    });
    const summary = summaryMap.get(student.id);
    return {
      student_id: student.id,
      student_name: student.name,
      student_identifier: student.student_id,
      entered_subjects: subject_results.filter((item) => item.marks !== null).length,
      total_subjects: subjects.length,
      overall_percentage: summary?.overall_percentage ?? null,
      overall_gpa: summary?.overall_gpa ?? null,
      final_grade: summary?.final_grade ?? null,
      final_status: summary?.final_status ?? null,
      subject_results,
    };
  });

  return { class: classInfo, exam, publication, subjects, rows };
};

export const registerResultModule = ({ app, db, authenticate, logActivity }: RegisterArgs) => {
  ensureSchema(db);

  const subjectSeedCount = (db.prepare('SELECT COUNT(*) AS count FROM subjects').get() as any).count;
  if (subjectSeedCount === 0) {
    const classes = db.prepare('SELECT id, name FROM classes ORDER BY id').all() as any[];
    const insert = db.prepare('INSERT INTO subjects (name, class_id) VALUES (?, ?)');
    classes.forEach((item) => {
      const defaults = item.name === 'Class 2' ? ['Mathematics', 'Bangla', 'General Knowledge'] : ['Mathematics', 'English', 'Science'];
      defaults.forEach((subject) => insert.run(subject, item.id));
    });
  }

  const examSeedCount = (db.prepare('SELECT COUNT(*) AS count FROM exams').get() as any).count;
  if (examSeedCount === 0) {
    db.prepare('INSERT INTO exams (name, date, result_state) VALUES (?, ?, ?)').run('Mid Term', new Date().toISOString().slice(0, 10), 'draft');
  }

  app.get('/api/subjects', authenticate, (req: any, res) => {
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const rows = classId
      ? db.prepare('SELECT * FROM subjects WHERE class_id = ? ORDER BY name').all(classId)
      : db.prepare('SELECT s.*, c.name AS class_name FROM subjects s JOIN classes c ON c.id = s.class_id ORDER BY c.name, s.name').all();
    res.json(rows);
  });

  app.post('/api/subjects', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin'])) return;
    try {
      const result = db.prepare('INSERT INTO subjects (name, class_id) VALUES (?, ?)').run(req.body.name, Number(req.body.class_id));
      logActivity(req.user.id, 'Create Subject', `Created subject ${req.body.name}`);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/subjects/:id', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin'])) return;
    try {
      db.prepare('UPDATE subjects SET name = ?, class_id = ? WHERE id = ?').run(req.body.name, Number(req.body.class_id), Number(req.params.id));
      logActivity(req.user.id, 'Update Subject', `Updated subject ${req.body.name}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/subjects/:id', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin'])) return;
    const subjectId = Number(req.params.id);
    try {
      const impacted = db.prepare('SELECT DISTINCT student_id, class_id, exam_id FROM marks WHERE subject_id = ?').all(subjectId) as any[];
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM marks WHERE subject_id = ?').run(subjectId);
        db.prepare('DELETE FROM subjects WHERE id = ?').run(subjectId);
        impacted.forEach((item) => recalculateStudentResult(db, item.student_id, item.class_id, item.exam_id));
      });
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/marks', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin', 'teacher'])) return;
    const classId = Number(req.query.class_id);
    const subjectId = Number(req.query.subject_id);
    const examId = Number(req.query.exam_id);
    if (!classId || !subjectId || !examId) {
      res.status(400).json({ error: 'class_id, subject_id and exam_id are required.' });
      return;
    }

    try {
      const payload = buildClassResults(db, classId, examId);
      res.json({
        ...payload,
        subject: payload.subjects.find((item) => item.id === subjectId) || null,
        entries: payload.rows.map((row) => ({
          student_id: row.student_id,
          student_name: row.student_name,
          student_identifier: row.student_identifier,
          ...row.subject_results.find((item: any) => item.subject_id === subjectId),
        })),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/marks', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin', 'teacher'])) return;
    const studentId = Number(req.body.student_id);
    const classId = Number(req.body.class_id);
    const subjectId = Number(req.body.subject_id);
    const examId = Number(req.body.exam_id);
    const numericMarks = Number(req.body.marks);

    if (Number.isNaN(numericMarks) || numericMarks < 0 || numericMarks > 100) {
      res.status(400).json({ error: 'Marks must be between 0 and 100.' });
      return;
    }

    try {
      validateEntities(db, studentId, classId, subjectId);
      const grade = calculateGradeDetails(numericMarks);
      const transaction = db.transaction(() => {
        assertDraft(db, classId, examId);
        db.prepare(`
          INSERT INTO marks (student_id, class_id, subject_id, exam_id, marks, percentage, grade, gpa, entered_by, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(student_id, subject_id, exam_id) DO UPDATE SET
            class_id = excluded.class_id,
            marks = excluded.marks,
            percentage = excluded.percentage,
            grade = excluded.grade,
            gpa = excluded.gpa,
            entered_by = excluded.entered_by,
            updated_at = CURRENT_TIMESTAMP
        `).run(studentId, classId, subjectId, examId, numericMarks, grade.percentage, grade.grade, grade.gpa, req.user.id);
        recalculateStudentResult(db, studentId, classId, examId);
      });
      transaction();
      logActivity(req.user.id, 'Save Mark', `Saved mark for student ${studentId}, subject ${subjectId}, exam ${examId}`);
      res.json({ success: true, grade });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/results/class-view', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin', 'teacher'])) return;
    try {
      res.json(buildClassResults(db, Number(req.query.class_id), Number(req.query.exam_id)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/results/subject-performance', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin', 'teacher'])) return;
    const classId = Number(req.query.class_id);
    const subjectId = Number(req.query.subject_id);
    const examId = Number(req.query.exam_id);
    const rows = db.prepare(`
      SELECT u.name AS student_name, u.student_id AS student_identifier, m.marks, m.percentage, m.grade, m.gpa
      FROM marks m
      JOIN users u ON u.id = m.student_id
      WHERE m.class_id = ? AND m.subject_id = ? AND m.exam_id = ?
      ORDER BY m.marks DESC, u.name
    `).all(classId, subjectId, examId) as any[];

    res.json({
      summary: {
        entries: rows.length,
        average: average(rows.map((item) => item.marks)),
        highest: rows.length ? rows[0].marks : 0,
        lowest: rows.length ? rows[rows.length - 1].marks : 0,
        passRate: rows.length ? average([rows.filter((item) => item.grade !== 'F').length / rows.length * 100]) : 0,
      },
      rows,
    });
  });

  app.put('/api/results/publication', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['admin'])) return;
    const classId = Number(req.body.class_id);
    const examId = Number(req.body.exam_id);
    const state = req.body.state;
    if (!classId || !examId || !['draft', 'published'].includes(state)) {
      res.status(400).json({ error: 'class_id, exam_id and a valid state are required.' });
      return;
    }

    try {
      const transaction = db.transaction(() => {
        ensurePublicationRow(db, classId, examId);
        if (state === 'published') {
          const subjects = getClassSubjects(db, classId);
          if (!subjects.length) throw new Error('Assign subjects to the class before publishing.');
          const students = getStudentMap(db, classId);
          if (!students.length) throw new Error('No students found for the selected class.');

          students.forEach((student) => {
            const count = (db.prepare('SELECT COUNT(*) AS count FROM marks WHERE student_id = ? AND class_id = ? AND exam_id = ?').get(student.id, classId, examId) as any).count;
            if (count !== subjects.length) {
              throw new Error('All students must have marks entered for each subject before publishing.');
            }
            recalculateStudentResult(db, student.id, classId, examId);
          });

          db.prepare(`
            UPDATE result_publications
            SET state = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE class_id = ? AND exam_id = ?
          `).run(classId, examId);
        } else {
          db.prepare(`
            UPDATE result_publications
            SET state = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE class_id = ? AND exam_id = ?
          `).run(classId, examId);
        }
      });
      transaction();
      res.json({ success: true, publication: ensurePublicationRow(db, classId, examId) });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/student/results', authenticate, (req: any, res) => {
    if (!requireRole(req, res, ['student'])) return;
    const examId = req.query.exam_id ? Number(req.query.exam_id) : null;
    const history = db.prepare(`
      SELECT
        r.exam_id,
        e.name AS exam_name,
        e.date AS exam_date,
        r.overall_percentage,
        r.overall_gpa,
        r.final_grade,
        r.final_status,
        rp.published_at
      FROM results r
      JOIN exams e ON e.id = r.exam_id
      JOIN result_publications rp ON rp.class_id = r.class_id AND rp.exam_id = r.exam_id
      WHERE r.student_id = ? AND rp.state = 'published'
      ORDER BY e.date DESC, e.name
    `).all(req.user.id) as any[];

    const subject_results = examId ? db.prepare(`
      SELECT s.name AS subject_name, m.marks, m.percentage, m.grade, m.gpa
      FROM marks m
      JOIN subjects s ON s.id = m.subject_id
      JOIN result_publications rp ON rp.class_id = m.class_id AND rp.exam_id = m.exam_id
      WHERE m.student_id = ? AND m.exam_id = ? AND rp.state = 'published'
      ORDER BY s.name
    `).all(req.user.id, examId) : [];

    res.json({
      history,
      current: examId ? history.find((item) => item.exam_id === examId) || null : history[0] || null,
      subject_results,
    });
  });
};
