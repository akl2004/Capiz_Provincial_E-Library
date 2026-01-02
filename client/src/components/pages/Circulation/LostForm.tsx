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
  price: number;
  copy_number: number;
  book: {
    title: string;
    call_number: string;
  };
  borrowed_by?: Patron;
  overdue_by?: number;
  fine?: number;
}

interface LostFormProps {
  onSuccess: () => void;
}

const LostForm = ({ onSuccess }: LostFormProps) => {
  const [barcode, setBarcode] = useState("");
  const [bookInfo, setBookInfo] = useState<BookCopy | null>(null);
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [settlementType, setSettlementType] = useState<
    "payment" | "replacement"
  >("payment");

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [modalMessage, setModalMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  // Load the processing fee setting on mount
  useEffect(() => {
    AxiosInstance.get("/settings/lost-fee")
      .then((res) => setProcessingFee(res.data.lost_book_processing_fee))
      .catch(() => console.error("Could not load processing fee"));
  }, []);

  useEffect(() => {
    if (!barcode) {
      setBookInfo(null);
      setSearchError(false);
      return;
    }
    const delayDebounce = setTimeout(() => fetchBookByBarcode(), 600);
    return () => clearTimeout(delayDebounce);
  }, [barcode]);

  const fetchBookByBarcode = () => {
    setSearching(true);
    AxiosInstance.get(`/circulations/borrowed-book/${barcode}`)
      .then((res) => {
        setBookInfo(res.data);
        setSearchError(false);
      })
      .catch(() => {
        setBookInfo(null);
        setSearchError(true);
      })
      .finally(() => setSearching(false));
  };

  const handleMarkAsLost = () => {
    if (!bookInfo) return;

    AxiosInstance.post("/circulations/mark-lost", {
      book_copy_id: bookInfo.id,
      settlement_type: settlementType,
    })
      .then((res) => {
        setModalMessage({
          type: "success",
          message: `Book marked as Lost. Total: ₱${res.data.total_bill.toFixed(
            2
          )}`,
        });

        setTimeout(() => {
          const role = localStorage.getItem("role")?.toLowerCase();
          if (settlementType === "replacement" && res.data.book_id) {
            navigate(`/${role}/cataloging/${res.data.book_id}`);
          } else {
            navigate(
              role === "admin" ? "/admin/circulation" : "/staff/circulation"
            );
          }
          onSuccess();
        }, 2000);
      })
      .catch((err) => {
        setModalMessage({
          type: "error",
          message: err.response?.data?.message || "Failed to update status.",
        });
      });
  };

  const fullName = bookInfo?.borrowed_by
    ? [
        bookInfo.borrowed_by.first_name,
        bookInfo.borrowed_by.middle_name,
        bookInfo.borrowed_by.last_name,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="issue-form-container">
      <h1 className="form-title text-danger">Report Lost Book</h1>

      <form className="issue-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-row mb-2">
          <div className="form-group">
            <label className="ps-2 mb-0 text-muted">
              <i className="bi bi-barcode"></i> Book Barcode
            </label>
            <div className="search-bar-wrapper">
              <input
                type="text"
                className="search-input-field"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan lost book barcode..."
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

        <div className="details-card shadow-sm border-top border-danger border-4">
          <table className="circ-table">
            <tbody>
              <tr>
                <th rowSpan={2} className="category-header">
                  BORROWER
                </th>
                <td className="field-label">Patron ID</td>
                <td className="field-value">
                  {bookInfo?.borrowed_by?.patron_id || "---"}
                </td>
              </tr>
              <tr>
                <td className="field-label">Name</td>
                <td className="field-value">
                  {fullName || "Awaiting scan..."}
                </td>
              </tr>

              <tr className="spacer-row">
                <td colSpan={3}></td>
              </tr>

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

              <tr className="spacer-row">
                <td colSpan={3}></td>
              </tr>

              <tr>
                <th rowSpan={4} className="category-header book-cat">
                  SETTLEMENT
                </th>
                <td className="field-label">Method</td>
                <td className="field-value p-0">
                  <div className="settlement-toggle">
                    <button
                      className={`toggle-btn ${
                        settlementType === "payment" ? "active" : ""
                      }`}
                      onClick={() => setSettlementType("payment")}
                    >
                      Pay Fine
                    </button>
                    <button
                      className={`toggle-btn ${
                        settlementType === "replacement" ? "active" : ""
                      }`}
                      onClick={() => setSettlementType("replacement")}
                    >
                      Replacement
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="field-label">Processing Fee</td>
                <td className="field-value fw-bold text-danger">
                  ₱{processingFee.toFixed(2)}
                </td>
              </tr>
              {settlementType === "payment" && (
                <tr>
                  <td className="field-label">Book Price</td>
                  <td className="field-value">
                    ₱{Number(bookInfo?.price || 0).toFixed(2)}
                  </td>
                </tr>
              )}
              <tr>
                <td className="field-label">Overdue Fine</td>
                <td className="field-value">
                  ₱{(bookInfo?.fine || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {bookInfo && (
            <div className="p-3 mt-2">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Total to Pay:</span>
                <span className="fs-5 fw-bold text-danger">
                  ₱
                  {(
                    processingFee +
                    (bookInfo?.fine || 0) +
                    (settlementType === "payment"
                      ? Number(bookInfo?.price || 0)
                      : 0)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions mt-4">
          <button
            type="button"
            className="confirm-btn bg-danger"
            onClick={handleMarkAsLost}
            disabled={!bookInfo}
          >
            <i className="bi bi-exclamation-octagon me-2"></i>
            Confirm Lost (
            {settlementType === "payment" ? "Payment" : "Replacement"})
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

export default LostForm;
