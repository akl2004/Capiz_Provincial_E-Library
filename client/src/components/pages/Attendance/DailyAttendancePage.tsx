import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

import provinceListData from "../../../data/ph_addresses/province.json";
import cityListData from "../../../data/ph_addresses/city.json";
import barangayListData from "../../../data/ph_addresses/barangay.json";
import MessageModal from "../../MessageModal";

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
    []
  );
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [barangaySuggestions, setBarangaySuggestions] = useState<Barangay[]>(
    []
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
          new Date(a.time_in || 0).getTime()
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
          p.province_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    const selectedProvince = provinceList.find(
      (p) => p.province_name.toLowerCase() === province.toLowerCase()
    );
    if (!selectedProvince) return setCitySuggestions([]);
    setCitySuggestions(
      cityList
        .filter(
          (c) =>
            c.province_code === selectedProvince.province_code &&
            c.city_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleBarangayChange = (value: string) => {
    setBarangay(value);
    const selectedCity = cityList.find(
      (c) => c.city_name.toLowerCase() === city.toLowerCase()
    );
    if (!selectedCity) return setBarangaySuggestions([]);
    setBarangaySuggestions(
      barangayList
        .filter(
          (b) =>
            b.city_code === selectedCity.city_code &&
            b.brgy_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
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
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err) {
      console.error(err);
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
      att.purpose_of_visit.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="attendance-modal-box">
            <button
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              className="attendance-modal-close-btn"
              disabled={loading}
            >
              &times;
            </button>

            {/* Header */}
            <div className="attendance-modal-header text-center mb-0">
              <h3 className="mb-0">TIME IN</h3>
              <p>
                <i>Fill in the information below to record your attendance.</i>
              </p>
            </div>

            {/* Tabs to select Guest or Patron (below header) */}
            <div className="attendance-modal-tabs mb-1 text-center">
              <button
                className={`tab ${mode === "guest" ? "active" : ""}`}
                onClick={() => {
                  setMode("guest");
                  resetForm();
                }}
                type="button"
              >
                GUEST
              </button>

              <button
                className={`tab ${mode === "patron" ? "active" : ""}`}
                onClick={() => {
                  setMode("patron");
                  resetForm();
                }}
                type="button"
              >
                PATRON
              </button>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : (
              <form onSubmit={handleSubmit} className="attendance-form">
                {/* Patron Section */}
                {mode === "patron" && (
                  <div className="patron-section mb-0">
                    <label className="mt-0">Patron ID</label>
                    <input
                      id="patronId"
                      name="patronId"
                      className="mb-3"
                      value={form.patronId}
                      onChange={(e) => handlePatronIdChange(e.target.value)}
                      placeholder="Enter Patron ID..."
                      disabled={loading}
                    />
                  </div>
                )}

                {/* Name Row */}
                <div className="name-row mb-0">
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="First Name"
                    required
                    disabled={loading}
                  />
                  <input
                    name="middle_name"
                    value={form.middle_name}
                    onChange={handleChange}
                    placeholder="Middle Name"
                    disabled={loading}
                  />
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Last Name"
                    required
                    disabled={loading}
                  />
                  <input
                    name="suffix"
                    value={form.suffix}
                    onChange={handleChange}
                    placeholder="Suffix"
                    disabled={loading}
                  />
                </div>

                {/* Province, City, Barangay */}
                <div className="address-row mb-0">
                  <div className="input-wrapper">
                    <input
                      placeholder="Province"
                      value={province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                    />
                    {provinceSuggestions.length > 0 && (
                      <ul className="suggestion-lists">
                        {provinceSuggestions.map((p) => (
                          <li
                            key={p.province_code}
                            onClick={() => {
                              handleProvinceChange(p.province_name);
                              setProvinceSuggestions([]);
                            }}
                            className="suggestion-item"
                          >
                            {p.province_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="input-wrapper">
                    <input
                      placeholder="City"
                      value={city}
                      onChange={(e) => handleCityChange(e.target.value)}
                    />
                    {citySuggestions.length > 0 && (
                      <ul className="suggestion-lists">
                        {citySuggestions.map((c) => (
                          <li
                            key={c.city_code}
                            onClick={() => {
                              handleCityChange(c.city_name);
                              setCitySuggestions([]);
                            }}
                            className="suggestion-item"
                          >
                            {c.city_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="input-wrapper">
                    <input
                      placeholder="Barangay"
                      value={barangay}
                      onChange={(e) => handleBarangayChange(e.target.value)}
                    />
                    {barangaySuggestions.length > 0 && (
                      <ul className="suggestion-lists">
                        {barangaySuggestions.map((b) => (
                          <li
                            key={b.brgy_code}
                            onClick={() => {
                              handleBarangayChange(b.brgy_name);
                              setBarangaySuggestions([]);
                            }}
                            className="suggestion-item"
                          >
                            {b.brgy_name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  disabled={loading}
                />
                <input
                  name="number"
                  value={form.number}
                  onChange={handleChange}
                  placeholder="Contact Number"
                  required
                  disabled={loading}
                />
                <input
                  name="visitor_type"
                  value={form.visitor_type}
                  onChange={handleChange}
                  placeholder="Visitor Type"
                  disabled={loading}
                />
                <input
                  name="affiliation"
                  value={form.affiliation}
                  onChange={handleChange}
                  placeholder="Affiliation / Organization"
                  disabled={loading}
                />
                <textarea
                  name="purpose_of_visit"
                  value={form.purpose_of_visit}
                  onChange={handleChange}
                  placeholder="Purpose of Visit"
                  required
                  disabled={loading}
                />

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                  >
                    Time In
                  </button>
                </div>
              </form>
            )}
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
