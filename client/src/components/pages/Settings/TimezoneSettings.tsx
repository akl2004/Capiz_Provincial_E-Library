import React, { useState, useEffect } from "react";
import timezones from "../../../data/time-zones/countries.json";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";

const TimezoneSettings: React.FC = () => {
  const [selectedTimezone, setSelectedTimezone] = useState("Asia/Manila");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info"
  );

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await AxiosInstance.get("/settings/timezone", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedTimezone(res.data.default_timezone);
      } catch (err) {
        setAlertMessage("Failed to fetch timezone.");
        setAlertType("error");
      } finally {
        setTimeout(() => setFetching(false), 600);
      }
    };
    fetchTimezone();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      await AxiosInstance.post(
        "/settings/timezone",
        { timezone: selectedTimezone },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAlertMessage("Timezone updated successfully!");
      setAlertType("success");
    } catch (err) {
      setAlertMessage("Failed to update timezone.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timezone-main-container">
      {alertMessage && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage("")}
        />
      )}

      <div className="timezone-settings-card">
        <div className="timezone-card-header">
          <div className="d-flex align-items-center">
            <div className="timezone-icon-box me-3">
              <i className="bi bi-clock-history"></i>
            </div>
            <div>
              <h5 className="timezone-card-title mb-0">Regional Settings</h5>
              <small className="timezone-card-subtitle">
                Configure the system default timezone
              </small>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {fetching ? (
            <div className="timezone-skeleton-wrapper">
              <div className="timezone-skeleton-label mb-2"></div>
              <div className="timezone-skeleton-input mb-4"></div>
              <div className="timezone-skeleton-button"></div>
            </div>
          ) : (
            <div className="timezone-fade-in">
              <div className="timezone-input-group mb-4">
                <label className="timezone-input-label">
                  SELECT SYSTEM TIMEZONE
                </label>
                <div className="timezone-select-container">
                  <i className="bi bi-globe-americas timezone-select-icon"></i>
                  <select
                    className="timezone-custom-select"
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                  >
                    {timezones.map((country) => (
                      <optgroup key={country.name} label={country.name}>
                        {country.timezones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz.replace(/_/g, " ")}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="timezone-preview-box mt-3">
                  <i className="bi bi-info-circle me-2"></i>
                  The system currently treats "now" as:{" "}
                  <strong>
                    {new Date().toLocaleTimeString("en-US", {
                      timeZone: selectedTimezone,
                    })}
                  </strong>
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button
                  onClick={handleSave}
                  className="timezone-save-button"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-check2-circle me-2"></i>
                  )}
                  Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimezoneSettings;
