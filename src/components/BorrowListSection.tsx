import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BorrowRecord } from '../types';

interface BorrowListSectionProps {
  borrows: BorrowRecord[];
  loading: boolean;
  onOpenIssueModal: () => void;
  onReturnBook: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

type ReturnFilter = 'all' | 'borrowed' | 'returned';

function formatBorrowDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BorrowListSection({
  borrows,
  loading,
  onOpenIssueModal,
  onReturnBook,
  returningId,
}: BorrowListSectionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrows.filter((row) => {
      if (statusFilter === 'borrowed' && row.return_status) return false;
      if (statusFilter === 'returned' && !row.return_status) return false;
      if (!q) return true;
      return (
        String(row.transaction_id).includes(q) ||
        String(row.usn).includes(q) ||
        String(row.book_id).includes(q) ||
        row.student_name.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.book_name.toLowerCase().includes(q)
      );
    });
  }, [borrows, search, statusFilter]);

  const unreturnedCount = useMemo(
    () => borrows.filter((b) => !b.return_status).length,
    [borrows]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, USN, or Book ID..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg w-64 sm:w-72 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Filter borrows by return status"
          >
            {(
              [
                { id: 'all', label: `All Records (${borrows.length})` },
                { id: 'borrowed', label: `Not Returned (${unreturnedCount})` },
                { id: 'returned', label: `Returned (${borrows.length - unreturnedCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenIssueModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Issue Book</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th className="py-3 px-5">Tx ID</th>
              <th className="py-3 px-5">Student (USN & Name)</th>
              <th className="py-3 px-5">Book ID & Title</th>
              <th className="py-3 px-5">Borrow Date</th>
              <th className="py-3 px-5">Return Status</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading && borrows.length === 0 ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-5"><div className="h-4 w-10 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-40 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-44 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-7 w-24 bg-slate-100 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-5 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No borrow transactions found
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {borrows.length === 0
                      ? 'Issue a book to record the first circulation transaction.'
                      : 'Try clearing your search filter to see all transactions.'}
                  </p>
                  {(search || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('all');
                      }}
                      className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.transaction_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-600 tabular-nums">
                    #{row.transaction_id}
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-slate-900">{row.student_name}</div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                      USN {row.usn} · {row.department}
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                        #{row.book_id}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-medium text-slate-900">{row.book_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{row.author}</div>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {formatBorrowDate(row.borrow_date)}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {row.return_status ? (
                      <span className="text-xs font-medium text-emerald-700">
                        Returned (True)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">
                        Not Returned (False)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {row.return_status ? (
                      <span className="text-xs text-slate-400">Returned</span>
                    ) : (
                      <button
                        type="button"
                        disabled={returningId === row.transaction_id}
                        onClick={() => void onReturnBook(row.transaction_id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50/60 border border-blue-200 hover:border-blue-300 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
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
    </div>
  );
}
