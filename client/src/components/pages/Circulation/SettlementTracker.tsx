import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

// --- SUB-COMPONENT: THE RESOLUTION MODAL ---
const ResolutionModal = ({ data, onClose, refresh }: any) => {
  const [action, setAction] = useState<"complete" | "extend" | "fail">(
    "complete",
  );
  const [loading, setLoading] = useState(false);

  const [userName, setUserName] = useState("Authorized User");
  const [userRole, setUserRole] = useState("Staff");

  const [newCopy, setNewCopy] = useState({
    barcode: "",
    accession_no: "",
    source_person: "",
    cataloging_note: "",
  });

  // Field for 'extend'
  const [newDate, setNewDate] = useState("");

  const generateBarcode = () => {
    const randomNumbers = Math.floor(1000000000 + Math.random() * 9000000000);
    return `BC${randomNumbers}`;
  };

  const [latePenaltySetting, setLatePenaltySetting] = useState(0);

  // 1. Get today's date and strip the time (00:00:00)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 2. Get the due date and strip the time (00:00:00)
  const dueDate = new Date(data.due_date);
  dueDate.setHours(0, 0, 0, 0);

  // 3. Logic: True only if Today is Jan 27 and Due Date is Jan 26
  const isOverdue = today > dueDate;

  useEffect(() => {
    AxiosInstance.get("/settings/late-settlement-penalty")
      .then((res) => setLatePenaltySetting(res.data.late_settlement_penalty))
      .catch(() => setLatePenaltySetting(50));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    AxiosInstance.get("/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        const u = res.data;
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ");
        const role = u.role || localStorage.getItem("role") || "Staff";

        setUserName(fullName || "User");
        setUserRole(role.charAt(0).toUpperCase() + role.slice(1).toLowerCase());
      })
      .catch((err) => console.error("Error fetching user for note:", err));
  }, []);

  useEffect(() => {
    if (action === "complete" && userName !== "Authorized User") {
      setLoading(true);
      AxiosInstance.get("/book-copies/latest-accession")
        .then((res) => {
          setNewCopy((prev) => ({
            ...prev,
            barcode: generateBarcode(),
            accession_no: res.data.next_accession,
            source_person: `Replaced by the Patron: ${data.patron.first_name} ${data.patron.last_name}`,
            cataloging_note: `Replacement processed by the ${userRole}: ${userName} on ${new Date().toLocaleDateString()}`,
          }));
        })
        .catch(() => console.error("Could not fetch accession number"))
        .finally(() => setLoading(false));
    }
  }, [action, data, userName, userRole]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        action,
        due_date: action === "extend" ? newDate : null,
        penalty_applied:
          action === "fail" && isOverdue ? latePenaltySetting : 0,
        ...(action === "complete" && {
          book_id: data.book_copy.book_id,
          barcode: newCopy.barcode,
          accession_no: newCopy.accession_no,
          material_type_id: data.book_copy.material_type_id || 1,
          source_person: newCopy.source_person,
          cataloging_note: newCopy.cataloging_note,
          price: data.book_copy.price,
        }),
      };

      await AxiosInstance.post(
        `/circulations/resolve-lost/${data.id}`,
        payload,
      );
      refresh();
      onClose();
    } catch (err) {
      alert("Failed to resolve case. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "550px" }}>
        <h4 className="fw-bold mb-0">Resolve Lost Case</h4>
        <p className="text-muted small mb-2">{data.book_copy.book.title}</p>

        <div className="mb-1">
          <label className="small fw-bold text-muted">CHOOSE ACTION</label>
          <select
            className="form-select border-2"
            value={action}
            onChange={(e: any) => setAction(e.target.value)}
          >
            <option value="complete">Book Received (Register Copy)</option>
            <option value="extend">Extend Promise Deadline</option>
            <option value="fail">Patron Failed (Apply Penalties)</option>
          </select>
        </div>

        {action === "complete" && (
          <div className="bg-light p-3 rounded mb-1 border">
            <div className="row g-2">
              <div className="col-6">
                <label className="small fw-bold mt-1">New Barcode</label>
                <input
                  type="text"
                  className="form-control bg-white fw-bold mb-0"
                  value={newCopy.barcode}
                  readOnly
                />
              </div>
              <div className="col-6">
                <label className="small fw-bold mt-1">Accession No.</label>
                <input
                  type="text"
                  className="form-control bg-white fw-bold mb-0"
                  value={newCopy.accession_no}
                  readOnly
                />
              </div>
              <div className="col-12">
                <label className="small fw-bold">Funding Source</label>
                <input
                  type="text"
                  className="form-control mb-0"
                  value={newCopy.source_person}
                  onChange={(e) =>
                    setNewCopy({ ...newCopy, source_person: e.target.value })
                  }
                />
              </div>
              <div className="col-12">
                <label className="small fw-bold">Cataloging Note</label>
                <textarea
                  className="form-control mb-0"
                  rows={2}
                  value={newCopy.cataloging_note}
                  onChange={(e) =>
                    setNewCopy({ ...newCopy, cataloging_note: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {action === "extend" && (
          <div className="mb-3">
            {/* Reference Section */}
            <div className="d-flex justify-content-between mb-2 p-2 bg-light border rounded">
              <div>
                <label className="d-block small text-muted fw-bold text-uppercase">
                  Current Due Date
                </label>
                <span className="text-dark fw-semibold">
                  {data.due_date
                    ? new Date(data.due_date).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              {newDate && data.due_date && (
                <div className="text-end">
                  <label className="d-block small text-muted fw-bold text-uppercase">
                    Extension
                  </label>
                  <span className="badge bg-primary">
                    {Math.ceil(
                      (new Date(newDate).getTime() -
                        new Date(data.due_date).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )}{" "}
                    Days
                  </span>
                </div>
              )}
            </div>

            {/* Input Section */}
            <label className="small fw-bold">New Due Date</label>
            <input
              type="date"
              className="form-control border-2"
              min={new Date().toISOString().split("T")[0]}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />

            {/* Real-time Status Note */}
            {newDate && (
              <small className="text-info mt-2 d-block fw-medium">
                <i className="bi bi-info-circle me-1"></i>
                New deadline will be{" "}
                {new Date(newDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                .
              </small>
            )}
          </div>
        )}

        {action === "fail" && (
          <div className="fail-settlement-container">
            <div className="alert alert-danger py-2 mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              This will close the replacement case and convert it to a cash
              penalty.
            </div>

            <div className="card border-danger bg-light mb-3">
              <div className="card-header bg-danger text-white py-1 small fw-bold text-uppercase">
                Penalty Breakdown
              </div>
              <div className="card-body py-2">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Original Book Price:</span>
                  <span className="fw-bold">
                    ₱{Number(data.book_copy.price || 0).toFixed(2)}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Processing Fee:</span>
                  <span className="fw-bold">
                    ₱{Number(data.processing_fee_used || 50).toFixed(2)}
                  </span>
                </div>
                {/* Dynamic Late Penalty Row */}
                {isOverdue && (
                  <div className="d-flex justify-content-between mb-1 text-danger">
                    <span>Late Settlement Penalty:</span>
                    <span className="fw-bold">
                      ₱{Number(latePenaltySetting).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="d-flex justify-content-between border-top pt-1 mt-1">
                  <span className="fw-bold">Total Amount Due:</span>
                  <span
                    className="fw-bold text-danger"
                    style={{ fontSize: "1.1rem" }}
                  >
                    ₱
                    {(
                      Number(data.book_copy.price || 0) +
                      Number(data.processing_fee_used || 50) +
                      (isOverdue ? latePenaltySetting : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions mt-2">
          <button className="btn btn-light flex-grow-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn flex-grow-1 fw-bold ${action === "fail" ? "btn-danger" : "btn-primary"}`}
            onClick={handleSubmit}
            disabled={loading || (action === "extend" && !newDate)}
          >
            {loading ? "Processing..." : "Confirm Resolution"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT: THE TRACKER ---
const SettlementTracker = () => {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(
    null,
  );
  const [showResolveModal, setShowResolveModal] = useState(false);

  const fetchPending = async () => {
    try {
      const res = await AxiosInstance.get("/circulations/pending-settlements");
      setPending(res.data);
    } catch (err) {
      console.error("Failed to load settlements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const isOverdue = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dateString);
    due.setHours(0, 0, 0, 0);

    return today > due;
  };

  return (
    <div className="container-fluid p-4">
      <h1 className="form-title">Pending Book Replacements</h1>

      {loading ? (
        /* --- YOUR LOADING SNIPPET HERE --- */
        <div className="text-center py-10" style={{ padding: "5rem 0" }}>
          <LoadingSpinner message="Loading pending settlements..." />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patron</th>
                <th>Book Title</th>
                <th>Promise Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.length > 0 ? (
                pending.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="fw-bold">
                        {item.patron.first_name} {item.patron.last_name}
                      </div>
                      <small className="text-muted">
                        {item.patron.patron_id}
                      </small>
                    </td>
                    <td>{item.book_copy.book.title}</td>
                    <td>{new Date(item.due_date).toLocaleDateString()}</td>
                    <td>
                      {isOverdue(item.due_date) ? (
                        <span className="badge bg-danger">Overdue Promise</span>
                      ) : (
                        <span className="badge bg-success">Active</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          setSelectedSettlement(item);
                          setShowResolveModal(true);
                        }}
                      >
                        Resolve Case
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center p-4 text-muted">
                    No pending settlements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showResolveModal && (
        <ResolutionModal
          data={selectedSettlement}
          onClose={() => setShowResolveModal(false)}
          refresh={fetchPending}
        />
      )}
    </div>
  );
};;

export default SettlementTracker;
