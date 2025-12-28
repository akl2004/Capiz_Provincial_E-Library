import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

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
}

const PatronInfo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patron, setPatron] = useState<Patron | null>(null);
  const [stats, setStats] = useState<PatronStats | null>(null);
  const [loadingPatron, setLoadingPatron] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // for transaction
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // default latest first

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0]; // YYYY-MM-DD
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
    const fetchTransactions = async () => {
      try {
        setLoadingTransactions(true);
        const response = await AxiosInstance.get(`/patrons/${id}/transactions`);
        const data: Transaction[] = response.data;

        setTransactions(data);

        // 🔹 Calculate stats
        const borrowedBooks = data.length;
        const returnedBooks = data.filter(
          (t) => t.status === "Returned"
        ).length;
        const now = new Date();
        const overdueBooks = data.filter(
          (t) => t.status !== "Returned" && new Date(t.due_date || "") < now
        ).length;

        const totalFine = data.reduce((sum, t) => sum + (t.fine || 0), 0);

        setStats({
          borrowedBooks,
          returnedBooks,
          overdueBooks,
          totalFine,
        });
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoadingTransactions(false);
      }
    };


    if (id) fetchTransactions();
  }, [id]);


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
      <button
        onClick={() => navigate(-1)}
        className="py-2 px-4 mb-4 bg-gray-200 hover:bg-gray-300 rounded"
      >
        ← Back
      </button>

      <div className="patron-top">
        <div className="patron-container">
          {/* Patron Info */}
          <div className="patron-record">
            <h1 className="text-xl font-semibold mb-0">Patron Record</h1>
            <p className="mb-6 text-gray-600">
              <i>Holds the recorded information of the patron</i>
            </p>

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
              <span className="stat-label">/ borrowed materials</span>
            </div>
            <div className="stat-footer">
              Represents total books borrowed to date.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <i className="bi bi-inboxes me-3"></i> TOTAL RETURNED
            </div>
            <div className="stat-body">
              <span className="stat-number">{stats?.returnedBooks ?? 0}</span>
              <span className="stat-label">
                /{stats?.borrowedBooks ?? 0} returned materials
              </span>
            </div>
            <div className="stat-footer">
              Represents total books returned to date.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <i className="bi bi-alarm me-3"></i> OVERDUE INCIDENTS
            </div>
            <div className="stat-body">
              <span className="stat-number">{stats?.overdueBooks ?? 0}</span>
              <span className="stat-label">
                /{stats?.borrowedBooks ?? 0} borrow incidents
              </span>
            </div>
            <div className="stat-footer">
              Indicates frequency of overdue returns.
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <i className="bi bi-cash me-3"></i> TOTAL FINE
            </div>
            <div className="stat-body">
              <span className="stat-number">
                ₱{(Number(stats?.totalFine) || 0).toFixed(2)}
              </span>
            </div>

            <div className="stat-footer">
              Total penalties incurred by the patron.
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
                <th>Return Date</th>
                <th>Fine</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.book_title}</td>
                  <td>{t.call_number}</td>
                  <td>{t.copy_number}</td>
                  <td>{t.status}</td>
                  <td>{t.date_issued ? t.date_issued.slice(0, 10) : "—"}</td>
                  <td>{t.due_date ? t.due_date.slice(0, 10) : "—"}</td>
                  <td>{t.return_date ? t.return_date.slice(0, 10) : "—"}</td>
                  <td>₱{(t.fine ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No transactions found.</p>
        )}
      </div>
    </div>
  );
};

export default PatronInfo;
