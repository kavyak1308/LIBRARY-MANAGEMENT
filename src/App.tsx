import { AlertCircle, Menu, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookListSection } from './components/BookListSection';
import { BorrowListSection } from './components/BorrowListSection';
import { AddBookModal, AddStudentModal, IssueBookModal } from './components/Modals';
import { OverviewSection } from './components/OverviewSection';
import { Sidebar } from './components/Sidebar';
import { StudentListSection } from './components/StudentListSection';
import type {
  ActiveTab,
  BookRecord,
  BorrowRecord,
  OverviewData,
  StudentRecord,
} from './types';

interface ApiErrorPayload {
  error?: string;
  needsConfiguration?: boolean;
}

const SECTION_TITLES: Record<ActiveTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Library Overview',
    subtitle: 'Live circulation metrics across students, catalog books, and active borrows.',
  },
  students: {
    title: 'Student List',
    subtitle: 'Directory of student USNs, departments, and current book borrowing status.',
  },
  books: {
    title: 'Book List',
    subtitle: 'Library catalog with book IDs, author details, and live availability.',
  },
  borrows: {
    title: 'Borrow List',
    subtitle: 'Transaction ledger tracking student USNs, book IDs, and return status.',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsConfiguration, setNeedsConfiguration] = useState(false);

  const [returningId, setReturningId] = useState<number | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [issueModalState, setIssueModalState] = useState<{
    open: boolean;
    usn: number | null;
    bookId: number | null;
  }>({ open: false, usn: null, bookId: null });

  const loadAllData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);
    setNeedsConfiguration(false);

    try {
      const [overviewRes, studentsRes, booksRes, borrowsRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/students'),
        fetch('/api/books'),
        fetch('/api/borrows'),
      ]);

      const responses = [overviewRes, studentsRes, booksRes, borrowsRes];
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        const body = (await failed.json().catch(() => ({}))) as ApiErrorPayload;
        if (body.needsConfiguration) {
          setNeedsConfiguration(true);
        }
        throw new Error(body.error || 'Failed to load library data from PostgreSQL.');
      }

      const [overviewData, studentsData, booksData, borrowsData] = await Promise.all([
        overviewRes.json() as Promise<OverviewData>,
        studentsRes.json() as Promise<{ students: StudentRecord[] }>,
        booksRes.json() as Promise<{ books: BookRecord[] }>,
        borrowsRes.json() as Promise<{ borrows: BorrowRecord[] }>,
      ]);

      setOverview(overviewData);
      setStudents(studentsData.students);
      setBooks(booksData.books);
      setBorrows(borrowsData.borrows);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to connect to the database.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData(false);
  }, [loadAllData]);

  useEffect(() => {
    if (!actionBanner) return;
    const timer = window.setTimeout(() => setActionBanner(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionBanner]);

  const handleReturnBook = async (transactionId: number) => {
    setReturningId(transactionId);
    try {
      const res = await fetch(`/api/borrows/${transactionId}/return`, {
        method: 'PATCH',
      });
      const body = (await res.json().catch(() => ({}))) as ApiErrorPayload;
      if (!res.ok) {
        throw new Error(body.error || 'Could not mark book as returned.');
      }
      setActionBanner({
        type: 'success',
        message: `Transaction #${transactionId} marked as returned.`,
      });
      await loadAllData(true);
    } catch (err) {
      setActionBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Return update failed.',
      });
    } finally {
      setReturningId(null);
    }
  };

  const handleAddStudent = async (payload: {
    usn?: number;
    name: string;
    department: string;
  }) => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as ApiErrorPayload;
    if (!res.ok) {
      throw new Error(body.error || 'Could not add student.');
    }
    setActionBanner({
      type: 'success',
      message: `Student ${payload.name} added to directory.`,
    });
    await loadAllData(true);
  };

  const handleAddBook = async (payload: {
    book_id?: number;
    book_name: string;
    author: string;
  }) => {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as ApiErrorPayload;
    if (!res.ok) {
      throw new Error(body.error || 'Could not add book.');
    }
    setActionBanner({
      type: 'success',
      message: `Book "${payload.book_name}" added to catalog.`,
    });
    await loadAllData(true);
  };

  const handleIssueBook = async (payload: { usn: number; book_id: number }) => {
    const res = await fetch('/api/borrows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as ApiErrorPayload;
    if (!res.ok) {
      throw new Error(body.error || 'Could not issue book.');
    }
    setActionBanner({
      type: 'success',
      message: `Book #${payload.book_id} issued to student USN ${payload.usn}.`,
    });
    await loadAllData(true);
  };

  const suggestedUsn = useMemo(() => {
    if (students.length === 0) return 101;
    return Math.max(...students.map((s) => s.usn)) + 1;
  }, [students]);

  const suggestedBookId = useMemo(() => {
    if (books.length === 0) return 201;
    return Math.max(...books.map((b) => b.book_id)) + 1;
  }, [books]);

  const activeBorrowsCount = useMemo(
    () => borrows.filter((b) => !b.return_status).length,
    [borrows]
  );

  const currentHeader = SECTION_TITLES[activeTab];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          students: students.length,
          books: books.length,
          activeBorrows: activeBorrowsCount,
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-400 hidden sm:inline">Library</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-display font-semibold text-slate-900 truncate">
                {currentHeader.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void loadAllData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIssueModalState({ open: true, usn: null, bookId: null })}
              disabled={needsConfiguration}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Book</span>
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {currentHeader.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{currentHeader.subtitle}</p>
            </div>
          </div>

          {actionBanner && (
            <div
              role="status"
              className={`px-4 py-3 text-xs font-medium rounded-lg border flex items-center justify-between gap-4 ${
                actionBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <span>{actionBanner.message}</span>
              <button
                type="button"
                onClick={() => setActionBanner(null)}
                className="underline underline-offset-2 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {errorMessage ? (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {needsConfiguration
                      ? 'PostgreSQL Secret Required'
                      : 'Database Connection Error'}
                  </h2>
                  <p className="text-sm text-slate-600">{errorMessage}</p>
                  {needsConfiguration && (
                    <p className="text-xs text-slate-500">
                      Add your PostgreSQL connection string as <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">DATABASE_URL</code> in Settings → Secrets, then click Retry Connection.
                    </p>
                  )}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => void loadAllData(true)}
                      className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewSection
                  data={overview}
                  loading={loading}
                  onNavigate={setActiveTab}
                  onReturnBook={handleReturnBook}
                  returningId={returningId}
                />
              )}
              {activeTab === 'students' && (
                <StudentListSection
                  students={students}
                  loading={loading}
                  onOpenAddStudent={() => setAddStudentOpen(true)}
                  onIssueToStudent={(usn) =>
                    setIssueModalState({ open: true, usn, bookId: null })
                  }
                  onReturnBook={handleReturnBook}
                  returningId={returningId}
                />
              )}
              {activeTab === 'books' && (
                <BookListSection
                  books={books}
                  loading={loading}
                  onOpenAddBook={() => setAddBookOpen(true)}
                  onIssueBook={(bookId) =>
                    setIssueModalState({ open: true, usn: null, bookId })
                  }
                  onReturnBook={handleReturnBook}
                  returningId={returningId}
                />
              )}
              {activeTab === 'borrows' && (
                <BorrowListSection
                  borrows={borrows}
                  loading={loading}
                  onOpenIssueModal={() =>
                    setIssueModalState({ open: true, usn: null, bookId: null })
                  }
                  onReturnBook={handleReturnBook}
                  returningId={returningId}
                />
              )}
            </>
          )}
        </main>
      </div>

      <AddStudentModal
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        suggestedUsn={suggestedUsn}
        onSubmit={handleAddStudent}
      />

      <AddBookModal
        open={addBookOpen}
        onClose={() => setAddBookOpen(false)}
        suggestedBookId={suggestedBookId}
        onSubmit={handleAddBook}
      />

      <IssueBookModal
        open={issueModalState.open}
        onClose={() => setIssueModalState({ open: false, usn: null, bookId: null })}
        students={students}
        books={books}
        initialUsn={issueModalState.usn}
        initialBookId={issueModalState.bookId}
        onSubmit={handleIssueBook}
      />
    </div>
  );
}
