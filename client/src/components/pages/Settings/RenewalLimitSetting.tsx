import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";

const RenewalLimitSetting = () => {
  const [renewalLimit, setRenewalLimit] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info"
  );

  // Fetch current renewal limit
  useEffect(() => {
    const fetchLimit = async () => {
      try {
        const res = await AxiosInstance.get("/settings/renewal-limit");
        setRenewalLimit(res.data.renewal_limit);
      } catch (error) {
        console.error("Failed to fetch renewal limit", error);
        setAlertMessage("Failed to fetch renewal limit");
        setAlertType("error");
      }
    };
    fetchLimit();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setAlertMessage(null);
    try {
      const res = await AxiosInstance.post("/settings/renewal-limit", {
        renewal_limit: renewalLimit,
      });
      setAlertMessage(
        res.data.message || "Renewal limit updated successfully!"
      );
      setAlertType("success");
    } catch (error) {
      console.error(error);
      setAlertMessage("Error updating renewal limit");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRenewalLimit(2);
    setAlertMessage(null);
  };

  return (
    <div className="mb-4">
      {/* Header */}
      <h4 className="font-semibold mb-0 mx-2">Renewal Terms</h4>

      {/* Form Section */}
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
          <label>Max Renewals per Item</label>
          <input
            type="number"
            value={renewalLimit}
            onChange={(e) => setRenewalLimit(parseInt(e.target.value))}
            min={1}
            max={10}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="settings-actions">
        <button
          onClick={handleSave}
          className="btn btn-save"
          disabled={loading}
        >
          {loading ? (
            "Saving..."
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

export default RenewalLimitSetting;
