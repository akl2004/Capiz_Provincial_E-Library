import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";

const BorrowingPolicySetting = () => {
  const [loanDays, setLoanDays] = useState<string>("5");
  const [maxItems, setMaxItems] = useState<string>("3");
  const [borrowLimit, setBorrowLimit] = useState<string>("10");
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info"
  );

  // Fetch borrowing policy on load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await AxiosInstance.get("/settings/borrowing-policy");
        setLoanDays(res.data.loan_days ?? 5);
        setMaxItems(res.data.max_items ?? 3);
        setBorrowLimit(res.data.borrow_limit ?? 10);
      } catch (err) {
        console.error("Failed to load borrowing policy settings:", err);
        setAlertMessage("Failed to load borrowing policy settings.");
        setAlertType("error");
      } finally {
      }
    };

    fetchSettings();
  }, []);

  // Save all policy updates
  const handleSaveAll = async () => {
    setSaving(true);
    setAlertMessage(null);

    try {
      await AxiosInstance.post("/settings/borrowing-policy", {
        loan_days: loanDays,
        max_items: maxItems,
        borrow_limit: borrowLimit,
      });
      setAlertMessage("Borrowing policy updated successfully!");
      setAlertType("success");
    } catch (err) {
      console.error("Failed to update borrowing policy:", err);
      setAlertMessage("Failed to update borrowing policy.");
      setAlertType("error");
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    setLoanDays("5");
    setMaxItems("3");
    setBorrowLimit("10");
    setAlertMessage(null);
  };

  return (
    <div className="mb-4">
      {/* Header */}
      <h4 className="font-semibold mb-0 mx-2">Loan Policies</h4>

      {/* Settings Fields */}
      <div className="settings-form">
        {/* Alert */}
        {alertMessage && (
          <Alert
            message={alertMessage}
            type={alertType}
            onClose={() => setAlertMessage(null)}
          />
        )}
        <div className="settings-row mb-3">
          <label>Default Loan Days</label>
          <input
            type="text"
            value={loanDays}
            onChange={(e) => setLoanDays(e.target.value)}
            min={1}
            max={60}
          />
        </div>

        <div className="settings-row mb-3">
          <label>Max Items per Transaction</label>
          <input
            type="text"
            value={maxItems}
            onChange={(e) => setMaxItems(e.target.value)}
            min={1}
            max={20}
          />
        </div>

        <div className="settings-row mb-3">
          <label>Borrow Limit per Person</label>
          <input
            type="text"
            value={borrowLimit}
            onChange={(e) => setBorrowLimit(e.target.value)}
            min={1}
            max={50}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="settings-actions mt-3">
        <button
          onClick={handleSaveAll}
          className="btn btn-save me-2"
          disabled={saving}
        >
          {saving ? (
            <>
              <i className="bi bi-hourglass-split me-1"></i> Saving...
            </>
          ) : (
            <>
              <i className="bi bi-save me-1"></i> Save Changes
            </>
          )}
        </button>
        <button onClick={handleReset} className="btn btn-reset">
          Reset
        </button>
      </div>
    </div>
  );
};

export default BorrowingPolicySetting;
