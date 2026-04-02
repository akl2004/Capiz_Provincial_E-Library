import { Fragment, useEffect, useRef, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import IssueForm from "./IssueForm";
import ReturnForm from "./ReturnForm";
import RenewForm from "./RenewForm";
import bookIcon from "../../../assets/book_icon.png";
import LoadingSpinner from "../../LoadingSpinner";
import LostForm from "./LostForm";
import SettlementTracker from "./SettlementTracker";

interface Circulation {
  id: number;
  patron: {
    patron_id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
  };
  book_copy: {
    id: number;
    barcode: string;
    copy_number: string;
    book: {
      title: string;
      call_number: string;
    };
  };
  issue_date: string;
  due_date: string;
  date_returned: string | null;
  updated_at?: string;
  renewal_date?: string;
  renewal_count?: number;
  status: string;
  lost_resolution?: "Payment" | "Replacement";
  is_paid: boolean;
  renewed?: boolean;
  fine: number;
}

const CirculationPage = () => {
  const [records, setRecords] = useState<Circulation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<
    "log" | "issue" | "return" | "renew" | "lost" | "settlements"
  >("log");

  // Track which tally card dropdown is open
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const tallyRef = useRef<HTMLDivElement | null>(null);

  // Track period selection for each tally card
  const [activePeriodMap, setActivePeriodMap] = useState<{
    [key: string]: "This Week" | "This Month" | "This Year";
  }>({
    Issued: "This Week",
    Returned: "This Week",
    Overdue: "This Week",
    Missing: "This Week",
    Lost: "This Week",
  });

  // Sorting
  const [sortField, setSortField] = useState<
    "patron" | "book" | "issue_date" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter dropdown toggle
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Status filter (already exists)
  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  const [activeFilterSection, setActiveFilterSection] = useState<
    "status" | "date" | null
  >(null);

  const renderStatusBadge = (loan: Circulation) => {
    const badgeStyle: React.CSSProperties = {
      width: "100px",
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 0",
      lineHeight: "1.1",
      borderRadius: "6px",
    };

    if (loan.status === "Lost") {
      let subStatus = "LOST";
      let variant = "bg-danger";

      if (loan.lost_resolution === "Payment") {
        variant = loan.is_paid ? "bg-secondary" : "bg-secondary";
        subStatus = loan.is_paid ? "PAID" : "UNPAID";
      } else if (loan.lost_resolution === "Replacement") {
        const isReplaced = loan.is_paid;
        variant = isReplaced ? "bg-secondary" : "bg-secondary";
        subStatus = isReplaced ? "REPLACED" : "PENDING";
      }

      return (
        <span className={`badge ${variant}`} style={badgeStyle}>
          <span style={{ fontWeight: "800", fontSize: "0.75rem" }}>LOST</span>
          <span
            style={{
              fontSize: "0.55rem",
              borderTop: "1px solid rgba(255,255,255,0.3)",
              width: "100%",
              marginTop: "2px",
              paddingTop: "2px",
              letterSpacing: "0.5px",
            }}
          >
            {subStatus}
          </span>
        </span>
      );
    }

    if (loan.status === "Returned" || loan.status === "Returned Late") {
      const isLate = loan.status === "Returned Late";
      const subStatus = isLate ? "LATE" : "ON TIME";
      const variant = isLate ? "bg-success" : "bg-success";

      return (
        <span className={`badge ${variant}`} style={badgeStyle}>
          <span style={{ fontWeight: "800", fontSize: "0.75rem" }}>
            RETURNED
          </span>
          <span
            style={{
              fontSize: "0.55rem",
              borderTop: "1px solid rgba(255,255,255,0.3)",
              width: "100%",
              marginTop: "2px",
              paddingTop: "2px",
              letterSpacing: "0.5px",
            }}
          >
            {subStatus}
          </span>
        </span>
      );
    }

    // Standard statuses (Missing, Issued, etc.)
    const statusClasses: Record<string, string> = {
      Issued: "bg-primary",
      Overdue: "bg-danger",
      Missing: "bg-missing",
    };

    return (
      <span
        className={`badge ${statusClasses[loan.status] || "bg-secondary"}`}
        style={{ ...badgeStyle, padding: "10px 0" }}
      >
        <span style={{ fontWeight: "800", fontSize: "0.75rem" }}>
          {loan.status === "Returned Late" ? "LATE" : loan.status.toUpperCase()}
        </span>
      </span>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        sortMenuOpen &&
        sortRef.current &&
        !sortRef.current.contains(target)
      ) {
        setSortMenuOpen(false);
      }
      if (
        filterMenuOpen &&
        filterRef.current &&
        !filterRef.current.contains(target)
      ) {
        setFilterMenuOpen(false);
      }
      if (
        activeDropdown &&
        tallyRef.current &&
        !tallyRef.current.contains(target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeDropdown, sortMenuOpen, filterMenuOpen]);

  const getStatus = (record: Circulation) => {
    return record.status;
  };

  const handleActionSuccess = () => {
    fetchRecords();
    setActiveTab("log");
    window.scrollTo(0, 0);
  };

  const toggleRow = (id: number) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const filterByPeriod = (
    dateString: string | null | undefined,
    period: "This Week" | "This Month" | "This Year",
  ) => {
    // 1. If no date exists, skip it
    if (!dateString) return false;

    // 2. Fix Laravel SQL date strings (changes "2026-03-26 10:57:07" to "2026-03-26T10:57:07")
    const safeDateString = dateString.replace(" ", "T");
    const targetDate = new Date(safeDateString);

    // 3. Fallback if the date is completely unreadable
    if (isNaN(targetDate.getTime())) {
      console.warn("Could not read this date format:", dateString);
      return false;
    }

    const today = new Date();

    if (period === "This Week") {
      const firstDayOfWeek = new Date(today);
      const day = today.getDay();
      // Start week on Monday
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);

      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0, 0, 0, 0);

      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);

      return targetDate >= firstDayOfWeek && targetDate <= lastDayOfWeek;
    }

    if (period === "This Month") {
      return (
        targetDate.getMonth() === today.getMonth() &&
        targetDate.getFullYear() === today.getFullYear()
      );
    }

    if (period === "This Year") {
      return targetDate.getFullYear() === today.getFullYear();
    }

    return true;
  };

  const fetchRecords = () => {
    setLoading(true);
    AxiosInstance.get("/circulations")
      .then((res) => setRecords(res.data))
      .catch((err) => console.error(err.response?.data || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = "Circulation";
    fetchRecords();
  }, [activeTab]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      [
        rec.patron?.patron_id.toString(),
        rec.patron?.first_name,
        rec.patron?.middle_name,
        rec.patron?.last_name,
        rec.patron?.suffix,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      rec.book_copy?.book?.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      rec.book_copy?.barcode.includes(searchTerm);

    const matchesStatus =
      !filterStatus ||
      (filterStatus === "Renewed"
        ? rec.renewed
        : getStatus(rec) === filterStatus);

    const recDate = new Date(rec.issue_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const matchesDate =
      (!start || recDate >= start) && (!end || recDate <= end);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Tally counts
  const tally = {
    Issued: records.filter(
      (r) =>
        getStatus(r) === "Issued" &&
        filterByPeriod(r.issue_date, activePeriodMap["Issued"]),
    ).length,
    Returned: records.filter(
      (r) =>
        (getStatus(r) === "Returned" || getStatus(r) === "Returned Late") &&
        // Prioritize date_returned, but fallback to issue_date just in case
        filterByPeriod(
          r.date_returned || r.issue_date,
          activePeriodMap["Returned"],
        ),
    ).length,
    Overdue: records.filter((r) => getStatus(r) === "Overdue").length,
    Missing: records.filter(
      (r) =>
        getStatus(r) === "Missing" &&
        filterByPeriod(r.issue_date, activePeriodMap["Missing"]),
    ).length,
    Lost: records.filter(
      (r) =>
        getStatus(r) === "Lost" &&
        filterByPeriod(r.updated_at || r.issue_date, activePeriodMap["Lost"]),
    ).length,
  };

  const getStatusColor = (record: Circulation) => {
    const status = getStatus(record);
    switch (status) {
      case "Issued":
        return "#0d6efd"; // blue
      case "Returned":
        return "#198754"; // green
      case "Overdue":
        return "#dc3545"; // red
      case "Returned Late":
        return "#198754"; // green
      case "Missing":
        return "#ddb72d"; // yellow
      default:
        return "#6c757d"; // gray for others
    }
  };

  // Apply sorting to filtered records
  let sortedRecords = [...filteredRecords];

  // If no sortField is selected, default to issue_date descending
  const fieldToSort = sortField || "issue_date";
  const orderToSort = sortField ? sortOrder : "desc";

  sortedRecords.sort((a, b) => {
    let aVal: string | Date = "";
    let bVal: string | Date = "";

    switch (fieldToSort) {
      case "patron":
        aVal = [a.patron.first_name, a.patron.last_name].join(" ");
        bVal = [b.patron.first_name, b.patron.last_name].join(" ");
        break;
      case "book":
        aVal = a.book_copy.book.title;
        bVal = b.book_copy.book.title;
        break;
      case "issue_date":
        aVal = new Date(a.issue_date);
        bVal = new Date(b.issue_date);
        break;
    }

    // Primary Sort
    if (aVal < bVal) return orderToSort === "asc" ? -1 : 1;
    if (aVal > bVal) return orderToSort === "asc" ? 1 : -1;
    return b.id - a.id;
  });

  // Use `sortedRecords` for pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord,
  );

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  return (
    <>
      {/* Tally Panel */}
      <div className="circulation-tally" ref={tallyRef}>
        {Object.entries(tally).map(([key, count]) => {
          let cardClass = "";
          if (key === "Issued") cardClass = "tally-borrowed";
          else if (key === "Returned") cardClass = "tally-returned";
          else if (key === "Overdue") cardClass = "tally-overdue";
          else if (key === "Missing") cardClass = "tally-missing";
          else if (key === "Lost") cardClass = "tally-lost";

          return (
            <div
              key={key}
              className={`tally-card ${cardClass} ${filterStatus === key ? "tally-active" : ""} ${activeDropdown === key ? "is-dropdown-open" : ""}`}
              onClick={() => setFilterStatus(filterStatus === key ? null : key)}
            >
              <img src={bookIcon} alt={`${key} icon`} />
              <div className="tally-text">
                <div className="tally-key">{key} Materials</div>
                <div className="tally-count">{count}</div>

                <span
                  className="filter-trigger mt-2 d-block"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdown((prev) => (prev === key ? null : key));
                  }}
                >
                  <i className="bi bi-funnel"></i>{" "}
                  {activePeriodMap[key] || "Filter date"}
                </span>

                {activeDropdown === key && (
                  <div className="dropdown-options mt-1">
                    {["This Week", "This Month", "This Year"].map((period) => (
                      <div
                        key={period}
                        className={`dropdown-option ${
                          activePeriodMap[key] === period ? "active" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePeriodMap((prev) => ({
                            ...prev,
                            [key]: period as
                              | "This Week"
                              | "This Month"
                              | "This Year",
                          }));
                          setActiveDropdown(null);
                        }}
                      >
                        {period}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Tabs */}
      <div className="circulation-container mt-4">
        <h1 className="text-xl font-semibold mb-0">Circulation</h1>
        <p className="mb-2">
          <i>Manage book borrowings, returns, and renewals.</i>
        </p>
        <div className="action-buttons">
          <button
            className={`btn ${activeTab === "log" ? "active" : ""}`}
            onClick={() => setActiveTab("log")}
          >
            Circulation Log
          </button>
          <button
            className={`btn ${activeTab === "issue" ? "active" : ""}`}
            onClick={() => setActiveTab("issue")}
          >
            Issue
          </button>
          <button
            className={`btn ${activeTab === "return" ? "active" : ""}`}
            onClick={() => setActiveTab("return")}
          >
            Return
          </button>
          <button
            className={`btn ${activeTab === "renew" ? "active" : ""}`}
            onClick={() => setActiveTab("renew")}
          >
            Renew
          </button>
          <button
            className={`btn ${activeTab === "lost" ? "active" : ""}`}
            onClick={() => setActiveTab("lost")}
          >
            Lost
          </button>
          <button
            className={`btn ${activeTab === "settlements" ? "active" : ""}`}
            onClick={() => setActiveTab("settlements")}
          >
            Pending Replacements
          </button>
        </div>

        <div className="action-content mt-3">
          {activeTab === "log" && (
            <div>
              {/* Controls Row: Search, Sort, Filter */}
              <div
                className="d-flex gap-2 mb-3"
                style={{ alignItems: "center" }}
              >
                {/* Search */}
                <div
                  className="position-relative flex-grow-1"
                  style={{ maxWidth: "85%" }}
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

                {/* Sort */}
                <div className="position-relative" ref={sortRef}>
                  <button
                    type="button"
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
                          { field: "patron", label: "Patron Name" },
                          { field: "book", label: "Book Title" },
                          { field: "issue_date", label: "Issue Date" },
                        ].map(({ field, label }) => (
                          <div
                            key={field}
                            className="sort-field"
                            onClick={() =>
                              setSortField(
                                sortField === field ? null : (field as any),
                              )
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
                            sortField && sortOrder === "asc" ? "active" : ""
                          }`}
                          onClick={() => sortField && setSortOrder("asc")}
                        >
                          ASC
                        </button>
                        <button
                          className={`sort-btn ${
                            sortField && sortOrder === "desc" ? "active" : ""
                          }`}
                          onClick={() => sortField && setSortOrder("desc")}
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
                    type="button"
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
                      className="filter-dropdown shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* --- STATUS SECTION --- */}
                      <div
                        className={`filter-section-header ${activeFilterSection === "status" ? "active" : ""}`}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                        onClick={() =>
                          setActiveFilterSection(
                            activeFilterSection === "status" ? null : "status",
                          )
                        }
                      >
                        Status{" "}
                        <i
                          className={`bi ${
                            activeFilterSection === "status"
                              ? "bi-chevron-down"
                              : "bi-chevron-right"
                          } ms-2`}
                        ></i>
                      </div>

                      {activeFilterSection === "status" && (
                        <div className="list-group list-group-flush">
                          {[
                            "Issued",
                            "Returned",
                            "Overdue",
                            "Missing",
                            "Lost",
                          ].map((status) => (
                            <div
                              key={status}
                              className={`filter-item ${filterStatus === status ? "active" : ""}`}
                              style={{
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                setFilterStatus(
                                  filterStatus === status ? null : status,
                                )
                              }
                            >
                              <div>
                                {status}
                                {filterStatus === status}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* --- DATE RANGE SECTION --- */}
                      <div
                        className={`filter-section-header ${activeFilterSection === "date" ? "active" : ""}`}
                        style={{
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                        onClick={() =>
                          setActiveFilterSection(
                            activeFilterSection === "date" ? null : "date",
                          )
                        }
                      >
                        Date Range{""}
                        <i
                          className={`bi ${
                            activeFilterSection === "date"
                              ? "bi-chevron-down"
                              : "bi-chevron-right"
                          } ms-2`}
                        ></i>
                      </div>

                      {activeFilterSection === "date" && (
                        <div className="p-2">
                          <label className="small text-muted mb-0 mt-0">
                            Start Date
                          </label>
                          <input
                            type="date"
                            className="form-control form-control-sm mb-0"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                          <label className="small text-muted mb-0">
                            End Date
                          </label>
                          <input
                            type="date"
                            className="form-control form-control-sm mb-3"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                          <button
                            className="btn btn-sm btn-outline-danger w-100"
                            style={{ fontSize: "10px" }}
                            onClick={() => {
                              setStartDate("");
                              setEndDate("");
                            }}
                          >
                            Clear Dates
                          </button>
                        </div>
                      )}

                      {/* --- GLOBAL CLEAR (Optional) --- */}
                      {(filterStatus || startDate || endDate) && (
                        <div
                          className="p-2 text-center small text-danger fw-bold"
                          style={{ cursor: "pointer", background: "#fff5f5" }}
                          onClick={() => {
                            setFilterStatus(null);
                            setStartDate("");
                            setEndDate("");
                          }}
                        >
                          Clear All Filters
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <hr />

              {loading ? (
                <LoadingSpinner />
              ) : (
                <table className="circulation-table">
                  <thead>
                    <tr>
                      <th>Patron ID</th>
                      <th>Patron Name</th>
                      <th>Book Title</th>
                      <th>Barcode</th>
                      <th>Issued Date</th>
                      <th>Due Date</th>
                      <th>Renewal Count</th>
                      <th>Return Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td className="text-center py-4" colSpan={9}>
                          No circulation records found.
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((rec) => (
                        <Fragment key={rec.id}>
                          <tr onClick={() => toggleRow(rec.id)}>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div
                                className="row-card"
                                style={{ borderColor: getStatusColor(rec) }}
                              >
                                <div>{rec.patron?.patron_id}</div>
                                <div>
                                  {[
                                    rec.patron?.first_name,
                                    rec.patron?.middle_name,
                                    rec.patron?.last_name,
                                    rec.patron?.suffix,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                </div>
                                <div>{rec.book_copy?.book?.title}</div>
                                <div>{rec.book_copy?.barcode}</div>
                                <div>{rec.issue_date}</div>
                                <div>{rec.due_date}</div>
                                <div>{rec.renewal_count || "-"}</div>
                                <div>{rec.date_returned || "-"}</div>
                                <div className="fw-semibold">
                                  {renderStatusBadge(rec)}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {expandedRows.includes(rec.id) && (
                            <tr className="expanded-row">
                              <td colSpan={9} style={{ padding: 0 }}>
                                <div
                                  className="expanded-table"
                                  style={{ borderColor: getStatusColor(rec) }}
                                >
                                  <table>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: "0.5rem" }}>
                                          Borrower Info
                                        </th>
                                        <th style={{ padding: "0.5rem" }}>
                                          Book Info
                                        </th>
                                        <th style={{ padding: "0.5rem" }}>
                                          Loan Details
                                        </th>
                                        <th style={{ padding: "0.5rem" }}>
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr>
                                        <td style={{ padding: "0.5rem" }}>
                                          <strong>Patron ID:</strong>{" "}
                                          {rec.patron?.patron_id} <br />
                                          <strong>Name:</strong>{" "}
                                          {[
                                            rec.patron?.first_name,
                                            rec.patron?.middle_name,
                                            rec.patron?.last_name,
                                            rec.patron?.suffix,
                                          ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        </td>
                                        <td style={{ padding: "0.5rem" }}>
                                          <strong>Barcode:</strong>{" "}
                                          {rec.book_copy?.barcode} <br />
                                          <strong>Title:</strong>{" "}
                                          {rec.book_copy?.book?.title} <br />
                                          <strong>Call Number:</strong>{" "}
                                          {rec.book_copy?.book?.call_number ||
                                            "-"}{" "}
                                          <br />
                                          <strong>Copy No.:</strong>{" "}
                                          {rec.book_copy?.copy_number}
                                        </td>
                                        <td style={{ padding: "0.5rem" }}>
                                          <strong>Issue Date:</strong>{" "}
                                          {rec.issue_date} <br />
                                          <strong>Due Date:</strong>{" "}
                                          {rec.due_date} <br />
                                          <strong>Renewal Count:</strong>{" "}
                                          {rec.renewal_count ?? 0} <br />
                                          <strong>Return Date:</strong>{" "}
                                          {rec.date_returned || "-"}
                                        </td>
                                        <td style={{ padding: "0.5rem" }}>
                                          <strong>Status:</strong>{" "}
                                          {renderStatusBadge(rec)} <br />
                                          {getStatus(rec) === "Overdue" && (
                                            <span>
                                              <strong>Fine: </strong>₱
                                              {Number(rec.fine ?? 0).toFixed(2)}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              {filteredRecords.length > 0 && (
                <div
                  className="pagination-info text-center mb-2 mt-3 text-muted"
                  style={{ fontSize: "0.9rem" }}
                >
                  {filteredRecords.length === 0 ? (
                    "Showing 0 records"
                  ) : (
                    <>
                      Showing{" "}
                      <span className="fw-medium">
                        {indexOfFirstRecord + 1}
                      </span>{" "}
                      -{" "}
                      <span className="fw-medium">
                        {Math.min(indexOfLastRecord, filteredRecords.length)}
                      </span>{" "}
                      out of{" "}
                      <span className="fw-medium">
                        {filteredRecords.length}
                      </span>{" "}
                      records
                    </>
                  )}
                </div>
              )}
              {totalPages > 1 && (
                <div className="pagination d-flex justify-content-center gap-1 mt-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-double-left"></i> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      className={currentPage === i + 1 ? "active" : ""}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "issue" && (
            <IssueForm onSuccess={handleActionSuccess} />
          )}
          {activeTab === "return" && (
            <ReturnForm onSuccess={handleActionSuccess} />
          )}
          {activeTab === "renew" && (
            <RenewForm
              onSuccess={handleActionSuccess}
              onSwitchTab={(tabName: string) =>
                setActiveTab(
                  tabName as
                    | "log"
                    | "issue"
                    | "return"
                    | "renew"
                    | "lost"
                    | "settlements",
                )
              }
            />
          )}
          {activeTab === "lost" && <LostForm onSuccess={handleActionSuccess} />}
          {activeTab === "settlements" && (
            <SettlementTracker onSuccess={handleActionSuccess} />
          )}
        </div>
      </div>
    </>
  );
};

export default CirculationPage;
