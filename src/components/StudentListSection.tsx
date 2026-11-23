import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { StudentRecord } from '../types';

interface StudentListSectionProps {
  students: StudentRecord[];
  loading: boolean;
  onOpenAddStudent: () => void;
  onIssueToStudent: (usn: number) => void;
  onReturnBook: (transactionId: number) => Promise<void>;
  returningId: number | null;
}

type BorrowFilter = 'all' | 'borrowed' | 'not_borrowed';

export function StudentListSection({
  students,
  loading,
  onOpenAddStudent,
  onIssueToStudent,
  onReturnBook,
  returningId,
}: StudentListSectionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorrowFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (s.department) set.add(s.department);
    }
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((student) => {
      if (statusFilter === 'borrowed' && !student.has_borrowed) return false;
      if (statusFilter === 'not_borrowed' && student.has_borrowed) return false;
      if (departmentFilter !== 'all' && student.department !== departmentFilter) return false;
      if (!q) return true;
      return (
        String(student.usn).includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.department.toLowerCase().includes(q) ||
        student.active_books.some((b) => b.book_name.toLowerCase().includes(q))
      );
    });
  }, [students, search, statusFilter, departmentFilter]);

  const borrowedCount = useMemo(
    () => students.filter((s) => s.has_borrowed).length,
    [students]
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
              placeholder="Search USN, name, or department..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg w-64 sm:w-72 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            role="group"
            aria-label="Filter students by borrow status"
          >
            {(
              [
                { id: 'all', label: `All (${students.length})` },
                { id: 'borrowed', label: `Borrowed (${borrowedCount})` },
                { id: 'not_borrowed', label: `Not Borrowed (${students.length - borrowedCount})` },
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

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-blue-700"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenAddStudent}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th className="py-3 px-5">Student USN</th>
              <th className="py-3 px-5">Student Name</th>
              <th className="py-3 px-5">Department</th>
              <th className="py-3 px-5">Borrow Status</th>
              <th className="py-3 px-5">Currently Held Book</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading && students.length === 0 ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-5"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-4 w-40 bg-slate-100 rounded" /></td>
                  <td className="py-3.5 px-5"><div className="h-7 w-20 bg-slate-100 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 px-5 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No matching students found
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {students.length === 0
                      ? 'Add your first student record to start tracking library circulation.'
                      : 'Try clearing your search query or changing the status filter.'}
                  </p>
                  {(search || statusFilter !== 'all' || departmentFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('all');
                        setDepartmentFilter('all');
                      }}
                      className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((student) => (
                <tr key={student.usn} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold text-slate-700 tabular-nums">
                    {student.usn}
                  </td>
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    {student.name}
                  </td>
                  <td className="py-3.5 px-5 text-slate-600">{student.department}</td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {student.has_borrowed ? (
                      <span className="text-xs font-semibold text-amber-700">
                        Borrowed ({student.active_borrow_count})
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-700">
                        Not Borrowed
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    {student.active_books.length === 0 ? (
                      <span className="text-xs text-slate-400">No active book</span>
                    ) : (
                      <div className="space-y-1">
                        {student.active_books.map((book) => (
                          <div
                            key={book.transaction_id}
                            className="flex items-center gap-2 text-xs text-slate-700"
                          >
                            <span className="font-mono text-slate-500 tabular-nums">
                              #{book.book_id}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-800">{book.book_name}</span>
                            <button
                              type="button"
                              disabled={returningId === book.transaction_id}
                              onClick={() => void onReturnBook(book.transaction_id)}
                              className="ml-2 text-blue-700 hover:text-blue-900 underline underline-offset-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                              {returningId === book.transaction_id ? 'Returning...' : 'Return'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onIssueToStudent(student.usn)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-md transition-colors whitespace-nowrap shrink-0"
                    >
                      Issue Book
                    </button>
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
