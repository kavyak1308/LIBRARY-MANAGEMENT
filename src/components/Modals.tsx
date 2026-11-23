import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { BookRecord, StudentRecord } from '../types';

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  suggestedUsn: number;
  onSubmit: (payload: { usn?: number; name: string; department: string }) => Promise<void>;
}

export function AddStudentModal({
  open,
  onClose,
  suggestedUsn,
  onSubmit,
}: AddStudentModalProps) {
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUsn(String(suggestedUsn));
      setName('');
      setDepartment('');
      setError(null);
    }
  }, [open, suggestedUsn]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        usn: usn.trim() ? Number(usn.trim()) : undefined,
        name: name.trim(),
        department: department.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="add-student-title" className="text-base font-semibold text-slate-900">
            Add Student
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="student-usn" className="block text-xs font-medium text-slate-700 mb-1.5">
              Student USN
            </label>
            <input
              id="student-usn"
              type="number"
              min={1}
              required
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label htmlFor="student-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Student Name
            </label>
            <input
              id="student-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AARAV SHARMA"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label htmlFor="student-dept" className="block text-xs font-medium text-slate-700 mb-1.5">
              Department
            </label>
            <input
              id="student-dept"
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. CSE, AIML, ISE, ECE"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddBookModalProps {
  open: boolean;
  onClose: () => void;
  suggestedBookId: number;
  onSubmit: (payload: { book_id?: number; book_name: string; author: string }) => Promise<void>;
}

export function AddBookModal({
  open,
  onClose,
  suggestedBookId,
  onSubmit,
}: AddBookModalProps) {
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBookId(String(suggestedBookId));
      setBookName('');
      setAuthor('');
      setError(null);
    }
  }, [open, suggestedBookId]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        book_id: bookId.trim() ? Number(bookId.trim()) : undefined,
        book_name: bookName.trim(),
        author: author.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="add-book-title" className="text-base font-semibold text-slate-900">
            Add Book
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="book-id" className="block text-xs font-medium text-slate-700 mb-1.5">
              Book ID
            </label>
            <input
              id="book-id"
              type="number"
              min={1}
              required
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label htmlFor="book-name" className="block text-xs font-medium text-slate-700 mb-1.5">
              Book Name
            </label>
            <input
              id="book-name"
              type="text"
              required
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              placeholder="e.g. DISTRIBUTED SYSTEMS"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label htmlFor="book-author" className="block text-xs font-medium text-slate-700 mb-1.5">
              Author / Book Details
            </label>
            <input
              id="book-author"
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. MARTIN KLEPPMANN"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? 'Saving...' : 'Save Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IssueBookModalProps {
  open: boolean;
  onClose: () => void;
  students: StudentRecord[];
  books: BookRecord[];
  initialUsn?: number | null;
  initialBookId?: number | null;
  onSubmit: (payload: { usn: number; book_id: number }) => Promise<void>;
}

export function IssueBookModal({
  open,
  onClose,
  students,
  books,
  initialUsn,
  initialBookId,
  onSubmit,
}: IssueBookModalProps) {
  const availableBooks = books.filter((b) => !b.is_borrowed);
  const [selectedUsn, setSelectedUsn] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSelectedUsn(
        initialUsn ? String(initialUsn) : students[0] ? String(students[0].usn) : ''
      );
      setSelectedBookId(
        initialBookId
          ? String(initialBookId)
          : availableBooks[0]
            ? String(availableBooks[0].book_id)
            : ''
      );
    }
  }, [open, initialUsn, initialBookId, students, books]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUsn || !selectedBookId) {
      setError('Please select both a student and an available book.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        usn: Number(selectedUsn),
        book_id: Number(selectedBookId),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-book-title"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 id="issue-book-title" className="text-base font-semibold text-slate-900">
            Issue Book to Student
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="issue-student" className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Student
            </label>
            <select
              id="issue-student"
              value={selectedUsn}
              onChange={(e) => setSelectedUsn(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            >
              {students.length === 0 ? (
                <option value="">No students registered</option>
              ) : (
                students.map((s) => (
                  <option key={s.usn} value={s.usn}>
                    USN {s.usn} — {s.name} ({s.department})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="issue-book" className="block text-xs font-medium text-slate-700 mb-1.5">
              Select Available Book
            </label>
            <select
              id="issue-book"
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            >
              {availableBooks.length === 0 ? (
                <option value="">All books are currently borrowed</option>
              ) : (
                availableBooks.map((b) => (
                  <option key={b.book_id} value={b.book_id}>
                    #{b.book_id} — {b.book_name} ({b.author})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || availableBooks.length === 0 || students.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? 'Issuing...' : 'Confirm Borrow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
