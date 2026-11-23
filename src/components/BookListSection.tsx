import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BookRecord } from '../types';

interface BookListSectionProps {
  books: BookRecord[];
  loading: boolean;
  onOpenAddBook: () => void;
  onIssueBook: (bookId: number) => void;
  onReturnBook: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

type BookFilter = 'all' | 'borrowed' | 'available';

export function BookListSection({
  books,
  loading,
  onOpenAddBook,
  onIssueBook,
  onReturnBook,
  returningId,
}: BookListSectionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookFilter>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      if (statusFilter === 'borrowed' && !book.is_borrowed) return false;
      if (statusFilter === 'available' && book.is_borrowed) return false;
      if (!q) return true;
      return (
        String(book.book_id).includes(q) ||
        book.book_name.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.current_borrower?.student_name.toLowerCase().includes(q) ?? false) ||
        (book.current_borrower ? String(book.current_borrower.usn).includes(q) : false)
      );
    });
  }, [books, search, statusFilter]);

  const borrowedCount = useMemo(
    () => books.filter((b) => b.is_borrowed).length,
    [books]
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
              placeholder="Search Book ID, title, or author..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg w-64 sm:w-72 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Filter books by borrow status"
          >
            {(
              [
                { id: 'all', label: `All Books (${books.length})` },
                { id: 'borrowed', label: `With Borrowed (${borrowedCount})` },
                { id: 'available', label: `Without Borrowed (${books.length - borrowedCount})` },
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
          onClick={onOpenAddBook}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Book</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th className="py-3 px-5">Book ID</th>
              <th className="py-3 px-5">Book Name</th>
              <th className="py-3 px-5">Book Details (Author)</th>
              <th className="py-3 px-5">Borrow Status</th>
              <th className="py-3 px-5">Current Holder</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading && books.length === 0 ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-5"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-44 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-36 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-7 w-24 bg-slate-100 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-5 text-center">
                  <p className="text-sm font-medium text-slate-700">No matching books found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {books.length === 0
                      ? 'Add your first book to populate the library catalog.'
                      : 'Try clearing your search query or switching the borrow filter.'}
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
              filtered.map((book) => (
                <tr key={book.book_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                    {book.book_id}
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    {book.book_name}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">
                    <div>{book.author}</div>
                    <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                      {book.total_borrow_count} total checkout{book.total_borrow_count === 1 ? '' : 's'}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {book.is_borrowed ? (
                      <span className="text-xs font-semibold text-amber-700">Borrowed</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">
                        Available (Not Borrowed)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    {book.current_borrower ? (
                      <div className="text-xs text-slate-700">
                        <span className="font-medium text-slate-900">
                          {book.current_borrower.student_name}
                        </span>
                        <span className="mx-1.5 text-slate-400" aria-hidden="true">·</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          USN {book.current_borrower.usn} ({book.current_borrower.department})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">On shelf</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    {book.is_borrowed && book.current_borrower ? (
                      <button
                        type="button"
                        disabled={returningId === book.current_borrower.transaction_id}
                        onClick={() => void onReturnBook(book.current_borrower!.transaction_id)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50/50 border border-blue-200 hover:border-blue-300 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        {returningId === book.current_borrower.transaction_id
                          ? 'Updating...'
                          : 'Mark Returned'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onIssueBook(book.book_id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        Issue Book
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
