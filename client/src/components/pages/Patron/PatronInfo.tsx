import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import Barcode from "react-barcode";

interface Patron {
  patron_id?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email: string;
  barangay?: string;
  city: string;
  province: string;
  number?: string;
  status?: string;
  age?: number;
  gender?: string;
  notes?: string;
  created_at?: string;
  expiry_date?: string;
}

interface PatronStats {
  borrowedBooks: number;
  returnedBooks: number;
  totalFine: number | null;
  overdueBooks: number;
  lostBooks: number;
  activeLoans: number;
}

interface Transaction {
  id: number;
  book_title: string;
  call_number: string;
  copy_number: string;
  status: string;
  date_issued: string;
  due_date?: string;
  return_date?: string;
  fine: number;
  is_paid: boolean;
  paid_amount?: number;
  settlement_type?: string;
  lost_resolution?: string; 
  remarks?: string;
  processed_by?: string;
  material_price?: string;
  processing_fee_used: string;
}

const PatronInfo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patron, setPatron] = useState<Patron | null>(null);
  const [stats, setStats] = useState<PatronStats | null>(null);
  const [loadingPatron, setLoadingPatron] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPrintModal, setShowPrintModal] = useState(false);

  // for transaction
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0];
  };

  const getDisplayStatus = (t: Transaction) => {
    if (
      t.status === "Returned" ||
      t.status === "Returned Late" ||
      t.status === "Lost"
    ) {
      return t.status;
    }
    if (t.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return "Overdue";
      }
    }

    return t.status;
  };

  useEffect(() => {
    document.title = "Patron Information";

    const fetchPatron = async () => {
      try {
        setLoadingPatron(true);
        const response = await AxiosInstance.get(`/patrons/${id}`);
        setPatron(response.data);
      } catch (error) {
        console.error("Error fetching patron info:", error);
      } finally {
        setLoadingPatron(false);
      }
    };

    fetchPatron();
  }, [id]);

  // fetch transaction
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTransactions(true);

        const statsRes = await AxiosInstance.get(`/patrons/${id}/stats`);
        setStats({
          borrowedBooks: statsRes.data.borrowedBooks,
          returnedBooks: statsRes.data.returnedBooks,
          totalFine: statsRes.data.totalFine,
          overdueBooks: statsRes.data.overdueBooks,
          lostBooks: statsRes.data.lostBooks,
          activeLoans: statsRes.data.activeLoans,
        });

        const transRes = await AxiosInstance.get(`/patrons/${id}/transactions`);
        setTransactions(transRes.data);
      } catch (error) {
        console.error("Error fetching patron data:", error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const [fineRate, setFineRate] = useState(5);

  useEffect(() => {
    const fetchFineRate = async () => {
      try {
        const res = await AxiosInstance.get("/settings/fine-per-day");
        setFineRate(res.data.fine_per_day);
      } catch (err) {
        console.error("Could not fetch fine rate", err);
      }
    };
    fetchFineRate();
  }, []);

  const calculatedBalance = transactions.reduce((total, t) => {
    if (t.is_paid === true || Number(t.is_paid) === 1) {
      return total;
    }

    if (t.status === "Lost") return total;

    if (t.return_date) {
      return total;
    }

    // 4. Calculation for books STILL with the patron (Live Overdue)
    if (t.due_date && !t.return_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return total + diffDays * fineRate;
      }
    }

    return total;
  }, 0);

  const getDisplayFine = (t: Transaction) => {
    if (t.fine > 0) return `₱${Number(t.fine).toFixed(2)}`;

    if (!t.return_date && t.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `₱${(diffDays * fineRate).toFixed(2)}`;
      }
    }

    if (t.status === "Returned" || t.status === "Returned Late") return "₱0.00";

    return "—";
  };

  const activeLoans = stats?.activeLoans ?? 0;

  const settlementTransactions = transactions.filter((t) => {
    // 1. If it's explicitly marked as Replacement or Payment, show it.
    const hasSettlementType =
      t.settlement_type === "Replacement" || t.settlement_type === "Payment";

    // 2. If it's Lost, we always want to see it in the Settlement History
    // (whether it's deferred or paid)
    const isLost = t.status === "Lost";

    // 3. Traditional fines (Returned books that had a processing fee or fine)
    const wasFinePaid =
      t.status === "Returned" &&
      (Number(t.fine) > 0 || (t.paid_amount ?? 0) > 0);

    return hasSettlementType || isLost || wasFinePaid;
  });

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aDate = new Date(a.date_issued).getTime();
    const bDate = new Date(b.date_issued).getTime();
    return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
  });

  const filteredTransactions = sortedTransactions.filter((t) =>
    t.book_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loadingPatron) return <LoadingSpinner />;
  if (!patron) return <p>Patron not found.</p>;

  const fullName = [
    patron.first_name,
    patron.middle_name,
    patron.last_name,
    patron.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      {/* ===== Barcode Modal for Patron ID ===== */}
      {showPrintModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "450px" }}>
            <button
              onClick={() => setShowPrintModal(false)}
              className="modal-close-btn no-print"
            >
              &times;
            </button>

            <h2 className="text-xl font-semibold mb-4 no-print text-center">
              Print Patron ID Card
            </h2>

            {/* Wrapping in the ID your CSS expects */}
            <div id="printable-patron-barcodes">
              <div className="patron-card-design barcode-item">
                <div className="card-accent-border"></div>

                <div className="card-header-main">
                  <div className="library-title">CAPIZ PROVINCIAL LIBRARY</div>
                  <div className="card-type">PATRON PASS</div>
                </div>

                <div className="card-content-grid">
                  <div className="patron-details">
                    <div className="detail-group">
                      <span className="patron-detail-label">NAME</span>
                      <span className="patron-detail-value">
                        {fullName.toUpperCase()}
                      </span>
                    </div>

                    <div className="id-expiry-row">
                      <div className="detail-group">
                        <span className="patron-detail-label">PATRON ID</span>
                        <span className="patron-detail-value">
                          {patron.patron_id}
                        </span>
                      </div>
                      <div className="detail-group">
                        <span className="patron-detail-label">EXPIRY</span>
                        <span className="patron-detail-value">
                          {patron.expiry_date?.slice(0, 10) || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="barcode-section-card">
                  <Barcode
                    value={patron.patron_id || "0000"}
                    width={1.5}
                    height={55}
                    fontSize={12}
                    margin={2}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions no-print mt-4">
              <button
                onClick={() => setShowPrintModal(false)}
                className="cancel-btn"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setTimeout(() => {
                    window.print();
                  }, 100);
                }}
                className="submit-btn"
              >
                <i className="bi bi-printer me-2"></i> Print Card
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="patron-top">
        <div className="patron-container">
          {/* Patron Info */}
          <div className="patron-record">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h1 className="text-xl font-semibold mb-0">
                  <span
                    className="me-2"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(-1)}
                  >
                    <i className="bi bi-arrow-left"></i>
                  </span>
                  Patron Record
                </h1>
                <p className="mb-6 text-gray-600">
                  <i>Holds the recorded information of the patron</i>
                </p>
              </div>
              <button
                onClick={() => setShowPrintModal(true)}
                className="patron-btn"
              >
                <i className="bi bi-printer me-2"></i> Print Patron ID
              </button>
            </div>

            <table>
              <tbody>
                {Object.entries({
                  "Patron ID": patron.patron_id || "-",
                  Name: fullName,
                  Age: patron.age ?? "-",
                  Address:
                    [patron.barangay, patron.city, patron.province]
                      .filter(Boolean)
                      .join(", ") || "-",
                  Gender: patron.gender ?? "-",
                  Number: patron.number || "-",
                  Email: patron.email,
                  Status: patron.status || "-",
                  "Registration Date": formatDate(patron.created_at),
                  "Expiry Date": formatDate(patron.expiry_date),
                  Notes: patron.notes || "-",
                }).map(([key, value]) => (
                  <tr key={key}>
                    <td className="key">{key}</td>
                    <td className="value">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Patron Stats */}
        <div className="patron-stats">
          <div className="stat-card">
            <div className="stat-header">
              <i className="bi bi-book me-3"></i> TOTAL BORROWED
            </div>
            <div className="stat-body">
              <span className="stat-number">{stats?.borrowedBooks ?? 0}</span>
            </div>
            <div className="stat-footer">
              Represents total books borrowed to date.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <i className="bi bi-inboxes me-3"></i> ACTIVE LOANS
            </div>
            <div className="stat-body">
              <span className="stat-number">{activeLoans}</span>
            </div>
            <div className="stat-footer">
              Number of books currently issued to the patron.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <i className="bi bi-cash me-3"></i> OUTSTANDING BALANCE
            </div>
            <div className="stat-body">
              <span className="stat-number">
                ₱{calculatedBalance.toFixed(2)}
              </span>
            </div>

            <div className="stat-footer">
              Total active unpaid fines associated with the patron.
            </div>
          </div>
        </div>
      </div>

      <div className="transactions-page mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="text-xl font-semibold mb-0">Borrowing Activity</h1>
            <p className="mb-0">
              <i>Shows past and current borrow transactions of the patron.</i>
            </p>
          </div>

          {/* Search */}
          <div className="position-relative" style={{ maxWidth: "300px" }}>
            <span
              className="position-absolute top-50 translate-middle-y ps-2"
              style={{ left: "10px", color: "#6c757d" }}
            >
              <i className="bi bi-search"></i>
            </span>
            <input
              className="form-control ps-5 pe-5"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Right side: Sort buttons */}
          <div className="d-flex align-items-center">
            <label className="sort text-muted me-2">Sort By</label>

            <div className="btn-group" role="group" aria-label="Sort order">
              <button
                type="button"
                className={`btn btn-outline-secondary ${
                  sortOrder === "asc" ? "active" : ""
                }`}
                onClick={() => setSortOrder("asc")}
              >
                <i className="bi bi-sort-alpha-up me-1"></i> ASC
              </button>
              <button
                type="button"
                className={`btn btn-outline-secondary ${
                  sortOrder === "desc" ? "active" : ""
                }`}
                onClick={() => setSortOrder("desc")}
              >
                <i className="bi bi-sort-alpha-down me-1"></i> DESC
              </button>
            </div>
          </div>
        </div>

        {loadingTransactions ? (
          <LoadingSpinner />
        ) : filteredTransactions.length > 0 ? (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Book Title</th>
                <th>Call Number</th>
                <th>Copy No.</th>
                <th>Status</th>
                <th>Date Issued</th>
                <th>Due Date</th>
                <th>Overdue Fine</th>
                <th>Return Date</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((t) => {
                const displayStatus = getDisplayStatus(t);

                return (
                  <tr key={t.id}>
                    <td>{t.book_title}</td>
                    <td>{t.call_number}</td>
                    <td>{t.copy_number}</td>
                    <td
                      style={{
                        color:
                          displayStatus === "Overdue" ? "#dc3545" : "inherit",
                        fontWeight:
                          displayStatus === "Overdue" ? "bold" : "normal",
                      }}
                    >
                      {displayStatus}
                    </td>
                    <td>{t.date_issued ? t.date_issued.slice(0, 10) : "—"}</td>
                    <td>{t.due_date ? t.due_date.slice(0, 10) : "—"}</td>
                    <td>{getDisplayFine(t)}</td>
                    <td>{t.return_date ? t.return_date.slice(0, 10) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No borrowing activity found.</p>
        )}
      </div>

      <div className="transactions-page mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="text-xl font-semibold mb-0">Settlement History</h1>
            <p className="mb-0">
              <i>
                List of payment and replacement settlements for lost
                transactions.
              </i>
            </p>
          </div>
        </div>

        {loadingTransactions ? (
          <LoadingSpinner />
        ) : settlementTransactions.length > 0 ? (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Settlement ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Details</th>
                <th>Processed By</th>
              </tr>
            </thead>
            <tbody>
              {settlementTransactions.map((t) => {
                // It's "Deferred" if it's a Replacement but has no return_date yet
                const isReplacement = t.settlement_type === "Replacement";
                const isDeferred = isReplacement && !t.return_date;

                // Check if it's a payment
                const isPayment = t.settlement_type === "Payment";

                return (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{formatDate(t.return_date || t.date_issued)}</td>
                    <td>
                      <span
                        className={`badge ${isDeferred ? "bg-warning text-dark" : "bg-info"}`}
                      >
                        {t.settlement_type} {isDeferred && "(Deferred)"}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold">
                        {t.book_title} (Copy #{t.copy_number})
                      </div>
                      <small className="text-muted">
                        {isPayment
                          ? `Price: ₱${t.material_price} + Fee: ₱${t.processing_fee_used}`
                          : isDeferred
                            ? `Pending replacement. Due: ${formatDate(t.due_date)}`
                            : `Replacement copy received.`}
                      </small>
                    </td>
                    <td>{t.processed_by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No settlement history found.</p>
        )}
      </div>
    </div>
  );
};

export default PatronInfo;
