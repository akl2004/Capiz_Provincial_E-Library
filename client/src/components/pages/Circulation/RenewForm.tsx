import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

interface Patron {
  patron_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
}

interface BookCopy {
  id: number;
  barcode: string;
  copy_number: number;
  book: {
    title: string;
    call_number: string;
  };
  borrowed_by?: Patron;
  issue_date?: string;
  due_date?: string;
}

interface RenewFormProps {
  onSuccess: () => void;
}

const RenewForm = ({ onSuccess }: RenewFormProps) => {
  const [barcode, setBarcode] = useState("");
  const [bookInfo, setBookInfo] = useState<BookCopy | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [loanDays, setLoanDays] = useState<number>(5);
  const [renewalLimit, setRenewalLimit] = useState<number>(2);

  const [modalMessage, setModalMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const navigate = useNavigate();

  // Fetch default loan days from server
  useEffect(() => {
    AxiosInstance.get("/settings/borrowing-policy")
      .then((res) => setLoanDays(res.data.loan_days))
      .catch(() => setLoanDays(5)); // fallback
  }, []);

  useEffect(() => {
    AxiosInstance.get("/settings/renewal-limit")
      .then((res) => {
        setRenewalLimit(res.data.renewal_limit);
      })
      .catch(() => {
        setRenewalLimit(2);
      });
  }, []);

  // Fetch borrowed book details by barcode
  const fetchBookByBarcode = () => {
    if (!barcode) {
      setBookInfo(null);
      setSearchError(false);
      return;
    }
    setSearching(true);
    setSearchError(false);
    AxiosInstance.get(`/circulations/borrowed-book/${barcode}`)
      .then((res) => {
        setBookInfo(res.data);
        setSearchError(false);
      })
      .catch((err) => {
        setBookInfo(null);
        setSearchError(true);
        setModalMessage({
          type: "error",
          message:
            err.response?.data?.message ||
            "Book not found or not currently borrowed.",
        });
      })
      .finally(() => setSearching(false));
  };

  const handleRenew = () => {
    if (!bookInfo || !bookInfo.borrowed_by) {
      setModalMessage({
        type: "error",
        message: "Please search for a borrowed book first!",
      });
      return;
    }

    setRenewing(true);
    AxiosInstance.post("/circulations/renew", { book_copy_id: bookInfo.id })
      .then(() => {
        setModalMessage({
          type: "success",
          message: "Book renewed successfully!",
        });

        setTimeout(() => {
          const role = localStorage.getItem("role")?.toLowerCase() || "";
          const targetRoute =
            role === "staff" ? "/staff/circulation" : "/admin/circulation";
          onSuccess();
          navigate(targetRoute);
        }, 1500);
      })
      .catch((err) => {
        setModalMessage({
          type: "error",
          message: err.response?.data?.message || "Failed to renew the book.",
        });
      })
      .finally(() => setRenewing(false));
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (barcode) {
        fetchBookByBarcode();
      } else {
        setBookInfo(null);
        setSearchError(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [barcode]);

  const fullName = bookInfo?.borrowed_by
    ? [
        bookInfo.borrowed_by.first_name,
        bookInfo.borrowed_by.middle_name,
        bookInfo.borrowed_by.last_name,
        bookInfo.borrowed_by.suffix,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const renewalDate = new Date().toISOString().split("T")[0];
  const newDueDate = bookInfo?.due_date
    ? new Date(
        new Date(bookInfo.due_date).setDate(
          new Date(bookInfo.due_date).getDate() + loanDays
        )
      )
        .toISOString()
        .split("T")[0]
    : "";

 return (
   <div className="issue-form-container">
     <h1 className="form-title">Renew Book</h1>

     <form className="issue-form" onSubmit={(e) => e.preventDefault()}>
       {/* Top Section: Barcode Input */}
       <div className="form-row mb-2">
         <div className="form-group flex-grow-1">
           <label>
             <i className="bi bi-barcode"></i> Book Barcode
           </label>
           <div className="search-bar-wrapper">
             <input
               type="text"
               className="search-input-field"
               value={barcode}
               onChange={(e) => setBarcode(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === "Enter") e.preventDefault();
               }}
               placeholder="Scan or enter barcode..."
               autoFocus
             />
             <div className="search-status-inside">
               {searching ? (
                 <div className="custom-loading-bars">
                   <div className="loading-bar"></div>
                   <div className="loading-bar"></div>
                   <div className="loading-bar"></div>
                 </div>
               ) : bookInfo ? (
                 <i className="bi bi-check-circle-fill text-success fade-in"></i>
               ) : searchError ? (
                 <i className="bi bi-x-circle-fill text-danger fade-in"></i>
               ) : null}
             </div>
           </div>
         </div>
       </div>

       {/* Structured Info Table (Matches your preferred layout) */}
       <div className="details-card shadow-sm">
         <table className="circ-table">
           <tbody>
             {/* BORROWER SECTION */}
             <tr>
               <th rowSpan={2} className="category-header borrower-cat">
                 BORROWER
               </th>
               <td className="field-label">Patron ID</td>
               <td className="field-value">
                 {bookInfo?.borrowed_by?.patron_id || (
                   <span className="circ-placeholder">---</span>
                 )}
               </td>
             </tr>
             <tr>
               <td className="field-label">Name</td>
               <td className="field-value">
                 {bookInfo?.borrowed_by ? (
                   <span className="text-success fw-bold">{fullName}</span>
                 ) : (
                   <span className="circ-placeholder">Awaiting scan...</span>
                 )}
               </td>
             </tr>

             {/* SPACER ROW */}
             <tr className="spacer-row">
               <td colSpan={3}></td>
             </tr>

             {/* BOOK SECTION */}
             <tr>
               <th rowSpan={3} className="category-header">
                 BOOK
               </th>
               <td className="field-label">Title</td>
               <td className="field-value fw-bold">
                 {bookInfo?.book.title || "-"}
               </td>
             </tr>
             <tr>
               <td className="field-label">Call Number</td>
               <td className="field-value">
                 {bookInfo?.book.call_number || "-"}
               </td>
             </tr>
             <tr>
               <td className="field-label">Copy Number</td>
               <td className="field-value">{bookInfo?.copy_number || "-"}</td>
             </tr>

             {/* SPACER ROW */}
             <tr className="spacer-row">
               <td colSpan={3}></td>
             </tr>

             {/* LOAN DETAILS SECTION */}
             <tr>
               <th rowSpan={4} className="category-header">
                 LOAN
               </th>
               <td className="field-label">Original Issue Date</td>
               <td className="field-value">{bookInfo?.issue_date || "-"}</td>
             </tr>
             <tr>
               <td className="field-label">Original Due Date</td>
               <td className="field-value">{bookInfo?.due_date || "-"}</td>
             </tr>
             <tr>
               <td className="field-label">Renewal Date</td>
               <td className="field-value">{renewalDate || "-"}</td>
             </tr>
             <tr>
               <td className="field-label">New Due Date</td>
               <td className="field-value fw-bold">{newDueDate || "-"}</td>
             </tr>
           </tbody>
         </table>
       </div>

       {/* Actions */}
       <div className="form-actions mt-4">
         <button
           type="button"
           className="confirm-btn"
           onClick={handleRenew}
           disabled={renewing || searching || !bookInfo}
         >
           {renewing && <span className="spinner-tiny"></span>}
           {renewing ? "Renewing..." : "Renew Book"}
         </button>
       </div>
     </form>

     {modalMessage && (
       <MessageModal
         type={modalMessage.type}
         message={modalMessage.message}
         onClose={() => setModalMessage(null)}
       />
     )}
   </div>
 );
};

export default RenewForm;
