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
    <div className="renewal-main-container">
      {alertMessage && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div className="renewal-settings-card">
        <div className="renewal-card-header">
          <div className="d-flex align-items-center">
            <div className="renewal-icon-box me-3">
              <i className="bi bi-arrow-repeat"></i>
            </div>
            <div>
              <h5 className="renewal-card-title mb-0">Renewal Terms</h5>
              <small className="renewal-card-subtitle">
                Set how many times patrons can extend their loan period
              </small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="renewal-setting-row">
            <div className="renewal-info">
              <span className="renewal-title">Maximum Renewals</span>
              <small className="renewal-description">
                Allowed renewals per item before it must be returned.
              </small>
            </div>
            <div className="renewal-control">
              <div className="renewal-input-wrapper">
                <input
                  type="number"
                  className="renewal-custom-input"
                  value={renewalLimit}
                  onChange={(e) => setRenewalLimit(parseInt(e.target.value))}
                  min={1}
                  max={10}
                />
                <span className="renewal-unit">Times</span>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button onClick={handleReset} className="renewal-reset-button">
              Reset
            </button>
            <button
              onClick={handleSave}
              className="renewal-save-button"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2"></span>
              ) : (
                <i className="bi bi-check2-circle me-2"></i>
              )}
              Update Limit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalLimitSetting;
