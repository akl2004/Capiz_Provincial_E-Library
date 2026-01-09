import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

interface Patron {
  id: string; // Internal DB ID
  patron_id: string; // Visible ID
  first_name: string;
  middle_name?: string;
  last_name: string;
}

interface BookCopy {
  id: number;
  barcode: string;
  price: number;
  copy_number: number;
  accession_no: string; // Added
  issue_date: string; // Added
  due_date: string; // Added
  days_overdue: number; // Added
  book: {
    title: string;
    call_number: string;
  };
  fine?: number;
}

interface LostFormProps {
  onSuccess: () => void;
}

const LostForm = ({ onSuccess }: LostFormProps) => {
  // States for Patron Search
  const [patronSearch, setPatronSearch] = useState("");
  const [selectedPatron, setSelectedPatron] = useState<Patron | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<BookCopy[]>([]);

  // States for Selection
  const [selectedBook, setSelectedBook] = useState<BookCopy | null>(null);
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [settlementType, setSettlementType] = useState<
    "payment" | "replacement"
  >("payment");

  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  // Load lost book fee
  useEffect(() => {
    AxiosInstance.get("/settings/lost-fee")
      .then((res) => setProcessingFee(res.data.lost_book_processing_fee))
      .catch(() => console.error("Could not load processing fee"));
  }, []);

  // Fetch Patron and their loans
  const fetchData = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      // 1. Search by the readable Patron ID (e.g., PATRON-001)
      const patronRes = await AxiosInstance.get(`/patrons/by-id/${id}`);
      const patronData = patronRes.data;
      setSelectedPatron(patronData);

      // 2. Use the database Primary Key (patronData.id) to get loans
      // This matches the new route we created in Step 2
      const loansRes = await AxiosInstance.get(
        `/circulations/active-loans/${patronData.id}`
      );
      setBorrowedBooks(loansRes.data);

      if (loansRes.data.length === 0) {
        console.warn("Patron found, but has no active loans.");
      }
    } catch (err) {
      console.error("Search failed", err);
      setSelectedPatron(null);
      setBorrowedBooks([]);
      setModalMessage({
        type: "error",
        message: "Patron not found or search failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsLost = () => {
    if (!selectedBook) return;

    AxiosInstance.post("/circulations/mark-lost", {
      book_copy_id: selectedBook.id,
      settlement_type: settlementType,
    })
      .then((res) => {
        const total = Number(res.data.total_bill).toFixed(2);
        const isReplacement = settlementType === "replacement";

        setModalMessage({
          type: "success",
          message: `Book marked as Lost. Total: ₱${total}. ${
            isReplacement
              ? "Redirecting to add new copy..."
              : "Returning to circulation..."
          }`,
        });

        setTimeout(() => {
          const role = localStorage.getItem("role")?.toLowerCase() || "staff";
          // Use the book_id returned from the server to navigate to cataloging
          if (isReplacement && res.data.book_id) {
            navigate(`/${role}/cataloging/${res.data.book_id}`);
          } else {
            navigate(`/${role}/circulation`);
          }
          onSuccess();
        }, 2500);
      })
      .catch((err) => {
        setModalMessage({
          type: "error",
          message: err.response?.data?.message || "Failed to update status.",
        });
      });
  };

  useEffect(() => {
    // Only search automatically if the input is long enough (e.g., 3 characters)
    const delayDebounceFn = setTimeout(() => {
      if (patronSearch.trim().length >= 3) {
        fetchData(patronSearch);
      }
    }, 500); // Wait 500ms after last keystroke

    return () => clearTimeout(delayDebounceFn);
  }, [patronSearch]);

  return (
    <div className="issue-form-container">
      <h1 className="form-title">Report Lost Book</h1>

      <div className="form-row mb-4">
        <div className="form-group">
          <label className="ps-2 mb-0 text-muted small fw-bold">
            <i className="bi bi-barcode"></i> PATRON ID / BARCODE
          </label>
          <div className="search-bar-wrapper">
            <input
              type="text"
              className="search-input-field"
              value={patronSearch}
              autoFocus
              onChange={(e) => {
                setPatronSearch(e.target.value);
                // Reset states so the UI "reacts" to new typing
                if (selectedPatron) setSelectedPatron(null);
                if (modalMessage) setModalMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fetchData(patronSearch);
                }
              }}
              placeholder="Scan or type ID..."
            />

            <div className="search-status-inside">
              {loading ? (
                <div className="custom-loading-bars">
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                  <div className="loading-bar"></div>
                </div>
              ) : selectedPatron ? (
                <i className="bi bi-check-circle-fill text-success fade-in"></i>
              ) : modalMessage?.type === "error" ? (
                <i className="bi bi-x-circle-fill text-danger fade-in"></i>
              ) : (
                <i className="bi bi-search text-muted"></i>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT: LOAN LIST */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-dark text-white fw-bold py-3">
              Active Loans {selectedPatron && `— ${selectedPatron.first_name}`}
            </div>
            <div
              className="list-group list-group-flush"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              {borrowedBooks.length > 0 ? (
                borrowedBooks.map((item) => (
                  <button
                    key={item.id}
                    className={`list-group-item list-group-item-action p-3 ${
                      selectedBook?.id === item.id
                        ? "bg-danger-subtle border-danger"
                        : ""
                    }`}
                    onClick={() => setSelectedBook(item)}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div
                          className={`fw-bold ${
                            selectedBook?.id === item.id
                              ? "text-danger"
                              : "text-dark"
                          }`}
                        >
                          {item.book.title}
                        </div>
                        <small className="text-muted">
                          Barcode: {item.barcode}
                        </small>
                      </div>
                      <span
                        className={`badge ${
                          item.days_overdue > 0 ? "bg-danger" : "bg-success"
                        }`}
                      >
                        {item.days_overdue > 0
                          ? `${item.days_overdue}d Overdue`
                          : "On Time"}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-5 text-center text-muted">
                  No active loans found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: SETTLEMENT CARD */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm overflow-hidden">
            <div className="card-body p-0">
              <div className="bg-danger p-3 text-white">
                <h5 className="m-0">
                  <i className="bi bi-calculator me-2"></i>Settlement Summary
                </h5>
              </div>

              <div className="p-4">
                {selectedBook ? (
                  <>
                    <div className="mb-4">
                      <label className="text-muted small fw-bold">
                        SELECTED ITEM
                      </label>
                      <h4 className="text-primary">
                        {selectedBook.book.title}
                      </h4>
                      <div className="d-flex gap-3 text-muted small">
                        <span>
                          <i className="bi bi-hash"></i> Copy {""}
                          {selectedBook.copy_number}
                        </span>
                        <span>
                          <i className="bi bi-tag"></i> {selectedBook.barcode}
                        </span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-muted small fw-bold mb-2">
                        HOW WILL THIS BE SETTLED?
                      </label>
                      <div className="btn-group w-100">
                        <input
                          type="radio"
                          className="btn-check"
                          name="stype"
                          id="p"
                          checked={settlementType === "payment"}
                          onChange={() => setSettlementType("payment")}
                        />
                        <label
                          className="btn btn-outline-danger py-2"
                          htmlFor="p"
                        >
                          <i className="bi bi-cash-stack me-2"></i>Pay for Book
                        </label>

                        <input
                          type="radio"
                          className="btn-check"
                          name="stype"
                          id="r"
                          checked={settlementType === "replacement"}
                          onChange={() => setSettlementType("replacement")}
                        />
                        <label
                          className="btn btn-outline-danger py-2"
                          htmlFor="r"
                        >
                          <i className="bi bi-book me-2"></i>Replacement
                        </label>
                      </div>
                    </div>

                    <div className="bg-light p-3 rounded border mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Processing Fee</span>
                        <span>₱{Number(processingFee).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Overdue Fines</span>
                        <span>₱{Number(selectedBook.fine).toFixed(2)}</span>
                      </div>
                      {settlementType === "payment" && (
                        <div className="d-flex justify-content-between mb-2 text-danger">
                          <span>Book Value (Replacement Cost)</span>
                          <span>₱{Number(selectedBook.price).toFixed(2)}</span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="h5 fw-bold mb-0">TOTAL DUE</span>
                        <span className="h4 fw-bold text-danger mb-0">
                          ₱
                          {(
                            Number(processingFee) +
                            Number(selectedBook.fine) +
                            (settlementType === "payment"
                              ? Number(selectedBook.price)
                              : 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {settlementType === "replacement" && (
                      <div className="alert alert-info border-0 shadow-sm d-flex align-items-center">
                        <i className="bi bi-info-circle-fill fs-4 me-3"></i>
                        <div>
                          <strong>Note:</strong> You will be redirected to the
                          Cataloging page to register the new physical book
                          after confirmation.
                        </div>
                      </div>
                    )}

                    <button
                      className="btn btn-danger w-100 py-3 fw-bold shadow"
                      onClick={handleMarkAsLost}
                    >
                      FINALIZE SETTLEMENT
                    </button>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-book fs-1 text-light"></i>
                    <p className="text-muted">
                      Please select a book from the loan list to proceed.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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

export default LostForm;
