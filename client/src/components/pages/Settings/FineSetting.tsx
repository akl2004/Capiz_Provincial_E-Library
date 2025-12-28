import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";

const FineSetting = () => {
  const [finePerDay, setFinePerDay] = useState<string | number>(5);
  const [processingFee, setProcessingFee] = useState<string | number>(50);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info"
  );

  useEffect(() => {
    Promise.all([
      AxiosInstance.get("/settings/fine-per-day"),
      AxiosInstance.get("/settings/lost-fee"), 
    ])
      .then(([fineRes, feeRes]) => {
        setFinePerDay(fineRes.data.fine_per_day);
        setProcessingFee(feeRes.data.lost_book_processing_fee);
      })
      .catch(() => {
        setAlertMessage("Failed to load financial settings");
        setAlertType("error");
      });
  }, []);

  const handleSave = () => {
    setAlertMessage(null);

    // Saving both settings
    Promise.all([
      AxiosInstance.post("/settings/fine-per-day", {
        fine_per_day: finePerDay,
      }),
      AxiosInstance.post("/settings/lost-fee", {
        lost_book_processing_fee: processingFee,
      }),
    ])
      .then(() => {
        setAlertMessage("All financial settings updated successfully!");
        setAlertType("success");
      })
      .catch(() => {
        setAlertMessage("Failed to update settings. Please check your inputs.");
        setAlertType("error");
      });
  };

  const handleReset = () => {
    setFinePerDay(5);
    setProcessingFee(50);
    setAlertMessage(null);
  };

  return (
    <div className="mb-4">
      {/* Header */}
      <h4 className="font-semibold mb-0 mx-2">Fees and Penalties</h4>

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
          <label>Fine Rate Per Day</label>
          <input
            type="text"
            placeholder="₱ 0.00"
            value={finePerDay ? `₱${finePerDay}` : ""}
            onChange={(e) => {
              const rawValue = e.target.value.replace("₱", "");
              if (rawValue === "" || /^\d+$/.test(rawValue)) {
                setFinePerDay(rawValue);
              }
            }}
            onBlur={() => {
              if (finePerDay === "") setFinePerDay(0);
            }}
          />
        </div>
        <div className="settings-row mb-3">
          <label>Lost Book Processing Fee</label>
          <input
            type="text"
            value={processingFee ? `₱${processingFee}` : ""}
            placeholder="₱ 0.00"
            onChange={(e) => {
              const rawValue = e.target.value.replace("₱", "");
              if (rawValue === "" || /^\d+$/.test(rawValue)) {
                setProcessingFee(rawValue);
              }
            }}
            onBlur={() => {
              if (processingFee === "") setProcessingFee(0);
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="settings-actions">
        <button onClick={handleSave} className="btn btn-save">
          <i className="bi bi-save me-1"></i> Save Changes
        </button>
        <button onClick={handleReset} className="btn btn-reset">
          Reset
        </button>
      </div>
    </div>
  );
};

export default FineSetting;
