import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

interface Patron {
  id: number;
  patron_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  status: "Active" | "Deactivated" | "Blocked";
}

interface BookCopy {
  id: number;
  barcode: string;
  copy_number: number;
  status: "Available" | "Issued";
  book: {
    title: string;
    call_number: string;
  };
}

interface IssueFormProps {
  onSuccess?: () => void;
}

const IssueForm = ({ onSuccess }: IssueFormProps) => {
  const [patronId, setPatronId] = useState("");
  const [patronInfo, setPatronInfo] = useState<Patron | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<BookCopy[]>([]);
  const [barcode, setBarcode] = useState("");

  const [policy, setPolicy] = useState({
    loan_days: 5,
    due_date_preview: "",
    max_items: 3,
    borrow_limit: 5,
    current_borrowed: 0,
    allowed_today: 0,
  });

  const [searching, setSearching] = useState(false);
  const [modalMessage, setModalMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const navigate = useNavigate();

  // 1. Fetch Patron and their specific borrowing policy
  useEffect(() => {
    if (!patronId) {
      setPatronInfo(null);
      return;
    }
    const delayDebounce = setTimeout(() => {
      AxiosInstance.get(`/patrons/by-id/${patronId}`)
        .then((res) => {
          setPatronInfo(res.data);
          // Immediately check policy for this specific patron
          return AxiosInstance.get(`/circulations/borrowing-policy`, {
            params: { patron_id: res.data.patron_id },
          });
        })
        .then((policyRes) => {
          if (policyRes) setPolicy(policyRes.data);
        })
        .catch(() => setPatronInfo(null));
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [patronId]);

  // 2. Logic: Can they add more books right now?
  const canScanMore =
    patronInfo &&
    selectedBooks.length < policy.allowed_today &&
    policy.current_borrowed + selectedBooks.length < policy.borrow_limit;

  // 3. Handle Book Scanning
  useEffect(() => {
    if (!barcode) return;

    if (!canScanMore) {
      const msg =
        selectedBooks.length >= policy.allowed_today
          ? "Daily transaction limit reached."
          : "Patron total borrow limit reached.";
      setModalMessage({ type: "error", message: msg });
      setBarcode("");
      return;
    }

    setSearching(true);
    const delayDebounce = setTimeout(() => {
      AxiosInstance.get(`/books/copy/${barcode}`)
        .then((res) => {
          const book = res.data;
          if (selectedBooks.find((b) => b.barcode === barcode)) {
            setModalMessage({
              type: "error",
              message: "Book already in list.",
            });
          } else if (book.status !== "Available") {
            setModalMessage({
              type: "error",
              message: `Book is ${book.status}`,
            });
          } else {
            setSelectedBooks((prev) => [...prev, book]);
            setBarcode("");
          }
        })
        .catch(() =>
          setModalMessage({ type: "error", message: "Book not found" })
        )
        .finally(() => setSearching(false));
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [barcode, selectedBooks, canScanMore, policy]);

  const removeBook = (id: number) => {
    setSelectedBooks(selectedBooks.filter((b) => b.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patronInfo || selectedBooks.length === 0) return;

    AxiosInstance.post("/circulations/borrow", {
      patron_id: patronInfo.patron_id,
      book_copy_ids: selectedBooks.map((b) => b.id),
    })
      .then(() => {
        setModalMessage({
          type: "success",
          message: "Books issued successfully!",
        });
        setTimeout(() => {
          const role = localStorage.getItem("role")?.toLowerCase();
          const target =
            role === "admin" ? "/admin/circulation" : "/staff/circulation";
          if (onSuccess) onSuccess();
          navigate(target);
        }, 1500);
      })
      .catch((err) =>
        setModalMessage({
          type: "error",
          message: err.response?.data?.message || "Error",
        })
      );
  };

  return (
    <div className="issue-form-container">
      <h1 className="form-title">Issue Books</h1>

      {/* PATRON INFO SECTION */}
      <div className="details-card shadow-sm mb-4">
        <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
          <span className="fw-bold text-uppercase small text-muted">
            Borrower Information
          </span>
          {patronInfo && (
            <div className="d-flex gap-2">
              <span className="badge bg-info text-dark">
                At Home: {policy.current_borrowed}
              </span>
              <span className="badge bg-secondary">
                Limit: {policy.borrow_limit}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="row align-items-center">
            <div className="col-md-4">
              <label className="text-muted small">Patron ID</label>
              <input
                type="text"
                className="form-control"
                value={patronId}
                onChange={(e) => setPatronId(e.target.value)}
                placeholder="Scan ID..."
              />
            </div>
            <div className="col-md-8">
              <label className="text-muted small">Name</label>
              <div
                className={`form-control-plaintext fw-bold ${
                  patronInfo ? "text-success" : "text-danger"
                }`}
              >
                {patronInfo
                  ? `${patronInfo.first_name} ${patronInfo.last_name}`
                  : "Enter valid Patron ID"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCANNING INPUT */}
      <div className="search-bar-wrapper mb-4">
        <input
          type="text"
          className="search-input-field"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          disabled={!canScanMore && !!patronInfo}
          placeholder={
            !patronInfo
              ? "Search Patron First..."
              : !canScanMore
              ? "Limit reached for this patron"
              : "Scan book barcode..."
          }
        />
        <div className="search-status-inside">
          {searching ? (
            <div className="custom-loading-bars">
              <div className="loading-bar"></div>
              <div className="loading-bar"></div>
              <div className="loading-bar"></div>
            </div>
          ) : canScanMore ? (
            <i className="bi bi-barcode text-muted"></i>
          ) : selectedBooks.length >= policy.max_items ? (
            <i className="bi bi-lock-fill text-warning"></i>
          ) : (
            <i className="bi bi-search text-muted"></i>
          )}
        </div>
      </div>

      {/* BOOK GRID */}
      <div className="book-cards-grid">
        {selectedBooks.map((book, index) => (
          <div
            key={book.id}
            className="details-card shadow-sm mb-3 border-start border-primary border-4"
          >
            <div className="d-flex justify-content-between align-items-center p-2 bg-light border-bottom">
              <span className="badge bg-primary">Item {index + 1}</span>
              <button
                onClick={() => removeBook(book.id)}
                className="btn btn-sm btn-outline-danger border-0"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="p-3">
              <div className="row">
                <div className="col-8">
                  <h6 className="mb-1 text-truncate">{book.book.title}</h6>
                  <p className="text-muted small mb-0">
                    {book.barcode} | {book.book.call_number}
                  </p>
                </div>
                <div className="col-4 text-end">
                  <small className="text-muted d-block">Due Date</small>
                  <span className="fw-bold text-primary">
                    {new Date(policy.due_date_preview).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-actions mt-4">
        <button
          onClick={handleSubmit}
          className="confirm-btn"
          disabled={selectedBooks.length === 0 || !patronInfo}
        >
          Confirm Loan for {selectedBooks.length} Books
        </button>
      </div>

      {modalMessage && (
        <MessageModal
          type={modalMessage.type}
          message={modalMessage.message}
          onClose={() => setModalMessage(null)}
        />
      )}
    </div>
  );
};

export default IssueForm;
