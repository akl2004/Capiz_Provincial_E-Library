import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

const ExpirationYearsSetting = () => {
  const [expirationYears, setExpirationYears] = useState(3);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch current expiration years
  useEffect(() => {
    const fetchExpirationYears = async () => {
      try {
        const res = await AxiosInstance.get("/settings/expiration-years");
        const years = Number(res.data.expiration_years);
        setExpirationYears(Number.isInteger(years) ? years : 3);
      } catch (err) {
        setMessage("⚠️ Failed to load expiration years");
      } finally {
      }
    };

    fetchExpirationYears();
  }, []);

  // Handle input changes safely
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 10) {
      setExpirationYears(value);
    } else if (e.target.value === "") {
      // Allow clearing input temporarily without breaking
      setExpirationYears(0);
    }
  };

  // Save updated expiration years
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await AxiosInstance.post("/settings/expiration-years", {
        expiration_years: Number(expirationYears) || 3,
      });
      setMessage("✅ Expiration years updated successfully!");
    } catch {
      setMessage("⚠️ Failed to update expiration years");
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = () => {
    setExpirationYears(3);
    setMessage(null);
  };

  return (
    <div className="expiry-main-container">
      <div className="expiry-settings-card">
        <div className="expiry-card-header">
          <div className="d-flex align-items-center">
            <div className="expiry-icon-box me-3">
              <i className="bi bi-person-badge"></i>
            </div>
            <div>
              <h5 className="expiry-card-title mb-0">Account Expiration</h5>
              <small className="expiry-card-subtitle">
                Set the duration for patron account validity
              </small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="expiry-setting-row">
            <div className="expiry-info">
              <span className="expiry-title">Membership Validity</span>
              <small className="expiry-description">
                Number of years before a patron account expires and requires
                renewal.
              </small>
            </div>
            <div className="expiry-control">
              <div className="expiry-input-wrapper">
                <input
                  type="number"
                  className="expiry-custom-input"
                  value={expirationYears > 0 ? expirationYears : ""}
                  onChange={handleChange}
                  min={1}
                  max={10}
                />
                <span className="expiry-unit">Years</span>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`expiry-status-message mt-3 ${
                message.includes("✅") ? "success" : "error"
              }`}
            >
              {message}
            </div>
          )}

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button onClick={handleReset} className="expiry-reset-button">
              Reset
            </button>
            <button
              onClick={handleSave}
              className="expiry-save-button"
              disabled={saving}
            >
              {saving ? (
                <span className="spinner-border spinner-border-sm me-2"></span>
              ) : (
                <i className="bi bi-shield-check me-2"></i>
              )}
              Update Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpirationYearsSetting;
