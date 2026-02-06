import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

import provinceListData from "../../../data/ph_addresses/province.json";
import cityListData from "../../../data/ph_addresses/city.json";
import barangayListData from "../../../data/ph_addresses/barangay.json";
import MessageModal from "../../MessageModal";

import civilian from "../../../assets/visitor_type/citizen.png";

let globalScanBuffer = "";
let globalLastScanTime = 0;

interface Attendance {
  id: number;
  patron_id: string | number | null;
  patron?: {
    patron_id: string;
  };
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  gender?: string;
  province: string;
  city: string;
  barangay: string;
  email?: string;
  number?: string;
  visitor_type?: string;
  affiliation?: string;
  purpose_of_visit: string;
  time_in: string | null;
  time_out: string | null;
}

const provinceList = provinceListData as Province[];
const cityList = cityListData as City[];
const barangayList = barangayListData as Barangay[];

// Types
interface Province {
  province_code: string;
  province_name: string;
  region_code: string;
}

interface City {
  city_code: string;
  city_name: string;
  province_code: string;
}

interface Barangay {
  brgy_code: string;
  brgy_name: string;
  city_code: string;
  province_code: string;
}

const DailyAttendancePage = () => {
  const [mode, setMode] = useState("guest");
  const [loading, setLoading] = useState(false);
  const [loadingAttendances, setLoadingAttendances] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    patronId: "",
    dbPatronId: null,
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    gender: "",
    province: "",
    city: "",
    barangay: "",
    email: "",
    number: "",
    visitor_type: "",
    affiliation: "",
    purpose_of_visit: "",
  });

  // Address parts
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");

  // Suggestions
  const [provinceSuggestions, setProvinceSuggestions] = useState<Province[]>(
    [],
  );
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [barangaySuggestions, setBarangaySuggestions] = useState<Barangay[]>(
    [],
  );

  useEffect(() => {
    fetchTodayAttendances();
    document.title = "Daily Attendance";
  }, []);

  const fetchTodayAttendances = async () => {
    setLoadingAttendances(true);
    try {
      const res = await AxiosInstance.get("/attendances/today");
      // Sort newest first (based on time_in or id)
      const sorted = res.data.sort(
        (a: Attendance, b: Attendance) =>
          new Date(b.time_in || 0).getTime() -
          new Date(a.time_in || 0).getTime(),
      );
      setAttendances(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendances(false);
    }
  };

  // Suggestion handlers
  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setProvinceSuggestions(
      provinceList
        .filter((p) =>
          p.province_name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 4),
    );
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    const selectedProvince = provinceList.find(
      (p) => p.province_name.toLowerCase() === province.toLowerCase(),
    );
    if (!selectedProvince) return setCitySuggestions([]);
    setCitySuggestions(
      cityList
        .filter(
          (c) =>
            c.province_code === selectedProvince.province_code &&
            c.city_name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 4),
    );
  };

  const handleBarangayChange = (value: string) => {
    setBarangay(value);
    const selectedCity = cityList.find(
      (c) => c.city_name.toLowerCase() === city.toLowerCase(),
    );
    if (!selectedCity) return setBarangaySuggestions([]);
    setBarangaySuggestions(
      barangayList
        .filter(
          (b) =>
            b.city_code === selectedCity.city_code &&
            b.brgy_name.toLowerCase().includes(value.toLowerCase()),
        )
        .slice(0, 4),
    );
  };

  const resetForm = () => {
    setForm({
      patronId: "",
      dbPatronId: null,
      first_name: "",
      middle_name: "",
      last_name: "",
      suffix: "",
      gender: "",
      province: "",
      city: "",
      barangay: "",
      email: "",
      number: "",
      visitor_type: "",
      affiliation: "",
      purpose_of_visit: "",
    });

    setProvince("");
    setCity("");
    setBarangay("");

    setProvinceSuggestions([]);
    setCitySuggestions([]);
    setBarangaySuggestions([]);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Define which fields are mandatory
  const isFormValid =
    form.first_name.trim() !== "" &&
    form.last_name.trim() !== "" &&
    form.number.trim() !== "" &&
    form.purpose_of_visit.trim() !== "" &&
    province.trim() !== "" &&
    city.trim() !== "" &&
    barangay.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      setMsgModal({
        show: true,
        type: "error",
        message:
          "Please fill in all required fields (Name, Address, Contact, and Purpose).",
      });
      return;
    }

    setLoading(true);
    try {
      await AxiosInstance.post("/attendances", {
        ...form,
        province,
        city,
        barangay,
        patron_id: form.dbPatronId || null,
      });
      setOpen(false);
      setForm({
        patronId: "",
        dbPatronId: null,
        first_name: "",
        middle_name: "",
        last_name: "",
        suffix: "",
        gender: "",
        province: "",
        city: "",
        barangay: "",
        email: "",
        number: "",
        visitor_type: "",
        affiliation: "",
        purpose_of_visit: "",
      });
      setProvince("");
      setCity("");
      setBarangay("");
      fetchTodayAttendances();

      setOpen(false);
      resetForm();
      fetchTodayAttendances();

      setMsgModal({
        show: true,
        type: "success",
        message: "Attendance recorded successfully!",
      });
    } catch (err) {
      console.error(err);
      setMsgModal({
        show: true,
        type: "error",
        message: "Failed to record attendance.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = async (id: number) => {
    try {
      await AxiosInstance.post(`/attendances/${id}/timeout`);
      fetchTodayAttendances();
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-fill by Patron ID (use patron_id, not internal id)
  const handlePatronIdChange = async (patronId: string) => {
    setForm((prev) => ({ ...prev, patronId }));

    if (!patronId) return;

    try {
      const res = await AxiosInstance.get(`/patrons/by-id/${patronId}`);
      const patron = res.data;

      setForm((prev) => ({
        ...prev,
        first_name: patron.first_name,
        middle_name: patron.middle_name || "",
        last_name: patron.last_name,
        suffix: patron.suffix || "",
        gender: patron.gender,
        province: patron.province || "",
        city: patron.city || "",
        barangay: patron.barangay || "",
        email: patron.email || "",
        number: patron.number || "",
        visitor_type: patron.visitor_type || "",
        affiliation: prev.affiliation,
        purpose_of_visit: prev.purpose_of_visit,
        dbPatronId: patron.id,
      }));
      setProvince(patron.province || "");
      setCity(patron.city || "");
      setBarangay(patron.barangay || "");
    } catch (err) {
      console.error("Patron not found", err);
    }
  };

  // Filtered attendances
  const filteredAttendances = attendances.filter(
    (att) =>
      `${att.first_name} ${att.middle_name || ""} ${att.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      att.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${att.province} ${att.city} ${att.barangay}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      att.purpose_of_visit.toLowerCase().includes(searchTerm.toLowerCase()),
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

  // hands free time out
  const processAutoScan = async (scannedId: string) => {
    const cleanId = scannedId.trim().toUpperCase();
    if (!cleanId) return;

    const activeAttendance = attendances.find((att) => {
      const barcodeFromDB = att.patron?.patron_id?.toUpperCase();
      return barcodeFromDB === cleanId && att.time_out === null;
    });

    if (activeAttendance) {
      setLoading(true);
      try {
        await AxiosInstance.post(`/attendances/${activeAttendance.id}/timeout`);
        fetchTodayAttendances();

        // TRIGGER SUCCESS MODAL
        setMsgModal({
          show: true,
          type: "success",
          message: `Goodbye, ${activeAttendance.first_name}! Time-out recorded.`,
        });
      } catch (err) {
        setMsgModal({
          show: true,
          type: "error",
          message: "Failed to process time-out. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    } else {
      setMode("patron");
      setOpen(true);
      handlePatronIdChange(cleanId);
    }
  };

  // 2. FIXED KEYBOARD LISTENER
  useEffect(() => {
    let timeoutId: any;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const ignoredKeys = ["Shift", "Control", "Alt", "CapsLock", "Tab"];
      if (ignoredKeys.includes(e.key)) return;
      if (open) return;

      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
      )
        return;

      const currentTime = Date.now();

      // 1. If this is the start of a new scan, clear the old buffer
      if (currentTime - globalLastScanTime > 100) {
        globalScanBuffer = "";
      }
      globalLastScanTime = currentTime;

      // 2. Clear any existing "finish" timer because we just got a new character
      if (timeoutId) clearTimeout(timeoutId);

      if (e.key === "Enter") {
        e.preventDefault();
        if (globalScanBuffer.length > 0) {
          processAutoScan(globalScanBuffer);
          globalScanBuffer = "";
        }
      } else if (e.key.length === 1) {
        globalScanBuffer += e.key;
        console.log("Current Buffer:", globalScanBuffer);

        // 3. SMART TIMER: If no more keys come in for 50ms, process it!
        timeoutId = setTimeout(() => {
          if (globalScanBuffer.length > 3) {
            // Only process if it looks like a real ID
            console.warn("Timer triggered auto-submit for:", globalScanBuffer);
            processAutoScan(globalScanBuffer);
            globalScanBuffer = "";
          }
        }, 50);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [attendances, open]);

  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => setCurrentStep((prev) => prev + 1);
  const prevStep = () => setCurrentStep((prev) => prev - 1);

  const isStep1Valid =
    form.first_name && form.last_name && form.gender && form.number;
  const isStep2Valid = province && city && barangay;

  return (
    <div className="attendance-container">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h1 className="text-xl font-semibold mb-0">Today's Attendance</h1>
          <p className="mb-0">
            <i>View and manage all attendance records for today.</i>
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="position-relative" style={{ maxWidth: "300px" }}>
            <span
              className="position-absolute top-50 translate-middle-y ps-2"
              style={{ left: "10px", color: "#6c757d" }}
            >
              <i className="bi bi-search"></i>
            </span>
            <input
              className="form-control ps-5 pe-5"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => setOpen(true)}>
            Time In
          </button>
        </div>
      </div>
      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Gender</th>
              <th>Email</th>
              <th>Address</th>
              <th>Number</th>
              <th>Visitor Type</th>
              <th>Affiliation</th>
              <th>Purpose</th>
              <th>Time In</th>
              <th>Time Out</th>
            </tr>
          </thead>
          <tbody>
            {loadingAttendances ? (
              <tr>
                <td colSpan={10}>
                  <LoadingSpinner />
                </td>
              </tr>
            ) : filteredAttendances.length > 0 ? (
              filteredAttendances.map((att) => (
                <tr key={att.id}>
                  <td>{`${att.first_name} ${att.middle_name || ""} ${
                    att.last_name
                  } ${att.suffix || ""}`}</td>
                  <td>{att.gender || "-"}</td>
                  <td>{att.email || "-"}</td>
                  <td>{`${att.barangay}, ${att.city}, ${att.province}`}</td>
                  <td>{att.number || "-"}</td>
                  <td>{att.visitor_type || "-"}</td>
                  <td>{att.affiliation || "-"}</td>
                  <td>{att.purpose_of_visit}</td>
                  <td>
                    {att.time_in
                      ? new Date(att.time_in).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td>
                    {att.time_out ? (
                      new Date(att.time_out).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    ) : (
                      <button
                        onClick={() => handleTimeOut(att.id)}
                        className="timeout-btn"
                      >
                        Time Out
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="text-center py-4">
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="attendance-modal-overlay">
          <div className="multi-step-modal">
            {/* LEFT SIDEBAR - Step Indicators */}
            <div className="step-sidebar">
              <div className="sidebar-header">
                <h3>Step {currentStep}</h3>
                <p>Record Attendance</p>
              </div>

              <div className="step-list">
                <div
                  className={`step-item ${currentStep === 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}
                >
                  <div className="step-circle">1</div>
                  <span>Personal Info</span>
                </div>
                <div
                  className={`step-item ${currentStep === 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}
                >
                  <div className="step-circle">2</div>
                  <span>Address</span>
                </div>
                <div
                  className={`step-item ${currentStep === 3 ? "active" : ""}`}
                >
                  <div className="step-circle">3</div>
                  <span>Purpose</span>
                </div>
              </div>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="step-content-area">
              <button
                className="close-x"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                &times;
              </button>

              <div className="content-inner">
                {/* STEP 1: PERSONAL INFO */}
                {currentStep === 1 && (
                  <div className="step-pane">
                    <h2>Who are you?</h2>
                    <p className="subtitle">
                      Select your status and enter basic details.
                    </p>

                    <div className="mode-toggle mb-4">
                      <button
                        type="button"
                        className={mode === "guest" ? "active" : ""}
                        onClick={() => setMode("guest")}
                      >
                        GUEST
                      </button>
                      <button
                        type="button"
                        className={mode === "patron" ? "active" : ""}
                        onClick={() => setMode("patron")}
                      >
                        PATRON
                      </button>
                    </div>

                    {mode === "patron" && (
                      <input
                        className="form-control mb-3"
                        placeholder="Scan or Enter Patron ID"
                        value={form.patronId}
                        onChange={(e) => handlePatronIdChange(e.target.value)}
                      />
                    )}

                    <div className="row g-2 mb-3">
                      <div className="col-md-5">
                        <input
                          name="first_name"
                          className="form-control"
                          placeholder="First Name"
                          value={form.first_name}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-2">
                        <input
                          name="middle_name"
                          className="form-control"
                          placeholder="M.I."
                          value={form.middle_name}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-md-5">
                        <input
                          name="last_name"
                          className="form-control"
                          placeholder="Last Name"
                          value={form.last_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-md-4">
                        <select
                          name="gender"
                          className="form-select"
                          value={form.gender}
                          onChange={handleChange}
                        >
                          <option value="">Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="col-md-8">
                        <input
                          name="number"
                          className="form-control"
                          placeholder="Mobile Number"
                          value={form.number}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <button
                      className="btn-next"
                      disabled={!isStep1Valid}
                      onClick={nextStep}
                    >
                      Next: Address &rarr;
                    </button>
                  </div>
                )}

                {/* STEP 2: ADDRESS */}
                {currentStep === 2 && (
                  <div className="step-pane">
                    <h2>Where are you from?</h2>
                    <p className="subtitle">
                      Please provide your current address details.
                    </p>

                    <div className="address-stack">
                      <div className="input-wrapper mb-3">
                        <input
                          className="form-control"
                          placeholder="Province"
                          value={province}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                        />
                        {/* Suggestions list here */}
                      </div>
                      <div className="input-wrapper mb-3">
                        <input
                          className="form-control"
                          placeholder="City"
                          value={city}
                          onChange={(e) => handleCityChange(e.target.value)}
                        />
                      </div>
                      <div className="input-wrapper mb-3">
                        <input
                          className="form-control"
                          placeholder="Barangay"
                          value={barangay}
                          onChange={(e) => handleBarangayChange(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn-back" onClick={prevStep}>
                        Back
                      </button>
                      <button
                        className="btn-next"
                        disabled={!isStep2Valid}
                        onClick={nextStep}
                      >
                        Next: Purpose &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: PURPOSE */}
                {currentStep === 3 && (
                  <div className="step-pane">
                    <h2>Who are you today?</h2>
                    <p className="subtitle">
                      Select your category to help us track attendance better.
                    </p>

                    <div className="visitor-type-grid mb-4">
                      {/* Student Option */}
                      <div
                        className={`type-card ${form.visitor_type === "Student" ? "selected" : ""}`}
                        onClick={() =>
                          setForm({ ...form, visitor_type: "Student" })
                        }
                      >
                        <div className="card-icon">
                          <img
                            src="./src/assets/visitor_type/student.png"
                            alt="Student"
                          />
                        </div>
                        <span>Student</span>
                        <div className="radio-indicator"></div>
                      </div>

                      {/* Public Worker Option */}
                      <div
                        className={`type-card ${form.visitor_type === "Public Worker" ? "selected" : ""}`}
                        onClick={() =>
                          setForm({ ...form, visitor_type: "Public Worker" })
                        }
                      >
                        <div className="card-icon">
                          <img
                            src="./src/assets/visitor_type/worker.png"
                            alt="Public Worker"
                          />
                        </div>
                        <span>Public Worker</span>
                        <div className="radio-indicator"></div>
                      </div>

                      {/* Civilian Option */}
                      <div
                        className={`type-card ${form.visitor_type === "Civilian" ? "selected" : ""}`}
                        onClick={() =>
                          setForm({ ...form, visitor_type: "Civilian" })
                        }
                      >
                        <div className="card-icon">
                          <img
                            src="./src/assets/visitor_type/citizen.png"
                            alt="Civilian"
                          />
                        </div>
                        <span>Civilian</span>
                        <div className="radio-indicator"></div>
                      </div>
                    </div>

                    <div className="purpose-section">
                      <label className="form-label">Purpose of Visit</label>
                      <textarea
                        name="purpose_of_visit"
                        className="form-control mb-4"
                        rows={3}
                        placeholder="e.g., Research, Borrowing books, etc."
                        value={form.purpose_of_visit}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn-back" onClick={prevStep}>
                        Back
                      </button>
                      <button
                        className="btn-submit"
                        onClick={handleSubmit}
                        disabled={loading || !form.visitor_type}
                      >
                        {loading ? "Submitting..." : "Submit Attendance"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

export default DailyAttendancePage;
