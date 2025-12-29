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
  status: "Available" | "On Loan";
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

  const [barcode, setBarcode] = useState("");
  const [bookInfo, setBookInfo] = useState<BookCopy | null>(null);

  const [issueDate, setIssueDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [dueDate, setDueDate] = useState<string>("");
  const [loanDays, setLoanDays] = useState<number>(5);
  const [maxItems, setMaxItems] = useState<number>(3);
  const [borrowLimit, setBorrowLimit] = useState<number>(5);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const [modalMessage, setModalMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  const fullName = [
    patronInfo?.first_name,
    patronInfo?.middle_name,
    patronInfo?.last_name,
    patronInfo?.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    AxiosInstance.get("/settings/borrowing-policy")
      .then((res) => {
        setLoanDays(res.data.loan_days);
        setMaxItems(res.data.max_items);
        setBorrowLimit(res.data.borrow_limit);
      })
      .catch(() => {
        setLoanDays(5);
        setMaxItems(3);
        setBorrowLimit(5);
      });
  }, []);

  useEffect(() => {
    document.title = "Issue Form";
    if (!patronId) {
      setPatronInfo(null);
      return;
    }
    const delayDebounce = setTimeout(() => {
      AxiosInstance.get(`/patrons/by-id/${patronId}`)
        .then((res) => setPatronInfo(res.data))
        .catch(() => setPatronInfo(null));
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [patronId]);

  // Auto-search for book when barcode changes
  useEffect(() => {
    if (!barcode) {
      setBookInfo(null);
      setSearchError(false);
      return;
    }

    setSearching(true);
    setSearchError(false);

    const delayDebounce = setTimeout(() => {
      AxiosInstance.get(`/books/copy/${barcode}`)
        .then((res) => {
          const status = res.data.status;

          // 🚨 ADD LOST STATUS CHECK HERE 🚨
          if (status === "Lost") {
            setBookInfo(null);
            setSearchError(true);
            setModalMessage({
              type: "error",
              message:
                "This book is marked as LOST.",
            });
          } else if (status === "On Loan") {
            setBookInfo(null);
            setSearchError(true);
            setModalMessage({
              type: "error",
              message: "This book copy is currently borrowed.",
            });
          } else {
            setBookInfo(res.data);
            setSearchError(false);
          }
        })
        .catch(() => {
          setBookInfo(null);
          setSearchError(true);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [barcode]);

  useEffect(() => {
    if (issueDate && loanDays) {
      const issue = new Date(issueDate);
      issue.setDate(issue.getDate() + loanDays);
      setDueDate(issue.toISOString().split("T")[0]);
    }
  }, [issueDate, loanDays]);

  const fetchBookByBarcode = () => {
    if (!barcode) return;
    AxiosInstance.get(`/books/copy/${barcode}`)
      .then((res) => {
        if (res.data.status === "On Loan") {
          setBookInfo(null);
          setModalMessage({
            type: "error",
            message: "This book copy is currently borrowed and unavailable.",
          });
        } else {
          setBookInfo(res.data);
        }
      })
      .catch(() => {
        setBookInfo(null);
        setModalMessage({
          type: "error",
          message: "Book not found!",
        });
      });
  };

  // checks patron for borrowing policy
  useEffect(() => {
    if (!patronInfo) return;

    AxiosInstance.get(`/circulations/borrowing-policy`, {
      params: { patron_id: patronInfo.patron_id },
    })
      .then((res) => {
        if (res.data && !res.data.can_borrow) {
          setModalMessage({
            type: "error",
            message: res.data.message,
          });
        }
      })
      .catch((err) => {
        const backendMessage = err.response?.data?.message;
        if (backendMessage) {
          setModalMessage({
            type: "error",
            message: backendMessage,
          });
        }
      });
  }, [patronInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patronInfo || !bookInfo || !issueDate) {
      setModalMessage({ type: "error", message: "Please fill all fields!" });
      return;
    }

    AxiosInstance.post("/circulations/borrow", {
      patron_id: patronInfo.patron_id,
      book_copy_id: bookInfo.id,
    })
      .then(() => {
        setModalMessage({
          type: "success",
          message: "Book issued successfully!",
        });

        setTimeout(() => {
          const role = localStorage.getItem("role")?.toLowerCase();
          const target =
            role === "admin" ? "/admin/circulation" : "/staff/circulation";

          navigate(target);

          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      })
      .catch((err: any) => {
        if (err.response) {
          const serverMessage = err.response.data?.message;

          if (serverMessage) {
            setModalMessage({
              type: "error",
              message:
                typeof serverMessage === "string"
                  ? serverMessage
                  : "An error occurred",
            });
          } else if (err.response.status === 403) {
            setModalMessage({
              type: "error",
              message: "Cannot issue book: Patron is deactivated or blocked.",
            });
          } else {
            setModalMessage({
              type: "error",
              message: "Something went wrong. Please try again.",
            });
          }
        } else {
          setModalMessage({
            type: "error",
            message: "Network error or server not reachable.",
          });
        }
      });
  };

  return (
    <div className="issue-form-container">
      <h1 className="form-title">Issue Book</h1>

      <form onSubmit={handleSubmit} className="issue-form">
        {/* Top Section: Inputs & Dates */}
        <div className="form-row mb-2">
          <div className="form-group flex-grow-1">
            <label className="ps-2 mb-0 text-muted">
              <i className="bi bi-barcode"></i> Book Barcode
            </label>
            <div className="search-bar-wrapper">
              <input
                type="text"
                className="search-input-field"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                placeholder="Scan or enter barcode..."
              />

              <div className="search-status-inside">
                {searching ? (
                  <div className="custom-loading-bars">
                    <div className="loading-bar"></div>
                    <div className="loading-bar"></div>
                    <div className="loading-bar"></div>
                  </div>
                ) : bookInfo ? (
                  <i className="bi bi-check-circle-fill text-success fade-in"></i>
                ) : searchError ? (
                  <i className="bi bi-x-circle-fill text-danger fade-in"></i>
                ) : null}
              </div>
            </div>
          </div>

          <div className="date-row">
            <div className="date-field">
              <label htmlFor="issue_date" className="ps-2 mb-0 text-muted">
                Issue Date
              </label>
              <input
                type="date"
                className="form-control"
                id="issue_date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled
              />
            </div>
            <div className="date-field">
              <label htmlFor="due_date" className="ps-2 mb-0 text-muted">
                Due Date
              </label>
              <input
                type="date"
                className="form-control"
                id="due_date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Structured Info Table (Matches Image) */}
        <div className="details-card shadow-sm">
          <table className="circ-table">
            <tbody>
              {/* BORROWER SECTION */}
              <tr>
                <th rowSpan={2} className="category-header borrower-cat">
                  BORROWER
                </th>
                <td className="field-label">Patron ID</td>
                <td className="field-value">
                  <input
                    type="text"
                    className="inline-input"
                    value={patronId}
                    onChange={(e) => setPatronId(e.target.value)}
                    placeholder="Enter ID..."
                  />
                </td>
              </tr>
              <tr>
                <td className="field-label">Name</td>
                <td className="field-value">
                  {patronInfo ? (
                    <span className="text-success fw-bold">{fullName}</span>
                  ) : patronId ? (
                    <span className="text-danger">❌ Not found</span>
                  ) : (
                    <span className="text-muted">Waiting for ID...</span>
                  )}
                </td>
              </tr>

              {/* SPACER ROW */}
              <tr className="spacer-row">
                <td colSpan={3}></td>
              </tr>

              {/* BOOK SECTION */}
              <tr>
                <th rowSpan={3} className="category-header book-cat">
                  BOOK
                </th>
                <td className="field-label">Title</td>
                <td className="field-value fw-bold">
                  {bookInfo?.book.title || "-"}
                </td>
              </tr>
              <tr>
                <td className="field-label">Call Number</td>
                <td className="field-value">
                  {bookInfo?.book.call_number || "-"}
                </td>
              </tr>
              <tr>
                <td className="field-label">Copy Number</td>
                <td className="field-value">{bookInfo?.copy_number || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action Button */}
        <div className="form-actions mt-4">
          <button type="submit" className="confirm-btn">
            <i className="bi bi-check2-circle"></i> Confirm Loan
          </button>
        </div>
      </form>

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
