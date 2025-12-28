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
  affiliation?: string;
  purpose_of_visit?: string;
  time_in: string | null;
  time_out: string | null;
}

const Attendance = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

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

    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
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


  // filter attendances based on search, visitor type, and date
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

    return matchesSearch && matchesType;
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

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "Visitor",
      "Name",
      "Email",
      "Address",
      "Number",
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
              Total number of guests and patrons who have timed in today.
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
              Active count of visitors currently inside the library (not timed
              out).
            </span>
          </div>
        </div>
      </div>

      <div className="attendance-container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h1 className="text-xl font-semibold mb-0">Library Attendance</h1>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            {/* Search */}
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

            {/* Sort */}
            <div className="position-relative" ref={sortRef}>
              <button
                className="btn btn-outline-secondary d-flex align-items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortMenuOpen(!sortMenuOpen);
                }}
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

            {/* Filter */}
            <div className="position-relative" ref={filterRef}>
              <button
                className="btn btn-outline-secondary d-flex align-items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterMenuOpen(!filterMenuOpen);
                }}
              >
                <i className="bi bi-sliders me-2"></i> Filter
              </button>

              {filterMenuOpen && (
                <div
                  className="filter-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Visitor Type */}
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
                          onClick={() =>
                            setVisitorType(opt as "all" | "patron" | "guest")
                          }
                        >
                          {opt === "all"
                            ? "All"
                            : opt === "patron"
                            ? "Patron"
                            : "Guest"}
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

        {/* Attendance Table */}
        <div className="overflow-x-auto">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Name</th>
                <th>Email</th>
                <th>Address</th>
                <th>Number</th>
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
                    } ${att.suffix || ""}`}</td>
                    <td>{att.email || "-"}</td>
                    <td>{`${att.barangay || "-"}, ${att.city || "-"}, ${
                      att.province || "-"
                    }`}</td>
                    <td>{att.number || "-"}</td>
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
