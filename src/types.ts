export interface BorrowedBookSummary {
  transaction_id: number;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
}

export interface StudentRecord {
  usn: number;
  name: string;
  department: string;
  has_borrowed: boolean;
  active_borrow_count: number;
  total_borrow_count: number;
  active_books: BorrowedBookSummary[];
}

export interface CurrentBorrowerInfo {
  transaction_id: number;
  usn: number;
  student_name: string;
  department: string;
  borrow_date: string;
}

export interface BookRecord {
  book_id: number;
  book_name: string;
  author: string;
  is_borrowed: boolean;
  current_borrower: CurrentBorrowerInfo | null;
  total_borrow_count: number;
}

export interface BorrowRecord {
  transaction_id: number;
  usn: number;
  student_name: string;
  department: string;
  book_id: number;
  book_name: string;
  author: string;
  borrow_date: string;
  return_status: boolean;
}

export interface OverviewData {
  metrics: {
    totalStudents: number;
    studentsBorrowing: number;
    studentsNotBorrowing: number;
    totalBooks: number;
    booksBorrowed: number;
    booksAvailable: number;
    totalTransactions: number;
    activeBorrows: number;
    returnedBorrows: number;
  };
  departments: Array<{
    department: string;
    student_count: number;
    borrowing_count: number;
  }>;
  recentBorrows: BorrowRecord[];
}

export type ActiveTab = 'overview' | 'students' | 'books' | 'borrows';
