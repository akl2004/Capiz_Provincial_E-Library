import React, { useEffect, useState, useMemo } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { setupPDFHeader, setupPDFFooter } from "./ReportService";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import LoadingSpinner from "../../LoadingSpinner";

interface AttendanceLog {
  id: number;
  date: string;
  type: string;
  fullname: string;
  address?: string;
  contact_number?: string;
  purpose: string;
  visitor_type?: string;
  gender?: string;
  affiliation: string;
  time_in: string;
  time_out?: string;
}

interface jsPDFWithPlugin extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface AttendanceTabProps {
  activeTab: string;
  filters: {
    timeRange: string;
    startDate: string;
    endDate: string;
  };
  printRequest?: {
    type: string;
    id: number;
    preparedBy?: string;
    notedBy?: string;
    timeRange?: string;
  } | null;
  onPrintComplete: () => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({
  activeTab,
  filters,
  printRequest,
  onPrintComplete,
}) => {
  // ===== STATES =====
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSort, setAttendanceSort] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [uiTableFilter, setUiTableFilter] = useState<string>("all");

  const [attendanceSummaryData, setAttendanceSummaryData] = useState<any[]>([]);
  const [attendanceLogData, setAttendanceLogData] = useState<AttendanceLog[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const applyDateFilters = (
    data: any[],
    range: string,
    start: string,
    end: string,
  ) => {
    const now = new Date();
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    return data.filter((item) => {
      if (range === "all-time" || range === "all" || !range) return true;
      const dateStr = item.date || item.time_in;
      if (!dateStr) return false;
      const itemDate = new Date(dateStr);
      if (isNaN(itemDate.getTime())) return false;

      if (range === "custom") {
        if (!start || !end) return true;
        const filterStart = new Date(start);
        filterStart.setHours(0, 0, 0, 0);
        const filterEnd = new Date(end);
        filterEnd.setHours(23, 59, 59, 999);
        return itemDate >= filterStart && itemDate <= filterEnd;
      }

      if (range === "today")
        return itemDate.toDateString() === now.toDateString();
      if (range === "week" || range === "this-week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return itemDate >= startOfWeek && itemDate <= endOfToday;
      }
      if (range === "month" || range === "this-month") {
        return (
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        );
      }
      if (range === "year" || range === "this-year")
        return itemDate.getFullYear() === now.getFullYear();

      return true;
    });
  };

  // 3. NOW DEFINE MEMOS (They can now access applyDateFilters)
  const tableLogs = useMemo(() => {
    let data = applyDateFilters(
      [...attendanceLogData],
      uiTableFilter,
      filters.startDate,
      filters.endDate,
    );
    data.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time_in}`).getTime() || 0;
      const dateB = new Date(`${b.date} ${b.time_in}`).getTime() || 0;
      return attendanceSort === "asc" ? dateA - dateB : dateB - dateA;
    });
    return data;
  }, [attendanceLogData, attendanceSort, uiTableFilter, filters]);

  const reportLogs = useMemo(() => {
    return applyDateFilters(
      [...attendanceLogData],
      filters.timeRange,
      filters.startDate,
      filters.endDate,
    );
  }, [attendanceLogData, filters]);

  // 4. PAGINATION CALCULATIONS
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const totalPages = Math.ceil(tableLogs.length / itemsPerPage);
  const currentLogs = tableLogs.slice(indexOfFirst, indexOfLast);


  // Helper for page numbers
  const getVisiblePages = () => {
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ===== FETCH DATA =====
  useEffect(() => {
    if (activeTab === "attendance") {
      const fetchAttendanceReports = async () => {
        setLoadingAttendance(true);
        try {
          const [summaryRes, logRes] = await Promise.all([
            AxiosInstance.get("/reports/attendance/summary"),
            AxiosInstance.get("/reports/attendance/log"),
          ]);
          setAttendanceSummaryData(summaryRes.data.rows || []);
          setAttendanceLogData(logRes.data.logs || []);
        } catch (error) {
          console.error("Error fetching attendance reports:", error);
        } finally {
          setLoadingAttendance(false);
        }
      };
      fetchAttendanceReports();
    }
  }, [activeTab]);

  // Handle Print Requests from Parent
  useEffect(() => {
    if (printRequest && activeTab === "attendance") {
      const reportMappings: Record<string, string> = {
        "Visitor Log": "All",
        "Patron vs Guest": "Summary_Only",
        "Volume Trends": "Trends",
        Demographics: "Demographics",
      };

      const targetCategory = reportMappings[printRequest.type] || "All";
      const preparedBy = printRequest.preparedBy || "Librarian / Staff Name";
      const notedBy = printRequest.notedBy || "Provincial Librarian";

      const selectedRange = printRequest.timeRange || filters.timeRange;

      setSelectedCategory(targetCategory);

      if (printRequest.type === "Export Excel") {
      } else {
        // Pass the selectedRange to the PDF function
        exportSummaryToPDF(targetCategory, preparedBy, notedBy, selectedRange);
      }
      onPrintComplete();
    }
  }, [printRequest, activeTab]);

  const exportToExcel = () => {
    const data = reportLogs.map((row) => ({
      Date: row.date,
      Type: row.type?.toUpperCase(),
      "Full Name": row.fullname,
      Affiliation: row.affiliation,
      Purpose: row.purpose,
      "Time In": row.time_in,
      "Time Out": row.time_out || "--:--",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");
    XLSX.writeFile(workbook, `Attendance_Report.xlsx`);
  };

  const exportSummaryToPDF = (
    overrideCategory?: string,
    preparedBy: string = "Librarian / Staff Name",
    notedBy: string = "Provincial Librarian",
    rangeOverride?: string,
  ) => {
    const doc = new jsPDF() as jsPDFWithPlugin;
    const currentCategory = overrideCategory || selectedCategory;

    const filteredLogs = rangeOverride
      ? applyDateFilters(
          [...attendanceLogData],
          rangeOverride,
          filters.startDate,
          filters.endDate,
        )
      : reportLogs;

    const timeLabel = (
      rangeOverride ||
      filters.timeRange ||
      "ALL"
    ).toUpperCase();
    const reportLabel =
      currentCategory.toUpperCase().replace("_", " ") + " REPORT";
    let currentY = setupPDFHeader(doc, `${reportLabel} (${timeLabel})`);
    if (filteredLogs.length === 0) {
      doc.text("No data available.", 20, currentY + 10);
      doc.save(`Attendance_Report.pdf`);
      return;
    }

    // Helper to prevent overlapping footers
    const checkNewPage = (yIncrement: number) => {
      if (currentY + yIncrement > 250) {
        doc.addPage();
        return 20; // Reset Y to top of new page
      }
      return currentY;
    };

    // 1. STATS TABLE (Patron vs Guest)
    if (currentCategory === "All" || currentCategory === "Summary_Only") {
      const stats = filteredLogs.reduce(
        (acc: any, curr: any) => {
          const type =
            curr.type?.toLowerCase() === "patron" ? "patron" : "guest";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        { patron: 0, guest: 0 },
      );

      autoTable(doc, {
        startY: currentY,
        head: [["Category", "Volume", "Percentage"]],
        body: [
          [
            "Patrons",
            stats.patron,
            `${((stats.patron / filteredLogs.length) * 100).toFixed(1)}%`,
          ],
          [
            "Guests",
            stats.guest,
            `${((stats.guest / filteredLogs.length) * 100).toFixed(1)}%`,
          ],
          [
            { content: "TOTAL", styles: { fontWeight: "bold" } },
            filteredLogs.length,
            "100%",
          ],
        ],
        headStyles: { fillColor: [192, 91, 66] },
        margin: { bottom: 40 },
        theme: "striped",
      });
      currentY = doc.lastAutoTable.finalY + 12;
    }

    // 2. DEMOGRAPHICS REPORT (Affiliation & Gender)
    if (currentCategory === "Demographics") {
      const affiliationMap: Record<string, number> = {};
      const genderMap: Record<string, number> = {};
      const visitorTypeMap: Record<string, number> = {};

      filteredLogs.forEach((log) => {
        const aff = log.affiliation || "Unspecified";
        const gen = log.gender || "Unspecified";
        const vType = log.visitor_type || "Unspecified";
        affiliationMap[aff] = (affiliationMap[aff] || 0) + 1;
        genderMap[gen] = (genderMap[gen] || 0) + 1;
        visitorTypeMap[vType] = (visitorTypeMap[vType] || 0) + 1;
      });

      // Affiliation Table
      doc.setFontSize(11).text("Affiliation Breakdown", 14, currentY);
      autoTable(doc, {
        startY: currentY + 2,
        head: [["Affiliation", "Count"]],
        body: Object.entries(affiliationMap).map(([key, val]) => [key, val]),
        headStyles: { fillColor: [100, 100, 100] },
        margin: { bottom: 40 },
      });

      currentY = doc.lastAutoTable.finalY + 10;
      currentY = checkNewPage(40);

      doc.setFontSize(11).text("Visitor Type Breakdown", 14, currentY);
      autoTable(doc, {
        startY: currentY + 2,
        head: [["Visitor Type", "Count"]],
        body: Object.entries(visitorTypeMap).map(([key, val]) => [key, val]),
        headStyles: { fillColor: [100, 100, 100] },
        margin: { bottom: 40 },
      });

      currentY = doc.lastAutoTable.finalY + 10;
      currentY = checkNewPage(40);

      // Gender Table
      doc.setFontSize(11).text("Gender Analysis", 14, currentY);
      autoTable(doc, {
        startY: currentY + 2,
        head: [["Gender", "Count"]],
        body: Object.entries(genderMap).map(([key, val]) => [key, val]),
        headStyles: { fillColor: [100, 100, 100] },
        margin: { bottom: 40 },
      });
      currentY = doc.lastAutoTable.finalY + 12;
    }

    // 3. TRENDS REPORT (Daily Volume)
    if (currentCategory === "Trends") {
      const dailyVolume: Record<string, number> = {};
      filteredLogs.forEach((log) => {
        dailyVolume[log.date] = (dailyVolume[log.date] || 0) + 1;
      });

      const entries = Object.entries(dailyVolume).sort().reverse();
      const values = Object.values(dailyVolume) as number[];
      const maxVolume = Math.max(...values);
      const totalVisitors = values.reduce((a, b) => a + b, 0);
      const avgVisitors = (totalVisitors / values.length).toFixed(1);

      // 1. Tighter Summary Cards (Reduced height)
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, currentY, 182, 20, 2, 2, "F");

      doc.setFontSize(7);
      doc.setTextColor(120, 130, 140);
      doc.text("TOTAL SESSIONS", 25, currentY + 7);
      doc.text("DAILY AVERAGE", 88, currentY + 7);
      doc.text("PEAK VOLUME", 152, currentY + 7);

      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      doc.text(`${totalVisitors}`, 25, currentY + 15);
      doc.text(`${avgVisitors}`, 88, currentY + 15);
      doc.text(`${maxVolume}`, 152, currentY + 15);

      currentY += 28;

      // 2. High-Density Table
      autoTable(doc, {
        startY: currentY,
        head: [["DAY / DATE", "ACTIVITY TREND", "COUNT"]],
        body: entries.map(([date, count]) => {
          const d = new Date(date);
          const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
          const formattedDate = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return [`${dayName.toUpperCase()} ${formattedDate}`, "", count];
        }),
        theme: "striped",
        styles: {
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }, // Tighter vertical padding
          fontSize: 8.5,
          valign: "middle",
        },
        headStyles: {
          fillColor: [44, 62, 80],
          fontSize: 8,
          halign: "left",
        },
        margin: { bottom: 40 },
        columnStyles: {
          0: { cellWidth: 40, textColor: [100, 100, 100] },
          1: { cellWidth: 115 },
          2: { halign: "right", fontStyle: "bold", cellWidth: 27 },
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            const count = Number(entries[data.row.index][1]);
            const isPeak = count === maxVolume;

            const barMaxWidth = data.cell.width - 20;
            const barWidth = (count / maxVolume) * barMaxWidth;
            const barHeight = 4; // Slimmer, more professional bar

            // Center the bar vertically in the cell
            const barY = data.cell.y + data.cell.height / 2 - barHeight / 2;

            // Background Track
            doc.setFillColor(235, 237, 240);
            doc.rect(data.cell.x, barY, barMaxWidth, barHeight, "F");

            // Active Bar (Orange for Peak, Blue for regular)
            if (isPeak) {
              doc.setFillColor(230, 126, 34); // Nice alert orange
            } else {
              doc.setFillColor(52, 152, 219); // Modern blue
            }
            doc.rect(data.cell.x, barY, barWidth, barHeight, "F");
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // 4. DETAILED LOG (Full List)
    if (currentCategory === "All" || currentCategory === "Visitor Log") {
      currentY = checkNewPage(20);
      doc.setFontSize(11).text("Detailed Attendance Log", 14, currentY);

      autoTable(doc, {
        startY: currentY + 2,
        head: [
          ["Date", "Name", "Type", "Affiliation", "Purpose", "Time In/Out"],
        ],
        body: filteredLogs.map((row) => [
          row.date,
          row.fullname,
          row.type?.toUpperCase(),
          row.affiliation,
          row.purpose,
          `${row.time_in} - ${row.time_out || "--:--"}`,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [192, 91, 66] },
        margin: { bottom: 40 },
      });
    }

    setupPDFFooter(doc, preparedBy, notedBy);
    doc.save(`Attendance_Report_${timeLabel.replace(" ", "_")}.pdf`);
  };

  if (loadingAttendance) return <LoadingSpinner />;

  return (
    <div className="attendance-section animate-fade-in">
      {/* ===== Row 1: Charts + Summary Table ===== */}
      <div className="attendance-top d-flex flex-wrap gap-4 mb-4">
        {/* Left: Charts (66% width on large screens) */}
        <div
          className="attendance-charts flex-grow-1"
          style={{ flexBasis: "60%" }}
        >
          <div className="row g-3">
            {/* Bar Chart */}
            <div className="col-12 col-xl-6">
              <div className="card shadow-sm p-3">
                <div className="chart-header d-flex justify-content-between mb-3">
                  <h6 className="fw-bold">Patron vs Guest</h6>
                  <span className="badge bg-primary-subtle text-primary">
                    Weekly
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={attendanceSummaryData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#eee"
                    />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip
                      cursor={{ fill: "#f5f5f5" }}
                      contentStyle={{ borderRadius: "8px", border: "none" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="guest"
                      name="Guest"
                      fill="#c95b3e"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="patron"
                      name="Patron"
                      fill="#e0795e"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart */}
            <div className="col-12 col-xl-6">
              <div className="card shadow-sm p-3">
                <div className="chart-header d-flex justify-content-between mb-3">
                  <h6 className="fw-bold">Visitor Volume</h6>
                  <span className="badge bg-warning-subtle text-warning">
                    Trend
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={attendanceSummaryData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#eee"
                    />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.ceil(dataMax)]}
                      tickFormatter={(value: any, index: number) =>
                        Math.floor(value).toString()
                      }
                    />

                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total Visitors"
                      stroke="#d47057"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Modern Summary Table */}
        <div
          className="attendance-summary card"
          style={{
            minWidth: "320px",
            height: "327px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="card-body d-flex flex-column"
            style={{ height: "100%" }}
          >
            <div className="d-flex justify-content-between align-items-center flex-shrink-0">
              <h6 className="fw-bold mb-0 text-dark">Recent Activity</h6>
            </div>

            <div
              className="summary-list"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              {attendanceSummaryData.map((row, i) => {
                const total = row.total || 1; // Prevent division by zero
                const patronPercent = (row.patron / total) * 100;

                return (
                  <div
                    key={i}
                    className="summary-item mb-4 pb-3 border-bottom border-light"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <span className="fw-bold d-block">{row.date}</span>
                        <small className="text-muted">
                          {row.total} Total Visitors
                        </small>
                      </div>
                      <div className="text-end">
                        <span className="badge rounded-pill bg-dark px-3">
                          {row.total}
                        </span>
                      </div>
                    </div>

                    {/* Visual breakdown bar */}
                    <div
                      className="progress"
                      style={{ height: "6px", backgroundColor: "#f0f0f0" }}
                    >
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${100 - patronPercent}%`,
                          backgroundColor: "#c95b3e",
                        }}
                        aria-label="Guests"
                      />
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${patronPercent}%`,
                          backgroundColor: "#d68672",
                        }}
                        aria-label="Patrons"
                      />
                    </div>

                    <div
                      className="d-flex justify-content-between mt-2"
                      style={{ fontSize: "0.75rem" }}
                    >
                      <span className="text-muted">
                        <i
                          className="bi bi-circle-fill me-1"
                          style={{ color: "#c95b3e", fontSize: "8px" }}
                        ></i>
                        Guest: <strong>{row.guest}</strong>
                      </span>
                      <span className="text-muted">
                        <i
                          className="bi bi-circle-fill me-1"
                          style={{ color: "#d68672", fontSize: "8px" }}
                        ></i>
                        Patron: <strong>{row.patron}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Row 2: Detailed Attendance Log ===== */}
      <div className="attendance-log-section card shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Attendance Log</h5>
            <small className="text-muted">
              Currently viewing:{" "}
              <strong>{uiTableFilter.replace("-", " ")}</strong>
            </small>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group btn-group-sm">
              <button
                className={`btn btn-outline-secondary ${attendanceSort === "asc" ? "active" : ""}`}
                onClick={() => setAttendanceSort("asc")}
              >
                Oldest
              </button>
              <button
                className={`btn btn-outline-secondary ${attendanceSort === "desc" ? "active" : ""}`}
                onClick={() => setAttendanceSort("desc")}
              >
                Newest
              </button>
            </div>

            <select
              className="form-select form-select-sm"
              style={{ width: "160px" }}
              value={uiTableFilter}
              onChange={(e) => {
                setUiTableFilter(e.target.value);
                setCurrentPage(1); // Reset to page 1 when filtering
              }}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Records</option>
            </select>

            <button onClick={exportToExcel} className="btn btn-sm btn-success">
              <i className="bi bi-file-earmark-spreadsheet me-1"></i> Excel
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Full Name</th>
                <th>Purpose</th>
                <th>Affiliation</th>
                <th>In/Out</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>
                    <span className="badge bg-info-subtle text-info text-capitalize">
                      {row.type}
                    </span>
                  </td>
                  <td className="fw-medium">{row.fullname}</td>
                  <td>{row.purpose}</td>
                  <td>{row.affiliation}</td>
                  <td>
                    <div className="small">
                      <span className="text-success">In: {row.time_in}</span>
                      <br />
                      <span className="text-muted">
                        Out: {row.time_out || "--:--"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
          {/* Update: Using tableLogs instead of processedLogs */}
          <span className="small text-muted">
            Showing {tableLogs.length > 0 ? indexOfFirst + 1 : 0} to{" "}
            {Math.min(indexOfLast, tableLogs.length)} of {tableLogs.length}{" "}
            entries
          </span>

          <nav>
            <ul className="pagination pagination-sm mb-0 gap-1">
              {/* First Page */}
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted"
                  onClick={() => setCurrentPage(1)}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>
              </li>

              {/* Prev */}
              <li
                className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted px-3"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
              </li>

              {/* Numbers */}
              {getVisiblePages().map((pageNumber) => (
                <li
                  key={pageNumber}
                  className={`page-item ${currentPage === pageNumber ? "active" : ""}`}
                >
                  <button
                    className="page-link rounded border-0 mx-1 shadow-none"
                    onClick={() => setCurrentPage(pageNumber)}
                    style={{
                      width: "50px",
                      backgroundColor:
                        currentPage === pageNumber ? "#c05b42" : "transparent",
                      color: currentPage === pageNumber ? "#fff" : "#64748b",
                      fontWeight: currentPage === pageNumber ? "600" : "400",
                    }}
                  >
                    {pageNumber}
                  </button>
                </li>
              ))}

              {/* Next */}
              <li
                className={`page-item ${
                  currentPage === totalPages || totalPages === 0
                    ? "disabled"
                    : ""
                }`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted px-3"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  Next
                </button>
              </li>

              {/* Last Page */}
              <li
                className={`page-item ${
                  currentPage === totalPages || totalPages === 0
                    ? "disabled"
                    : ""
                }`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTab;
