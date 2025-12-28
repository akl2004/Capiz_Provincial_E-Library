import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

interface Patron {
  patron_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
}

interface BookCopy {
  id: number;
  barcode: string;
  copy_number: number;
  book: {
    title: string;
    call_number: string;
  };
  borrowed_by?: Patron;
  overdue_by?: number;
  fine?: number;
}

interface ReturnFormProps {
  onSuccess: () => void;
}

const ReturnForm = ({ onSuccess }: ReturnFormProps) => {
  const [barcode, setBarcode] = useState("");
  const [bookInfo, setBookInfo] = useState<BookCopy | null>(null);
  const [showOverdueModal, setShowOverdueModal] = useState(false);

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const [modalMessage, setModalMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  // Overdue modal
  const OverdueModal = ({
    book,
    patron,
    overdue_by,
    fine,
    onClose,
    onPay,
  }: {
    book: BookCopy;
    patron: Patron;
    overdue_by: number;
    fine: number;
    onClose: () => void;
    onPay: () => void;
  }) => {
    const fullName = [
      patron.first_name,
      patron.middle_name,
      patron.last_name,
      patron.suffix,
    ]
      .filter(Boolean)
      .join(" ");

    const overdueDays = Math.max(1, Math.ceil(overdue_by));

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3 className="modal-title">⚠️ Overdue Notice</h3>

          <div className="modal-content">
            <p>
              This item is <b>OVERDUE</b> by <b>{overdueDays}</b> day
              {overdueDays > 1 ? "s" : ""}. A fine of <b>₱{fine.toFixed(2)}</b>{" "}
              (₱{(fine / overdueDays).toFixed(2)}/day) has been applied. Pay
              fine to proceed.
            </p>

            <hr className="modal-divider" />

            <div className="modal-info">
              <p>
                <b>Title:</b> {book.book.title}
              </p>
              <p>
                <b>Copy Number:</b> {book.copy_number}
              </p>
              <p>
                <b>Borrower:</b> {fullName}
              </p>
            </div>

            <div className="form-actions">
              <button className="submit-btn" onClick={onPay}>
                Pay Fine
              </button>
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    document.title = "Return Form";
  }, []);

  useEffect(() => {
    if (!barcode) {
      setBookInfo(null);
      setSearchError(false);
      return;
    }

    // Don't search if we already have this exact barcode's info
    if (bookInfo && bookInfo.barcode === barcode) return;

    setSearching(true);
    setSearchError(false);

    const delayDebounce = setTimeout(() => {
      fetchBookByBarcode();
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [barcode]);

  const fetchBookByBarcode = () => {
    AxiosInstance.get(`/circulations/borrowed-book/${barcode}`)
      .then((res) => {
        setBookInfo(res.data);
        setSearchError(false);
        if (res.data.fine && res.data.fine > 0) {
          setShowOverdueModal(true);
        }
      })
      .catch((err) => {
        setBookInfo(null);
        setSearchError(true);
        if (barcode.length > 3) {
          setModalMessage({
            type: "error",
            message:
              err.response?.data?.message || "Book not found or not borrowed!",
          });
        }
      })
      .finally(() => setSearching(false));
  };

  const handleReturn = () => {
    if (!bookInfo) return;

    AxiosInstance.post("/circulations/return", { book_copy_id: bookInfo.id })
      .then(() => {
        setModalMessage({
          type: "success",
          message: "Book returned successfully!",
        });

        setTimeout(() => {
          const role = localStorage.getItem("role")?.toLowerCase();
          const target =
            role === "admin" ? "/admin/circulation" : "/staff/circulation";
          onSuccess();
          navigate(target);
        }, 1500);
      })
      .catch((err: any) => {
        setModalMessage({
          type: "error",
          message: err.response?.data?.message || "Something went wrong.",
        });
      });
  };

  const handlePayFine = () => {
    if (!bookInfo?.borrowed_by || !bookInfo.fine) return;

    AxiosInstance.post("/patrons/pay-fine", {
      patron_id: bookInfo.borrowed_by.patron_id,
      amount: bookInfo.fine,
    })
      .then(() => {
        setBookInfo({ ...bookInfo, fine: 0, overdue_by: 0 });
        setShowOverdueModal(false);
        setModalMessage({
          type: "success",
          message: "Fine paid successfully!",
        });
      })
      .catch(() => {
        setModalMessage({ type: "error", message: "Failed to pay fine." });
      });
  };

  const fullName = bookInfo?.borrowed_by
    ? [
        bookInfo.borrowed_by.first_name,
        bookInfo.borrowed_by.middle_name,
        bookInfo.borrowed_by.last_name,
        bookInfo.borrowed_by.suffix,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="issue-form-container">
      <h1 className="form-title">Return Book</h1>

      <form className="issue-form" onSubmit={(e) => e.preventDefault()}>
        {/* Barcode Search Row */}
        <div className="form-row mb-2">
          {/* UPDATED BARCODE SECTION */}
          <div className="form-group" >
            <label className="ps-2 mb-0 text-muted">
              <i className="bi bi-barcode"></i> Book Barcode
            </label>
            <div className="search-bar-wrapper">
              <input
                type="text"
                className="search-input-field"
                value={barcode}
                autoFocus
                onChange={(e) => {
                  setBarcode(e.target.value);
                  if (searchError) setSearchError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchBookByBarcode();
                  }
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
                ) : (
                  <i
                    className="bi bi-search text-muted"
                    onClick={fetchBookByBarcode}
                    style={{ cursor: "pointer" }}
                  ></i>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Structured Info Table (Matching the Reference Layout) */}
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
                  {bookInfo?.borrowed_by?.patron_id || (
                    <span className="circ-placeholder">---</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="field-label">Name</td>
                <td className="field-value">
                  {bookInfo?.borrowed_by ? (
                    <span className="success fw-bold">{fullName}</span>
                  ) : (
                    <span className="circ-placeholder">Awaiting scan...</span>
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
          <button
            type="button"
            className="confirm-btn"
            onClick={handleReturn}
            disabled={!bookInfo}
          >
            <i className="bi bi-arrow-return-left"></i> Return Book
          </button>
        </div>
      </form>

      {/* Modals */}
      {modalMessage && (
        <MessageModal
          type={modalMessage.type}
          message={modalMessage.message}
          onClose={() => setModalMessage(null)}
        />
      )}
      {showOverdueModal && bookInfo && bookInfo.fine && bookInfo.fine > 0 && (
        <OverdueModal
          book={bookInfo}
          patron={bookInfo.borrowed_by!}
          overdue_by={bookInfo.overdue_by || 0}
          fine={bookInfo.fine}
          onClose={() => setShowOverdueModal(false)}
          onPay={handlePayFine}
        />
      )}
    </div>
  );
};

export default ReturnForm;
