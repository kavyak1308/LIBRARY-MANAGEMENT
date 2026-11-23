import { ArrowRight } from 'lucide-react';
import type { ActiveTab, OverviewData } from '../types';

interface OverviewSectionProps {
  data: OverviewData | null;
  loading: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onReturnBook: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function OverviewSection({
  data,
  loading,
  onNavigate,
  onReturnBook,
  returningId,
}: OverviewSectionProps) {
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-5 animate-pulse"
            >
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="mt-3 h-8 w-16 bg-slate-200 rounded" />
              <div className="mt-3 h-3 w-36 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5 h-64 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { metrics, departments, recentBorrows } = data;

  return (
    <div className="space-y-6">
      {/* 4-column summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Registered Students</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {metrics.totalStudents}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="tabular-nums">
              {metrics.studentsBorrowing} borrowing · {metrics.studentsNotBorrowing} clear
            </span>
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Library Catalog</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-slate-900 tabular-nums">
              {metrics.totalBooks}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="tabular-nums">
              {metrics.booksAvailable} available · {metrics.booksBorrowed} out
            </span>
            <button
              type="button"
              onClick={() => onNavigate('books')}
              className="text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Active Borrows</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-amber-700 tabular-nums">
              {metrics.activeBorrows}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Pending return</span>
            <button
              type="button"
              onClick={() => onNavigate('borrows')}
              className="text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Completed Returns</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-emerald-700 tabular-nums">
              {metrics.returnedBorrows}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="tabular-nums">{metrics.totalTransactions} total records</span>
            <button
              type="button"
              onClick={() => onNavigate('borrows')}
              className="text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              History <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main split: Recent Circulation + Department Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Circulation</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest borrow and return transactions recorded in PostgreSQL
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('borrows')}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0"
            >
              Full Borrow List
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Book</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Return Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentBorrows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-slate-500">
                      No borrow records found.
                    </td>
                  </tr>
                ) : (
                  recentBorrows.map((row) => (
                    <tr key={row.transaction_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                        #{row.transaction_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{row.student_name}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          USN {row.usn} · {row.department}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{row.book_name}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums">
                          Book #{row.book_id}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDate(row.borrow_date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {row.return_status ? (
                          <span className="text-xs font-medium text-emerald-700">Returned</span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">Not Returned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {row.return_status ? (
                          <span className="text-xs text-slate-400">Completed</span>
                        ) : (
                          <button
                            type="button"
                            disabled={returningId === row.transaction_id}
                            onClick={() => void onReturnBook(row.transaction_id)}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded border border-blue-200 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {returningId === row.transaction_id ? 'Updating...' : 'Mark Returned'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Students by Department</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active borrowers across academic departments
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {departments.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No department records available.
              </div>
            ) : (
              departments.map((dept) => {
                const ratio =
                  dept.student_count > 0
                    ? Math.round((dept.borrowing_count / dept.student_count) * 100)
                    : 0;
                return (
                  <div key={dept.department} className="px-5 py-3.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">{dept.department}</span>
                      <span className="font-mono text-xs text-slate-600 tabular-nums">
                        {dept.borrowing_count} / {dept.student_count} borrowing
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full transition-all"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
