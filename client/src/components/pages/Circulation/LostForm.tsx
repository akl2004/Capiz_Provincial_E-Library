import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

interface Patron {
  id: string;
  patron_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
}

interface BookCopy {
  id: number;
  barcode: string;
  material_type_id: number;
  book_id: number;
  condition: string;
  status: string;
  price: number;
  copy_number: number;
  accession_no: string;
  issue_date: string;
  due_date: string;
  days_overdue: number;
  book: {
    title: string;
    call_number: string;
  };
  fine?: number;
}

interface MarkLostPayload {
  book_copy_id?: number;
  settlement_type: "payment" | "replacement";
  replacement_mode?: "Immediate" | "Deferred" | null;
  due_date?: string | null;
  material_type_id?: number;
  book_id?: number;
  condition?: string;
  status?: string;
  [key: string]: any;
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

  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [replacementMode, setReplacementMode] = useState<
    "Immediate" | "Deferred"
  >("Immediate");
  const [replacementDueDate, setReplacementDueDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );

  const [showAddCopyModal, setShowAddCopyModal] = useState(false);
  const [newCopyData, setNewCopyData] = useState({
    barcode: "",
    accession_no: "",
    source: "Replacement",
    source_person: "",
    cataloging_note: "",
    internal_note: "",
  });

  const navigate = useNavigate();

  const generateBarcode = () => {
    const randomNumbers = Math.floor(1000000000 + Math.random() * 9000000000);
    return `BC${randomNumbers}`;
  };

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

