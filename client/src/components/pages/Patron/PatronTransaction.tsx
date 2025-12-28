import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

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

const PatronTransactions = () => {
  const { id } = useParams<{ id: string }>(); // patron.id from URL
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // default latest first

  useEffect(() => {
    document.title = "Patron's Transaction";
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await AxiosInstance.get(`/patrons/${id}/transactions`);
        setTransactions(response.data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTransactions();
  }, [id]);

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aDate = new Date(a.date_issued).getTime();
    const bDate = new Date(b.date_issued).getTime();
    return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
  });

  return (
    <div className="transactions-page mt-4">
      <button className="back-btn mb-3" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="text-xl font-semibold mb-0">Borrowing Activity</h1>
          <p className="mb-0">
            <i>Shows past and current borrow transactions of the patron.</i>
          </p>
        </div>

        {/* Right side: Sort dropdown */}
        <div className="d-flex align-items-center">
          <label className="sort text-muted">Sort By</label>
          <select
            className="form-select"
            style={{ maxWidth: "180px" }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : sortedTransactions.length > 0 ? (
        <table className="patron-table">
          <thead>
            <tr>
              <th></th>
              <th>Title</th>
              <th>Call No.</th>
              <th>Copy No.</th>
              <th>Status</th>
              <th>Date Issued</th>
              <th>Due Date</th>
              <th>Return Date</th>
              <th>Fine</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((t, idx) => (
              <tr key={t.id}>
                <td>{idx + 1}</td>
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
  );
};

export default PatronTransactions;
