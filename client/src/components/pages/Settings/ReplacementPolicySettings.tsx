import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";
import MessageModal from "../../MessageModal";

const ReplacementPolicySetting = () => {
  const [policy, setPolicy] = useState({
    extension_days: 14,
    extension_limit: 2,
  });
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

  // Fetch current policy settings
  useEffect(() => {
    const fetchPolicy = async () => {
      setFetching(true);
      try {
        const res = await AxiosInstance.get("/settings/replacement-policy");
        setPolicy({
          extension_days: res.data.extension_days,
          extension_limit: res.data.extension_limit,
        });
      } catch (error) {
        console.error("Failed to fetch replacement policy", error);
        setAlertMessage("Failed to fetch replacement policy");
        setAlertType("error");
      } finally {
        setFetching(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setAlertMessage(null);
    try {
      const res = await AxiosInstance.post(
        "/settings/replacement-policy",
        policy,
      );
      setMsgModal({
        show: true,
        type: "success",
        message: "Replacement policy updated successfully!",
      });
    } catch (error) {
      console.error(error);
      setMsgModal({
        show: true,
        type: "error",
        message: "Failed to update replacement policy",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPolicy({ extension_days: 14, extension_limit: 2 });
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
              <i className="bi bi-calendar-check"></i>
            </div>
            <div>
              <h5 className="renewal-card-title mb-0">Replacement Terms</h5>
              <small className="renewal-card-subtitle">
                Configure extension limits for patrons promising book
                replacements
              </small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {fetching ? (
            <div className="renew-skeleton-wrapper">
              {[1, 2].map((i) => (
                <div key={i} className="renew-skeleton-row mb-4">
                  <div className="renew-skeleton-text">
                    <div className="renew-skeleton-line title"></div>
                    <div className="renew-skeleton-line subtitle"></div>
                  </div>
                  <div className="renew-skeleton-input"></div>
                </div>
              ))}
              <div className="d-flex justify-content-end gap-2 mt-2">
                <div className="renew-skeleton-button"></div>
                <div className="renew-skeleton-button"></div>
              </div>
            </div>
          ) : (
            <div className="timezone-fade-in">
              {/* Setting 1: Extension Days */}
              <div className="renewal-setting-row mb-4">
                <div className="renewal-info">
                  <span className="renewal-title">Extension Period</span>
                  <small className="renewal-description">
                    Number of days granted for each extension request.
                  </small>
                </div>
                <div className="renewal-control">
                  <div className="renewal-input-wrapper">
                    <input
                      type="number"
                      className="renewal-custom-input"
                      value={policy.extension_days}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          extension_days: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1}
                      max={30}
                    />
                    <span className="renewal-unit">Days</span>
                  </div>
                </div>
              </div>

              {/* Setting 2: Extension Limit */}
              <div className="renewal-setting-row">
                <div className="renewal-info">
                  <span className="renewal-title">Max Extension Attempts</span>
                  <small className="renewal-description">
                    How many times a promise deadline can be extended.
                  </small>
                </div>
                <div className="renewal-control">
                  <div className="renewal-input-wrapper">
                    <input
                      type="number"
                      className="renewal-custom-input"
                      value={policy.extension_limit}
                      onChange={(e) =>
                        setPolicy({
                          ...policy,
                          extension_limit: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
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
                  Update Policy
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

export default ReplacementPolicySetting;