      const loansRes = await AxiosInstance.get(
        `/circulations/active-loans/${patronData.id}`,
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

  const confirmSettlement = async () => {
    if (!selectedBook) return;

    const upfrontTotal = Number(processingFee) + Number(selectedBook.fine);

    if (upfrontTotal > 0) {
      const confirmed = window.confirm(
        `POLICY CHECK: Patron must pay ₱${upfrontTotal.toFixed(2)} now (Fines + Processing). Has this been collected?`,
      );
      if (!confirmed) return;
    }

    if (settlementType === "replacement" && replacementMode === "Immediate") {
      setLoading(true);
      try {
        // Fetch the next available accession number from the new endpoint
        const res = await AxiosInstance.get("/book-copies/latest-accession");
        const nextAccessionFromDB = res.data.next_accession;

        setNewCopyData({
          ...newCopyData,
          barcode: generateBarcode(),
          accession_no: nextAccessionFromDB, // Set the actual number here
        });

        setShowReplacementModal(false);
        setShowAddCopyModal(true);
      } catch (err) {
        console.error("Could not fetch accession number", err);
        setNewCopyData({
          ...newCopyData,
          barcode: generateBarcode(),
          accession_no: "ERROR",
        });
      } finally {
        setLoading(false);
      }
    } else {
      handleFinalSubmission();
    }
  };

  const handleFinalSubmission = (extraData: Partial<MarkLostPayload> = {}) => {
    setLoading(true);
    let payload: MarkLostPayload = {
      book_copy_id: selectedBook?.id,
      settlement_type: settlementType,
      replacement_mode:
        settlementType === "replacement" ? replacementMode : null,
      due_date: replacementMode === "Deferred" ? replacementDueDate : null,
      ...extraData,
    };

    if (settlementType === "replacement" && replacementMode === "Immediate") {
      payload.material_type_id = selectedBook?.material_type_id || 1;
      payload.book_id = selectedBook?.book_id;
      payload.condition = "New";
      payload.status = "Available";
    }

    AxiosInstance.post("/circulations/mark-lost", payload)
      .then((res) => {
        setShowAddCopyModal(false);
        setModalMessage({
          type: "success",
          message: "Settlement finalized. Records updated successfully.",
        });

        setTimeout(() => {
          onSuccess();
          const role = localStorage.getItem("role")?.toLowerCase() || "staff";
          navigate(`/${role}/circulation`);
        }, 2000);
      })
      .catch((err) => {
        setModalMessage({
          type: "error",
          message:
            err.response?.data?.message || "Failed to finalize settlement.",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (patronSearch.trim().length >= 3) {
        fetchData(patronSearch);
      }
    }, 500);

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
                          <strong>Note:</strong> Patron can choose between 2
                          options on how the replacement will take effect.
                        </div>
                      </div>
                    )}

                    <button
                      className="btn btn-danger w-100 py-3 fw-bold shadow"
                      onClick={() => {
                        if (settlementType === "replacement") {
                          setShowReplacementModal(true); // Open the "Immediate vs Deferred" modal
                        } else {
                          handleFinalSubmission(); // Just pay for it and finish
                        }
                      }}
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

      {showReplacementModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="fw-bold mb-3">
              <i className="bi bi-clock-history me-2"></i>Replacement Timing
            </h3>
            <p className="text-muted small mb-4">
              How will the patron provide the replacement copy?
            </p>

            <div className="row g-3 mb-4">
              <div className="col-6">
                <button
                  className={`btn w-100 py-3 border-2 ${replacementMode === "Immediate" ? "btn-danger border-danger" : "btn-outline-secondary"}`}
                  onClick={() => setReplacementMode("Immediate")}
                >
                  <i className="bi bi-lightning-fill mb-1 d-block fs-4"></i>
                  Immediate
                </button>
              </div>
              <div className="col-6">
                <button
                  className={`btn w-100 py-3 border-2 ${replacementMode === "Deferred" ? "btn-warning border-warning text-dark" : "btn-outline-secondary"}`}
                  onClick={() => setReplacementMode("Deferred")}
                >
                  <i className="bi bi-calendar-event mb-1 d-block fs-4"></i>
                  Deferred
                </button>
              </div>
            </div>

            {replacementMode === "Deferred" && (
              <div className="mb-4 fade-in">
                <label className="form-label small fw-bold text-muted">
                  REPLACEMENT DEADLINE
                </label>
                <input
                  type="date"
                  className="form-control form-control-lg border-2"
                  min={new Date().toISOString().split("T")[0]}
                  value={replacementDueDate}
                  onChange={(e) => setReplacementDueDate(e.target.value)}
                />
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn btn-light flex-grow-1"
                onClick={() => setShowReplacementModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger flex-grow-1 fw-bold"
                onClick={confirmSettlement}
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCopyModal && (
        <div className="modal-overlay">
          {/* Increased maxWidth slightly for side-by-side layout */}
          <div className="modal-box">
            <div className="text-center mb-3">
              <div className="bg-danger-subtle text-danger d-inline-block p-3 rounded-circle mb-0">
                <i className="bi bi-journal-plus fs-2"></i>
              </div>
              <h4 className="fw-bold">Register New Copy</h4>
              <p className="text-muted small">
                Enter the details of the replacement book
              </p>
            </div>

            <div className="row g-3">
              {/* ROW 1: Barcode & Accession */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">
                  NEW BARCODE
                </label>
                <input
                  type="text"
                  className="form-control border-2 bg-light fw-bold mb-0"
                  value={newCopyData.barcode}
                  readOnly
                />
              </div>

              <div className="col-md-6">
                <label className="form-label small fw-bold text-muted">
                  ACCESSION NUMBER
                </label>
                <input
                  type="text"
                  className="form-control border-2 bg-light fw-bold mb-0"
                  value={newCopyData.accession_no}
                  readOnly
                />
              </div>

              {/* ROW 2: Funding Source (Full Width) */}
              <div className="col-12 mt-0">
                <label className="form-label small fw-bold text-muted">
                  FUNDING SOURCE
                </label>
                <input
                  type="text"
                  className="form-control border-2 mb-0"
                  placeholder="Replaced by..."
                  value={newCopyData.source_person}
                  onChange={(e) =>
                    setNewCopyData({
                      ...newCopyData,
                      source_person: e.target.value,
                    })
                  }
                />
              </div>

              {/* ROW 3: Catalog & Internal Notes */}
              <div className="col-md-6 mt-0">
                <label className="form-label small fw-bold text-muted">
                  CATALOG NOTE
                </label>
                <textarea
                  className="form-control border-2"
                  rows={3}
                  placeholder="Cataloged by..."
                  value={newCopyData.cataloging_note}
                  onChange={(e) =>
                    setNewCopyData({
                      ...newCopyData,
                      cataloging_note: e.target.value,
                    })
                  }
                />
              </div>

              <div className="col-md-6 mt-0">
                <label className="form-label small fw-bold text-muted">
                  INTERNAL NOTE
                </label>
                <textarea
                  className="form-control border-2"
                  rows={3}
                  value={newCopyData.internal_note}
                  onChange={(e) =>
                    setNewCopyData({
                      ...newCopyData,
                      internal_note: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <button
                className="btn btn-light flex-grow-1"
                onClick={() => setShowAddCopyModal(false)}
              >
                Back
              </button>
              <button
                className="btn btn-danger flex-grow-1 fw-bold"
                disabled={
                  !newCopyData.barcode || !newCopyData.accession_no || loading
                }
                onClick={() => handleFinalSubmission(newCopyData)}
              >
                {loading ? "Processing..." : "Complete Replacement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LostForm;
