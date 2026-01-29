import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";

const FineSetting = () => {
  const [finePerDay, setFinePerDay] = useState<string | number>(5);
  const [latePenalty, setLatePenalty] = useState<string | number>(50);
  const [processingFee, setProcessingFee] = useState<string | number>(50);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info"
  );

  useEffect(() => {
    setFetching(true);
    Promise.all([
      AxiosInstance.get("/settings/fine-per-day"),
      AxiosInstance.get("/settings/lost-fee"),
      AxiosInstance.get("/settings/late-settlement-penalty"),
    ])
      .then(([fineRes, feeRes, penaltyRes]) => {
        setFinePerDay(fineRes.data.fine_per_day);
        setProcessingFee(feeRes.data.lost_book_processing_fee);
        setLatePenalty(penaltyRes.data.late_settlement_penalty);
      })
      .catch(() => {
        setAlertMessage("Failed to load financial settings");
        setAlertType("error");
      })
      .finally(() => setFetching(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    setAlertMessage(null);

    // Saving both settings
    Promise.all([
      AxiosInstance.post("/settings/fine-per-day", {
        fine_per_day: finePerDay,
      }),
      AxiosInstance.post("/settings/lost-fee", {
        lost_book_processing_fee: processingFee,
      }),
      AxiosInstance.post("/settings/late-settlement-penalty", {
        late_settlement_penalty: latePenalty,
      }),
    ])
      .then(() => {
        setAlertMessage("All financial settings updated successfully!");
        setAlertType("success");
      })
      .catch(() => {
        setAlertMessage("Failed to update settings. Please check your inputs.");
        setAlertType("error");
      })
      .finally(() => setSaving(false));
  };

  const handleReset = () => {
    setFinePerDay(5);
    setProcessingFee(50);
    setLatePenalty(50);
    setAlertMessage(null);
  };

  return (
    <div className="fine-main-container">
      {alertMessage && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div className="fine-settings-card">
        <div className="fine-card-header">
          <div className="d-flex align-items-center">
            <div className="fine-icon-box me-3">
              <i className="bi bi-cash-stack"></i>
            </div>
            <div>
              <h5 className="fine-card-title mb-0">Fees and Penalties</h5>
              <small className="fine-card-subtitle">
                Configure overdue fines and item replacement charges
              </small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {fetching ? (
            /* --- SKELETON STATE --- */
            <div className="fine-skeleton-wrapper">
              {[1, 2].map((i) => (
                <div key={i} className="fine-skeleton-row mb-4">
                  <div className="fine-skeleton-text">
                    <div className="fine-skeleton-line title"></div>
                    <div className="fine-skeleton-line subtitle"></div>
                  </div>
                  <div className="fine-skeleton-input"></div>
                </div>
              ))}
              <div className="d-flex justify-content-end gap-2 mt-2">
                <div className="fine-skeleton-button"></div>
                <div className="fine-skeleton-button"></div>
              </div>
            </div>
          ) : (
            /* --- ACTUAL CONTENT --- */
            <div className="timezone-fade-in">
              <div className="fine-setting-row">
                <div className="fine-info">
                  <span className="fine-title">Fine Rate Per Day</span>
                  <small className="fine-description">
                    Daily penalty amount for items returned past their due date.
                  </small>
                </div>
                <div className="fine-control">
                  <div className="fine-input-wrapper">
                    <span className="fine-currency-prefix">₱</span>
                    <input
                      type="number"
                      className="fine-custom-input"
                      value={finePerDay}
                      onChange={(e) => setFinePerDay(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="fine-setting-row">
                <div className="fine-info">
                  <span className="fine-title">Lost Book Processing Fee</span>
                  <small className="fine-description">
                    Fixed administrative charge for replacing lost library
                    materials.
                  </small>
                </div>
                <div className="fine-control">
                  <div className="fine-input-wrapper">
                    <span className="fine-currency-prefix">₱</span>
                    <input
                      type="number"
                      className="fine-custom-input"
                      value={processingFee}
                      onChange={(e) => setProcessingFee(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="fine-setting-row">
                <div className="fine-info">
                  <span className="fine-title">Late Settlement Penalty</span>
                  <small className="fine-description">
                    Charge for failing to settle a "Lost Book" case by the
                    promise date.
                  </small>
                </div>
                <div className="fine-control">
                  <div className="fine-input-wrapper">
                    <span className="fine-currency-prefix">₱</span>
                    <input
                      type="number"
                      className="fine-custom-input"
                      value={latePenalty}
                      onChange={(e) => setLatePenalty(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button onClick={handleReset} className="fine-reset-button">
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  className="fine-save-button"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-save me-2"></i>
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FineSetting;
