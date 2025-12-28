import React, { useState, useEffect } from "react";
import timezones from "../../../data/time-zones/countries.json";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";

const TimezoneSettings: React.FC = () => {
  const [selectedTimezone, setSelectedTimezone] = useState("Asia/Manila");
  const [loading, setLoading] = useState(false);
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
        console.error("Error fetching timezone:", err);
        setAlertMessage("Failed to fetch timezone.");
        setAlertType("error");
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
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setAlertMessage("Timezone updated successfully!");
      setAlertType("success");
    } catch (err) {
      console.error("Error updating timezone:", err);
      setAlertMessage("Failed to update timezone.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="timezone-settings">
        {/* Display alert */}
        {alertMessage && (
          <Alert
            message={alertMessage}
            type={alertType}
            onClose={() => setAlertMessage("")}
          />
        )}
        <div className="settings-row mb-3">
          <label>Timezone</label>
          <select
            value={selectedTimezone}
            onChange={(e) => setSelectedTimezone(e.target.value)}
          >
            {timezones.flatMap((country) =>
              country.timezones.map((tzEntry) => (
                <option key={`${country.name}-${tzEntry}`} value={tzEntry}>
                  {tzEntry}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
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
      </div>
    </div>
  );
};

export default TimezoneSettings;
