import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";
import MessageModal from "../../MessageModal";

const MissingThresholdSetting = () => {
  const [days, setDays] = useState<number>(365);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info",
  );

  const [msgModal, setMsgModal] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  // Fetch current threshold
  useEffect(() => {
    const fetchThreshold = async () => {
      setFetching(true);
      try {
        const res = await AxiosInstance.get("/settings/missing-threshold");
        setDays(res.data.missing_threshold_days);
      } catch (error) {
        console.error("Failed to fetch threshold", error);
        setAlertMessage("Failed to fetch missing threshold");
        setAlertType("error");
      } finally {
        setFetching(false);
      }
    };
    fetchThreshold();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setAlertMessage(null);
    try {
      const res = await AxiosInstance.post("/settings/missing-threshold", {
        missing_threshold_days: days,
      });
      setMsgModal({
        show: true,
        type: "success",
        message: "Missing threshold updated successfully!",
      });
    } catch (error) {
      console.error(error);
      setMsgModal({
        show: true,
        type: "error",
        message: "Failed to update missing threshold",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDays(365);
    setAlertMessage(null);
  };

  return (
    <div className="renewal-main-container mt-4">
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
              <i className="bi bi-question-diamond"></i>
            </div>
            <div>
              <h5 className="renewal-card-title mb-0">Missing Book Status</h5>
              <small className="renewal-card-subtitle">
                Define when an overdue book is officially declared missing
              </small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {fetching ? (
            <div className="renew-skeleton-wrapper">
              <div className="renew-skeleton-row mb-4">
                <div className="renew-skeleton-text">
                  <div className="renew-skeleton-line title"></div>
                  <div className="renew-skeleton-line subtitle"></div>
                </div>
                <div className="renew-skeleton-input"></div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-2">
                <div className="renew-skeleton-button"></div>
                <div className="renew-skeleton-button"></div>
              </div>
            </div>
          ) : (
            <div className="timezone-fade-in">
              <div className="renewal-setting-row">
                <div className="renewal-info">
                  <span className="renewal-title">Auto-Missing Threshold</span>
                  <small className="renewal-description">
                    Number of days overdue before fine calculation stops and
                    status turns to 'Missing'.
                  </small>
                </div>
                <div className="renewal-control">
                  <div className="renewal-input-wrapper">
                    <input
                      type="number"
                      className="renewal-custom-input"
                      value={days}
                      onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                      min={5}
                      max={1000}
                    />
                    <span className="renewal-unit">Days</span>
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
                  Update Threshold
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {msgModal.show && (
        <MessageModal
          type={msgModal.type}
          message={msgModal.message}
          onClose={() => setMsgModal({ ...msgModal, show: false })}
        />
      )}
    </div>
  );
};

export default MissingThresholdSetting;
