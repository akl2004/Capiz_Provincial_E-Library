import { useEffect, useState, useRef } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

interface Attendance {
  id: number;
  type: "guest" | "patron";
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email?: string;
  province?: string;
  city?: string;
  barangay?: string;
  number?: string;
  visitor_type?: string;
  affiliation?: string;
  purpose_of_visit?: string;
  time_in: string | null;
  time_out: string | null;
}

const Attendance = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // NEW: Flexible Date States
  const [dateRange, setDateRange] = useState<
    "today" | "week" | "month" | "all" | "custom"
  >("month");
  const [customDays, setCustomDays] = useState<number>(14);

  // Sort dropdown state
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  // Filter dropdown state
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [showVisitorTypeOptions, setShowVisitorTypeOptions] = useState(false);
  const [visitorType, setVisitorType] = useState<"all" | "patron" | "guest">(
    "all"
  );
  const filterRef = useRef<HTMLDivElement>(null);

  const [tally, setTally] = useState({
    visitors_today: 0,
    current_visitors: 0,
  });

  useEffect(() => {
    fetchAttendances();
    document.title = "Attendance";
  }, []);

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const res = await AxiosInstance.get("/attendances");
      setAttendances(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchTally = async () => {
      try {
        const response = await AxiosInstance.get("/attendance/tally");
        setTally(response.data);
      } catch (error) {
        console.error("Error fetching attendance tally:", error);
      }
    };
    fetchTally();
    const interval = setInterval(fetchTally, 60000);
    return () => clearInterval(interval);
  }, []);

  // UPDATED: Dynamic Filter Logic
  const filteredAttendances = attendances.filter((att) => {
    const matchesSearch =
      `${att.first_name} ${att.middle_name || ""} ${att.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      att.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${att.province || ""} ${att.city || ""} ${att.barangay || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      att.purpose_of_visit?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = visitorType === "all" ? true : att.type === visitorType;

    // Date Filtering logic
    // Date Filtering logic
    let matchesDate = true;
    if (dateRange !== "all" && att.time_in) {
      const attendanceDate = new Date(att.time_in).getTime();
      const cutoff = new Date();

      // Reset hours to the very beginning of the day (12:00 AM)
      // This ensures "2 days" means "2 full calendar days ago"
      cutoff.setHours(0, 0, 0, 0);

      if (dateRange === "today") {
        // Cutoff is already start of today
      } else if (dateRange === "week") {
        cutoff.setDate(cutoff.getDate() - 7);
      } else if (dateRange === "month") {
        cutoff.setDate(cutoff.getDate() - 30);
      } else if (dateRange === "custom") {
        // We subtract (customDays - 1) because "today" is the 1st day.
        // If user wants 2 days, they want today (0) and yesterday (1).
        cutoff.setDate(cutoff.getDate() - (customDays - 1));
      }

      matchesDate = attendanceDate >= cutoff.getTime();
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Sort attendance by selected field + order
  const sortedAttendances = [...filteredAttendances].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;
    let valA: string | number = "";
    let valB: string | number = "";

    if (sortField === "name") {
      valA = `${a.first_name} ${a.middle_name ?? ""} ${a.last_name} ${
        a.suffix ?? ""
      }`
        .trim()
        .toLowerCase();
      valB = `${b.first_name} ${b.middle_name ?? ""} ${b.last_name} ${
        b.suffix ?? ""
      }`
        .trim()
        .toLowerCase();
    } else if (sortField === "time_in") {
      valA = a.time_in ? new Date(a.time_in).getTime() : 0;
      valB = b.time_in ? new Date(b.time_in).getTime() : 0;
    } else if (sortField === "time_out") {
      valA = a.time_out ? new Date(a.time_out).getTime() : 0;
      valB = b.time_out ? new Date(b.time_out).getTime() : 0;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sortRef.current &&
        !sortRef.current.contains(e.target as Node) &&
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setSortMenuOpen(false);
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportCSV = () => {
    const headers = [
      "Visitor",
      "Name",
      "Email",
      "Address",
      "Number",
      "Visitor Type",
      "Affiliation",
      "Purpose",
      "Time In",
      "Time Out",
      "Status",
    ];
    const rows = filteredAttendances.map((att) => [
      `"${att.type === "patron" ? "Patron" : "Guest"}"`,
      `"${att.first_name} ${att.middle_name || ""} ${att.last_name} ${
        att.suffix || ""
      }"`,
      `"${att.email || "-"}"`,
      `"${att.province || "-"}, ${att.city || "-"}, ${att.barangay || "-"}"`,
      `"${att.number || "-"}"`,
      `"${att.visitor_type || "-"}"`,
      `"${att.affiliation || "-"}"`,
      `"${att.purpose_of_visit || "-"}"`,
      `"${att.time_in ? new Date(att.time_in).toLocaleString() : "-"}"`,
      `"${att.time_out ? new Date(att.time_out).toLocaleString() : "-"}"`,
      `"${att.time_out ? "Timed Out" : "Timed In"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "attendance_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="attendance-tally-container">
        <div className="attendance-tally-card">
          <div className="attendance-tally-count">{tally.visitors_today}</div>
          <div className="attendance-tally-label">
            <span className="attendance-tally-title">Visitors Today</span>
            <span className="attendance-tally-subtitle">
              Total guests and patrons timed in today.
            </span>
          </div>
        </div>

        <div className="attendance-tally-card">
          <div className="attendance-tally-count">{tally.current_visitors}</div>
          <div className="attendance-tally-label">
            <span className="attendance-tally-title">
              Current Visitors Inside
            </span>
            <span className="attendance-tally-subtitle">
              Active visitors currently in the library.
            </span>
          </div>
        </div>
      </div>

      <div className="attendance-container">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h1 className="text-xl font-semibold mb-0">Library Attendance</h1>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            {/* NEW: Dynamic Date Range Selector */}
            <div className="d-flex align-items-center gap-2 bg-white border rounded px-2 py-1">
              <i className="bi bi-calendar3 text-muted"></i>
              <select
                className="form-select form-select-sm border-0 shadow-none"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                style={{ width: "auto" }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
                <option value="custom">Custom Days</option>
              </select>

              {dateRange === "custom" && (
                <div className="d-flex align-items-center gap-1 border-start ps-2">
                  <input
                    type="number"
                    className="form-control form-control-sm no-spinner"
                    style={{ width: "60px", textAlign: "center" }}
                    value={customDays}
                    onChange={(e) =>
                      setCustomDays(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                  <small className="text-muted">days</small>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="d-flex gap-2 align-items-center w-100">
            {/* Search */}
            <div
              className="position-relative flex-grow-1"
            >
              <span
                className="position-absolute top-50 translate-middle-y ps-2"
                style={{ left: "10px", color: "#6c757d" }}
              >
                <i className="bi bi-search"></i>
              </span>
              <input
                className="form-control ps-5"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="position-relative" ref={sortRef}>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
              >
                <i className="bi bi-sort-alpha-down me-2"></i> Sort
              </button>
              {sortMenuOpen && (
                <div
                  className="sort-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sort-fields">
                    {[
                      { field: "name", label: "Name" },
                      { field: "time_in", label: "Time In" },
                      { field: "time_out", label: "Time Out" },
                    ].map(({ field, label }) => (
                      <div
                        key={field}
                        className={`sort-field ${
                          sortField === field ? "active" : ""
                        }`}
                        onClick={() =>
                          setSortField(sortField === field ? null : field)
                        }
                      >
                        {sortField === field && (
                          <span className="selected-dot"></span>
                        )}
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="sort-order">
                    <button
                      className={`sort-btn ${
                        sortOrder === "asc" ? "active" : ""
                      }`}
                      onClick={() =>
                        setSortOrder(sortOrder === "asc" ? null : "asc")
                      }
                    >
                      ASC
                    </button>
                    <button
                      className={`sort-btn ${
                        sortOrder === "desc" ? "active" : ""
                      }`}
                      onClick={() =>
                        setSortOrder(sortOrder === "desc" ? null : "desc")
                      }
                    >
                      DESC
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="position-relative" ref={filterRef}>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              >
                <i className="bi bi-sliders me-2"></i> Filter
              </button>
              {filterMenuOpen && (
                <div
                  className="filter-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`filter-section-header ${
                      visitorType !== "all" ? "active" : ""
                    }`}
                    onClick={() =>
                      setShowVisitorTypeOptions(!showVisitorTypeOptions)
                    }
                  >
                    Visitor Type{" "}
                    <i
                      className={`bi ${
                        showVisitorTypeOptions
                          ? "bi-chevron-down"
                          : "bi-chevron-right"
                      } ms-2`}
                    ></i>
                  </div>
                  {showVisitorTypeOptions && (
                    <div className="d-flex flex-column">
                      {["all", "patron", "guest"].map((opt) => (
                        <div
                          key={opt}
                          className={`filter-item ${
                            visitorType === opt ? "active" : ""
                          }`}
                          onClick={() => setVisitorType(opt as any)}
                        >
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={exportCSV}>
              <i className="bi bi-file-earmark-spreadsheet me-2"></i> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Visitor</th>
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
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-4">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : sortedAttendances.length > 0 ? (
                sortedAttendances.map((att) => (
                  <tr key={att.id}>
                    <td>{att.type === "patron" ? "Patron" : "Guest"}</td>
                    <td>{`${att.first_name} ${att.middle_name || ""} ${
                      att.last_name
                    }`}</td>
                    <td>{att.email || "-"}</td>
                    <td>{`${att.province || "-"}, ${att.barangay || "-"}, ${
                      att.city || "-"
                    }`}</td>
                    <td>{att.number || "-"}</td>
                    <td>{att.visitor_type || "-"}</td>
                    <td>{att.affiliation || "-"}</td>
                    <td>{att.purpose_of_visit || "-"}</td>
                    <td>
                      {att.time_in
                        ? new Date(att.time_in).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td>
                      {att.time_out
                        ? new Date(att.time_out).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
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
      </div>
    </>
  );
};

export default Attendance;
