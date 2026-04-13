import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Alert from "../../Alert";
import MessageModal from "../../MessageModal";

const BorrowingPolicySetting = () => {
  const [loanDays, setLoanDays] = useState<string>("5");
  const [maxItems, setMaxItems] = useState<string>("3");
  const [borrowLimit, setBorrowLimit] = useState<string>("10");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "info">(
    "info"
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

  // Fetch borrowing policy on load
  useEffect(() => {
    const fetchSettings = async () => {
      setFetching(true);
      try {
        const res = await AxiosInstance.get("/settings/borrowing-policy");
        setLoanDays(res.data.loan_days ?? 5);
        setMaxItems(res.data.max_items ?? 3);
        setBorrowLimit(res.data.borrow_limit ?? 10);
      } catch (err) {
        console.error("Failed to load borrowing policy settings:", err);
        setMsgModal({
          show: true,
          type: "error",
          message: "Failed to load borrowing policy settings.",
        });
      } finally {
        setFetching(false);
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
      setMsgModal({
        show: true,
        type: "success",
        message: "Borrowing policy updated successfully!",
      });
    } catch (err) {
      console.error("Failed to update borrowing policy:", err);
      setMsgModal({
        show: true,
        type: "error",
        message: "Failed to update borrowing policy.",
      });
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
   <div className="borrow-main-container">
     {alertMessage && (
       <Alert
         message={alertMessage}
         type={alertType}
         onClose={() => setAlertMessage(null)}
       />
     )}

     <div className="borrow-settings-card">
       <div className="borrow-card-header">
         <div className="d-flex align-items-center">
           <div className="borrow-icon-box me-3">
             <i className="bi bi-journal-check"></i>
           </div>
           <div>
             <h5 className="borrow-card-title mb-0">Loan Policies</h5>
             <small className="borrow-card-subtitle">
               Define duration and item limits for library circulation
             </small>
           </div>
         </div>
       </div>

       <div className="card-body p-4">
         {fetching ? (
           <div className="borrow-skeleton-wrapper">
             {[1, 2, 3].map((i) => (
               <div key={i} className="borrow-skeleton-row mb-4">
                 <div className="borrow-skeleton-text">
                   <div className="borrow-skeleton-line title"></div>
                   <div className="borrow-skeleton-line subtitle"></div>
                 </div>
                 <div className="borrow-skeleton-input"></div>
               </div>
             ))}
             <div className="d-flex justify-content-end gap-2 mt-2">
               <div className="borrow-skeleton-button"></div>
               <div className="borrow-skeleton-button"></div>
             </div>
           </div>
         ) : (
           <div className="borrow-fade-in">
             <div className="borrow-setting-row">
               <div className="borrow-info">
                 <span className="borrow-title">Default Loan Period</span>
                 <small className="borrow-description">
                   Number of days a book can be kept.
                 </small>
               </div>
               <div className="borrow-control">
                 <div className="borrow-input-wrapper">
                   <input
                     type="number"
                     className="borrow-custom-input"
                     value={loanDays}
                     onChange={(e) => setLoanDays(e.target.value)}
                   />
                   <span className="borrow-unit">Days</span>
                 </div>
               </div>
             </div>

             <div className="borrow-setting-row">
               <div className="borrow-info">
                 <span className="borrow-title">Transaction Limit</span>
                 <small className="borrow-description">
                   Max items allowed in a single checkout.
                 </small>
               </div>
               <div className="borrow-control">
                 <input
                   type="number"
                   className="borrow-custom-input"
                   value={maxItems}
                   onChange={(e) => setMaxItems(e.target.value)}
                 />
               </div>
             </div>

             <div className="borrow-setting-row">
               <div className="borrow-info">
                 <span className="borrow-title">Total Borrow Limit</span>
                 <small className="borrow-description">
                   Maximum books a person can hold at once.
                 </small>
               </div>
               <div className="borrow-control">
                 <input
                   type="number"
                   className="borrow-custom-input"
                   value={borrowLimit}
                   onChange={(e) => setBorrowLimit(e.target.value)}
                 />
               </div>
             </div>

             <div className="d-flex justify-content-end gap-2 mt-4">
               <button onClick={handleReset} className="borrow-reset-button">
                 Reset
               </button>
               <button
                 onClick={handleSaveAll}
                 className="borrow-save-button"
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

export default BorrowingPolicySetting;
