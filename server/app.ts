import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction, Router } from 'express';
import { Pool } from 'pg';
import type { PoolConfig } from 'pg';

let pool: Pool | null = null;
let lastDbUrl: string | undefined;

function buildPoolConfig(rawUrl: string): PoolConfig {
  const parsed = new URL(rawUrl);
  const sslMode = parsed.searchParams.get('sslmode');
  const isLocalHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1';

  // Strip sslmode from URL so pg-connection-string does not override ssl options
  parsed.searchParams.delete('sslmode');

  const needsSsl =
    sslMode === 'require' ||
    sslMode === 'verify-ca' ||
    sslMode === 'verify-full' ||
    sslMode === 'prefer' ||
    (!isLocalHost && sslMode !== 'disable');

  return {
    connectionString: parsed.toString(),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
  };
}

function getPool(): Pool {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    const err = new Error('DATABASE_URL environment variable is not configured.');
    (err as Error & { code?: string }).code = 'DB_NOT_CONFIGURED';
    throw err;
  }

  if (!pool || lastDbUrl !== dbUrl) {
    if (pool) {
      void pool.end().catch(() => {});
    }
    pool = new Pool(buildPoolConfig(dbUrl));
    lastDbUrl = dbUrl;
  }

  return pool;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parsePositiveInt(value: unknown, fieldName: string): number {
  const num = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isInteger(num) || num <= 0 || num > 2_000_000_000) {
    throw new HttpError(400, `${fieldName} must be a valid positive integer.`);
  }
  return num;
}

function parseRequiredText(value: unknown, fieldName: string, maxLen = 120): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${fieldName} is required.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${fieldName} cannot be empty.`);
  }
  if (trimmed.length > maxLen) {
    throw new HttpError(400, `${fieldName} must be at most ${maxLen} characters.`);
  }
  return trimmed;
}

export function createApiRouter(): Router {
  const router = express.Router();
  router.use(express.json({ limit: '1mb' }));

  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const db = getPool();
      await db.query('SELECT 1');
      res.json({ ok: true, connected: true });
    } catch (error) {
      const err = error as Error & { code?: string };
      if (err.code === 'DB_NOT_CONFIGURED') {
        res.status(503).json({
          ok: false,
          connected: false,
          needsConfiguration: true,
          error: 'DATABASE_URL is not configured in server environment variables.',
        });
        return;
      }
      res.status(503).json({
        ok: false,
        connected: false,
        error: 'Unable to reach PostgreSQL database.',
      });
    }
  });

  router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();

      const [studentStats, bookStats, txStats, deptStats, recentRows] = await Promise.all([
        db.query(`
          SELECT
            COUNT(*)::int AS total_students,
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM public.transaction_details td
                WHERE td.usn = s.usn AND td.return_status = false
              )
            )::int AS students_borrowing
          FROM public.studentss s
        `),
        db.query(`
          SELECT
            COUNT(*)::int AS total_books,
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM public.transaction_details td
                WHERE td.book_id = b.book_id AND td.return_status = false
              )
            )::int AS books_borrowed
          FROM public.book b
        `),
        db.query(`
          SELECT
            COUNT(*)::int AS total_transactions,
            COUNT(*) FILTER (WHERE return_status = false)::int AS active_borrows,
            COUNT(*) FILTER (WHERE return_status = true)::int AS returned_borrows
          FROM public.transaction_details
        `),
        db.query(`
          SELECT
            COALESCE(NULLIF(TRIM(s.department), ''), 'Unassigned') AS department,
            COUNT(*)::int AS student_count,
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM public.transaction_details td
                WHERE td.usn = s.usn AND td.return_status = false
              )
            )::int AS borrowing_count
          FROM public.studentss s
          GROUP BY 1
          ORDER BY student_count DESC, department ASC
        `),
        db.query(`
          SELECT
            td.transaction_id,
            td.usn,
            COALESCE(s.name, 'Unknown Student') AS student_name,
            COALESCE(s.department, 'N/A') AS department,
            td.book_id,
            COALESCE(b.book_name, 'Unknown Book') AS book_name,
            COALESCE(b.author, 'Unknown Author') AS author,
            td.borrow_date,
            COALESCE(td.return_status, false) AS return_status
          FROM public.transaction_details td
          LEFT JOIN public.studentss s ON s.usn = td.usn
          LEFT JOIN public.book b ON b.book_id = td.book_id
          ORDER BY td.return_status ASC, td.borrow_date DESC NULLS LAST, td.transaction_id DESC
          LIMIT 8
        `),
      ]);

      const sRow = studentStats.rows[0];
      const bRow = bookStats.rows[0];
      const tRow = txStats.rows[0];

      res.json({
        metrics: {
          totalStudents: sRow.total_students,
          studentsBorrowing: sRow.students_borrowing,
          studentsNotBorrowing: sRow.total_students - sRow.students_borrowing,
          totalBooks: bRow.total_books,
          booksBorrowed: bRow.books_borrowed,
          booksAvailable: bRow.total_books - bRow.books_borrowed,
          totalTransactions: tRow.total_transactions,
          activeBorrows: tRow.active_borrows,
          returnedBorrows: tRow.returned_borrows,
        },
        departments: deptStats.rows,
        recentBorrows: recentRows.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/students', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const result = await db.query(
        `
        WITH student_borrows AS (
          SELECT
            s.usn,
            s.name,
            s.department,
            COUNT(td.transaction_id)::int AS total_borrow_count,
            COUNT(td.transaction_id) FILTER (WHERE td.return_status = false)::int AS active_borrow_count,
            COALESCE(
              json_agg(
                json_build_object(
                  'transaction_id', td.transaction_id,
                  'book_id', td.book_id,
                  'book_name', b.book_name,
                  'author', b.author,
                  'borrow_date', td.borrow_date
                )
                ORDER BY td.borrow_date DESC NULLS LAST, td.transaction_id DESC
              ) FILTER (WHERE td.transaction_id IS NOT NULL AND td.return_status = false),
              '[]'::json
            ) AS active_books
          FROM public.studentss s
          LEFT JOIN public.transaction_details td ON td.usn = s.usn
          LEFT JOIN public.book b ON b.book_id = td.book_id
          GROUP BY s.usn, s.name, s.department
        )
        SELECT
          usn,
          name,
          department,
          (active_borrow_count > 0) AS has_borrowed,
          active_borrow_count,
          total_borrow_count,
          active_books
        FROM student_borrows
        WHERE
          ($1 = 'all' OR ($1 = 'borrowed' AND active_borrow_count > 0) OR ($1 = 'not_borrowed' AND active_borrow_count = 0))
          AND ($2 = '' OR LOWER(COALESCE(department, '')) = LOWER($2))
          AND (
            $3 = ''
            OR CAST(usn AS TEXT) ILIKE '%' || $3 || '%'
            OR COALESCE(name, '') ILIKE '%' || $3 || '%'
            OR COALESCE(department, '') ILIKE '%' || $3 || '%'
          )
        ORDER BY usn ASC
        `,
        [status, department, search]
      );

      res.json({ students: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/students', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const name = parseRequiredText(req.body?.name, 'Student name', 100);
      const department = parseRequiredText(req.body?.department, 'Department', 60);

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        let usn: number;
        if (req.body?.usn !== undefined && req.body?.usn !== null && String(req.body.usn).trim() !== '') {
          usn = parsePositiveInt(req.body.usn, 'USN');
        } else {
          const maxRes = await client.query('SELECT COALESCE(MAX(usn), 100)::int + 1 AS next_usn FROM public.studentss');
          usn = maxRes.rows[0].next_usn;
        }

        const existing = await client.query('SELECT usn FROM public.studentss WHERE usn = $1', [usn]);
        if (existing.rows.length > 0) {
          throw new HttpError(409, `Student with USN ${usn} already exists.`);
        }

        const inserted = await client.query(
          'INSERT INTO public.studentss (usn, name, department) VALUES ($1, $2, $3) RETURNING usn, name, department',
          [usn, name, department]
        );
        await client.query('COMMIT');

        res.status(201).json({
          student: {
            ...inserted.rows[0],
            has_borrowed: false,
            active_borrow_count: 0,
            total_borrow_count: 0,
            active_books: [],
          },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  });

  router.get('/books', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const result = await db.query(
        `
        WITH book_status AS (
          SELECT
            b.book_id,
            b.book_name,
            b.author,
            COUNT(td.transaction_id)::int AS total_borrow_count,
            BOOL_OR(td.return_status = false) IS TRUE AS is_borrowed,
            (
              SELECT json_build_object(
                'transaction_id', active_td.transaction_id,
                'usn', active_td.usn,
                'student_name', st.name,
                'department', st.department,
                'borrow_date', active_td.borrow_date
              )
              FROM public.transaction_details active_td
              LEFT JOIN public.studentss st ON st.usn = active_td.usn
              WHERE active_td.book_id = b.book_id AND active_td.return_status = false
              ORDER BY active_td.borrow_date DESC NULLS LAST, active_td.transaction_id DESC
              LIMIT 1
            ) AS current_borrower
          FROM public.book b
          LEFT JOIN public.transaction_details td ON td.book_id = b.book_id
          GROUP BY b.book_id, b.book_name, b.author
        )
        SELECT
          book_id,
          book_name,
          author,
          is_borrowed,
          current_borrower,
          total_borrow_count
        FROM book_status
        WHERE
          ($1 = 'all' OR ($1 = 'borrowed' AND is_borrowed = true) OR ($1 = 'available' AND is_borrowed = false))
          AND (
            $2 = ''
            OR CAST(book_id AS TEXT) ILIKE '%' || $2 || '%'
            OR COALESCE(book_name, '') ILIKE '%' || $2 || '%'
            OR COALESCE(author, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY book_id ASC
        `,
        [status, search]
      );

      res.json({ books: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/books', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const bookName = parseRequiredText(req.body?.book_name, 'Book name', 140);
      const author = parseRequiredText(req.body?.author, 'Book author / details', 120);

      const client = await db.connect();
      try {
        await client.query('BEGIN');
        let bookId: number;
        if (req.body?.book_id !== undefined && req.body?.book_id !== null && String(req.body.book_id).trim() !== '') {
          bookId = parsePositiveInt(req.body.book_id, 'Book ID');
        } else {
          const maxRes = await client.query('SELECT COALESCE(MAX(book_id), 200)::int + 1 AS next_id FROM public.book');
          bookId = maxRes.rows[0].next_id;
        }

        const existing = await client.query('SELECT book_id FROM public.book WHERE book_id = $1', [bookId]);
        if (existing.rows.length > 0) {
          throw new HttpError(409, `Book with ID ${bookId} already exists.`);
        }

        const inserted = await client.query(
          'INSERT INTO public.book (book_id, book_name, author) VALUES ($1, $2, $3) RETURNING book_id, book_name, author',
          [bookId, bookName, author]
        );
        await client.query('COMMIT');

        res.status(201).json({
          book: {
            ...inserted.rows[0],
            is_borrowed: false,
            current_borrower: null,
            total_borrow_count: 0,
          },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  });

  router.get('/borrows', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const status = typeof req.query.status === 'string' ? req.query.status : 'all';
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const result = await db.query(
        `
        SELECT
          td.transaction_id,
          td.usn,
          COALESCE(s.name, 'Unknown Student') AS student_name,
          COALESCE(s.department, 'N/A') AS department,
          td.book_id,
          COALESCE(b.book_name, 'Unknown Book') AS book_name,
          COALESCE(b.author, 'Unknown Author') AS author,
          td.borrow_date,
          COALESCE(td.return_status, false) AS return_status
        FROM public.transaction_details td
        LEFT JOIN public.studentss s ON s.usn = td.usn
        LEFT JOIN public.book b ON b.book_id = td.book_id
        WHERE
          ($1 = 'all' OR ($1 = 'borrowed' AND td.return_status = false) OR ($1 = 'returned' AND td.return_status = true))
          AND (
            $2 = ''
            OR CAST(td.transaction_id AS TEXT) ILIKE '%' || $2 || '%'
            OR CAST(td.usn AS TEXT) ILIKE '%' || $2 || '%'
            OR CAST(td.book_id AS TEXT) ILIKE '%' || $2 || '%'
            OR COALESCE(s.name, '') ILIKE '%' || $2 || '%'
            OR COALESCE(b.book_name, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY td.return_status ASC, td.borrow_date DESC NULLS LAST, td.transaction_id DESC
        `,
        [status, search]
      );

      res.json({ borrows: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post('/borrows', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const usn = parsePositiveInt(req.body?.usn, 'Student USN');
      const bookId = parsePositiveInt(req.body?.book_id, 'Book ID');

      let borrowDate = new Date();
      if (req.body?.borrow_date) {
        const parsedDate = new Date(String(req.body.borrow_date));
        if (Number.isNaN(parsedDate.getTime())) {
          throw new HttpError(400, 'Invalid borrow date.');
        }
        borrowDate = parsedDate;
      }

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const studentCheck = await client.query(
          'SELECT usn, name, department FROM public.studentss WHERE usn = $1',
          [usn]
        );
        if (studentCheck.rows.length === 0) {
          throw new HttpError(404, `Student USN ${usn} was not found.`);
        }

        const bookCheck = await client.query(
          'SELECT book_id, book_name, author FROM public.book WHERE book_id = $1',
          [bookId]
        );
        if (bookCheck.rows.length === 0) {
          throw new HttpError(404, `Book ID ${bookId} was not found.`);
        }

        const activeBorrow = await client.query(
          'SELECT transaction_id, usn FROM public.transaction_details WHERE book_id = $1 AND return_status = false',
          [bookId]
        );
        if (activeBorrow.rows.length > 0) {
          throw new HttpError(
            409,
            `Book #${bookId} is currently borrowed by student USN ${activeBorrow.rows[0].usn}.`
          );
        }

        await client.query('LOCK TABLE public.transaction_details IN SHARE ROW EXCLUSIVE MODE');
        const nextIdRes = await client.query(
          'SELECT COALESCE(MAX(transaction_id), 0)::int + 1 AS next_id FROM public.transaction_details'
        );
        const transactionId = nextIdRes.rows[0].next_id;

        const inserted = await client.query(
          `INSERT INTO public.transaction_details (transaction_id, usn, book_id, borrow_date, return_status)
           VALUES ($1, $2, $3, $4, false)
           RETURNING transaction_id, usn, book_id, borrow_date, return_status`,
          [transactionId, usn, bookId, borrowDate]
        );
        await client.query('COMMIT');

        res.status(201).json({
          borrow: {
            ...inserted.rows[0],
            student_name: studentCheck.rows[0].name,
            department: studentCheck.rows[0].department,
            book_name: bookCheck.rows[0].book_name,
            author: bookCheck.rows[0].author,
          },
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  });

  router.patch('/borrows/:transactionId/return', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = getPool();
      const transactionId = parsePositiveInt(req.params.transactionId, 'Transaction ID');

      const updated = await db.query(
        `UPDATE public.transaction_details
         SET return_status = true
         WHERE transaction_id = $1 AND return_status = false
         RETURNING transaction_id, usn, book_id, borrow_date, return_status`,
        [transactionId]
      );

      if (updated.rows.length === 0) {
        const exists = await db.query(
          'SELECT transaction_id, return_status FROM public.transaction_details WHERE transaction_id = $1',
          [transactionId]
        );
        if (exists.rows.length === 0) {
          throw new HttpError(404, `Borrow transaction #${transactionId} was not found.`);
        }
        throw new HttpError(409, `Borrow transaction #${transactionId} is already marked as returned.`);
      }

      res.json({ borrow: updated.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }

    const pgErr = err as Error & { code?: string };
    if (pgErr.code === 'DB_NOT_CONFIGURED') {
      res.status(503).json({
        error: 'DATABASE_URL is not configured in server environment variables.',
        needsConfiguration: true,
      });
      return;
    }

    console.error('API Error:', pgErr.message);
    res.status(500).json({ error: 'An unexpected database error occurred.' });
  });

  return router;
}
