import React, { useEffect, useState, useMemo } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { setupPDFHeader, setupPDFFooter } from "./ReportService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import LoadingSpinner from "../../LoadingSpinner";

interface jsPDFWithPlugin extends jsPDF {
  lastAutoTable: { finalY: number };
}

interface CirculationTabProps {
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
  } | null;
  onPrintComplete: () => void;
}

const CirculationTab: React.FC<CirculationTabProps> = ({
  activeTab,
  filters,
  printRequest,
  onPrintComplete,
}) => {
  // ===== STATES =====
  const [loadingCirculation, setLoadingCirculation] = useState(false);
  const [circulationData, setCirculationData] = useState<any[]>([]);
  const [topBooks, setTopBooks] = useState<any[]>([]);
  const [currentPageCirculation, setCurrentPageCirculation] = useState(1);
  const [circulationSort, setCirculationSort] = useState<"asc" | "desc">(
    "desc",
  );
  const [totals, setTotals] = useState<any>({});

  const [pendingPrintType, setPendingPrintType] = useState<string | null>(null);

  const rowsPerPageCirculation = 6;

  const getFilteredDataForExport = (dataArray: any[]) => {
    const now = new Date();
    if (!dataArray || dataArray.length === 0) return [];
    if (filters.timeRange === "all-time") return dataArray;

    return dataArray.filter((item) => {
      const rawDate = item.year_month || item.date || item.created_at;
      if (!rawDate) return true;
      const itemDate = new Date(rawDate);

      if (filters.timeRange === "this-month") {
        return (
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        );
      }
      if (filters.timeRange === "this-week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 7);
        return itemDate >= startOfWeek;
      }
      if (filters.timeRange === "this-year") {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const getTimeRangeLabel = () => {
    switch (filters.timeRange) {
      case "this-week":
        return "This Week";
      case "this-month":
        return "This Month";
      case "this-year":
        return "This Year";
      default:
        return "All Time";
    }
  };

  // ===== FETCH DATA =====
  useEffect(() => {
    if (activeTab === "circulation") {
      const fetchCirculationReports = async () => {
        setLoadingCirculation(true);
        try {
          const res = await AxiosInstance.get("/reports/circulation", {
            params: { timeRange: filters.timeRange },
          });

          // 1. Capture the raw data in local variables immediately
          const rows = res.data.rows || [];
          const top = res.data.topBooks || [];
          const summary = res.data.summary || {
            issued: 0,
            returned: 0,
            overdue: 0,
            lost: 0,
            fines: 0,
          };

          // 2. Update state for the UI
          setCirculationData(rows);
          setTopBooks(top);
          setTotals(summary);

          // 3. If a print was waiting for this data, trigger it now
          if (pendingPrintType) {
            executePdfExport(pendingPrintType, rows, top);
            setPendingPrintType(null); // Clear the queue
          }
        } catch (error) {
          console.error("Error fetching circulation reports:", error);
        } finally {
          setLoadingCirculation(false);
        }
      };
      fetchCirculationReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters.timeRange]);

  // ===== LOGIC: SORTING & PAGINATION =====
  const sortedCirculation = useMemo(() => {
    return [...circulationData].sort((a, b) => {
      const dateA = new Date(a.year_month || a.date || 0).getTime();
      const dateB = new Date(b.year_month || b.date || 0).getTime();
      return circulationSort === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [circulationData, circulationSort]);

  const totalPagesCirculation = Math.ceil(
    sortedCirculation.length / rowsPerPageCirculation,
  );
  const indexOfLastCirculation =
    currentPageCirculation * rowsPerPageCirculation;
  const indexOfFirstCirculation =
    indexOfLastCirculation - rowsPerPageCirculation;
  const currentCirculation = sortedCirculation.slice(
    indexOfFirstCirculation,
    indexOfLastCirculation,
  );

  const executePdfExport = (
    type: string,
    freshRows: any[],
    freshTop: any[],
    preparedBy?: string, // Add this
    notedBy?: string,
  ) => {
    const filteredRows = getFilteredDataForExport(freshRows);
    exportCirculationToPDF(type, filteredRows, freshTop, preparedBy, notedBy);
  };

  // ===== EXPORT TO EXCEL =====
  const exportCirculationToExcel = () => {
    if (!circulationData.length) return;

    const data = circulationData.map((row) => ({
      Month: row.month,
      Issued: row.issued,
      Returned: row.returned,
      Overdue: row.overdue,
      Lost: row.lost,
      Fines: `₱${Number(row.fines ?? 0).toFixed(2)}`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-adjust column widths
    const cols = Object.keys(data[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) => (row as any)[key]?.toString().length || 0),
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Circulation Summary");
    XLSX.writeFile(workbook, "circulation_summary.xlsx");
  };

  const exportCirculationToPDF = (
    reportType: string,
    dataToUse: any[],
    topBooksToUse: any[],
    preparedBy: string = "Librarian / Staff Name", // Default values
    notedBy: string = "Provincial Librarian", // Default values
  ) => {
    if (
      (!dataToUse || dataToUse.length === 0) &&
      (!topBooksToUse || topBooksToUse.length === 0)
    ) {
      alert("No data found for the selected criteria.");
      return;
    }

    const pdfSortedData = [...dataToUse].sort((a, b) => {
      return (
        new Date(b.year_month || b.date || 0).getTime() -
        new Date(a.year_month || a.date || 0).getTime()
      );
    });

    const doc = new jsPDF() as jsPDFWithPlugin;
    const margin = 14;
    const timeLabel = getTimeRangeLabel();
    let reportLabel =
      reportType === "Most Borrowed"
        ? "TOP BORROWED BOOKS"
        : "CIRCULATION REPORT";
    let currentY = setupPDFHeader(
      doc,
      `${reportLabel} (${timeLabel.toUpperCase()})`,
    );

    if (reportType !== "Most Borrowed") {
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Month", "Issued", "Returned", "Overdue", "Lost", "Fees Paid"]],
        body: pdfSortedData.map((row) => [
          row.month,
          row.issued,
          row.returned,
          row.overdue,
          row.lost,
          `P${Number(row.fines || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`,
        ]),
        theme: "striped",
        headStyles: { fillColor: [192, 91, 66] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    if (
      reportType === "Most Borrowed" ||
      reportType === "Full Report" ||
      reportType === "Full"
    ) {
      doc.text(`Most Borrowed Books`, margin, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Rank", "Title", "Author", "Count"]],
        body: topBooksToUse.map((book, i) => [
          `#${i + 1}`,
          book.title,
          book.author || "N/A",
          book.borrowed_count,
        ]),
        headStyles: { fillColor: [60, 60, 60] },
      });
    }

    setupPDFFooter(doc, preparedBy, notedBy);
    doc.save(`${reportLabel.replace(/\s+/g, "_")}.pdf`);
  };

  useEffect(() => {
    if (printRequest && activeTab === "circulation") {
      const preparedBy = printRequest.preparedBy || "Librarian / Staff Name";
      const notedBy = printRequest.notedBy || "Provincial Librarian";

      if (loadingCirculation) {
        setPendingPrintType(printRequest.type);
      } else {
        executePdfExport(
          printRequest.type,
          circulationData,
          topBooks,
          preparedBy,
          notedBy,
        );
        onPrintComplete();
      }
    }
  }, [printRequest, activeTab]);

  if (loadingCirculation) return <LoadingSpinner />;

  return (
    <div className="circulation-section">
      {/* Row 1: Chart + Tally Cards */}
      <div className="circulation-top d-flex flex-wrap gap-4">
        {/* Left: Bar Chart */}
        <div className="circulation-chart flex-grow-1 card p-3 shadow-sm">
          <div className="chart-header d-flex justify-content-between align-items-center mb-3">
            <h2 className="chart-title h5 mb-0">Monthly Circulation Report</h2>
            <span className="badge bg-secondary">Annual View</span>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={sortedCirculation}
              margin={{ top: 20, right: 30, left: -10, bottom: 10 }}
              barCategoryGap="35%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#666" }}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#666" }}
              />
              <Tooltip
                cursor={{ fill: "#f8f9fa" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Legend iconType="circle" verticalAlign="bottom" align="center" />
              <Bar
                dataKey="issued"
                stackId="a"
                fill="#4691e0"
                name="Issued"
                barSize={40}
              />
              <Bar
                dataKey="returned"
                stackId="a"
                fill="#10B981"
                name="Returned"
              />
              <Bar dataKey="lost" stackId="a" fill="#737c85" name="Lost" />
              <Bar
                dataKey="overdue"
                stackId="a"
                fill="#EF4444"
                name="Overdue"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right: Tally Cards */}
        <div
          className="circulation-tally d-flex flex-column gap-3"
          style={{ minWidth: "280px" }}
        >
          <div className="card p-4 shadow-sm border-0 bg-white">
            <h3 className="h6 text-muted mb-4 text-uppercase fw-bold">
              Library Summary
            </h3>

            <div className="tally-item mb-4 border-start border-primary border-4 ps-3">
              <label className="d-block text-muted small mb-1">
                Total Book Inventory
              </label>
              <div className="h4 fw-bold text-dark">
                {totals.totalInventory?.toLocaleString() || 0}
              </div>
            </div>

            <div className="tally-item mb-4 border-start border-danger border-4 ps-3">
              <label className="d-block text-muted small mb-1">
                Total Lost Count (Annual)
              </label>
              <div className="h4 fw-bold text-dark">
                {totals.lost?.toLocaleString() || 0}
              </div>
            </div>

            <div className="tally-item border-start border-success border-4 ps-3">
              <label className="d-block text-muted small mb-1">
                Total Fees Collected
              </label>
              <div className="h4 fw-bold text-success">
                ₱
                {Number(totals.finesPaid ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                * Only confirmed payments
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Summary Table (Styled like Attendance Log) */}
      <div className="attendance-log-section card shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Circulation Summary</h5>
            <small className="text-muted">
              Monthly lending activity and fees
            </small>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group btn-group-sm">
              <button
                className={`btn btn-outline-secondary ${
                  circulationSort === "asc" ? "active" : ""
                }`}
                onClick={() => {
                  setCirculationSort("asc");
                  setCurrentPageCirculation(1); // Reset to first page
                }}
              >
                Oldest
              </button>
              <button
                className={`btn btn-outline-secondary ${
                  circulationSort === "desc" ? "active" : ""
                }`}
                onClick={() => setCirculationSort("desc")}
              >
                Newest
              </button>
            </div>
            <button
              onClick={exportCirculationToExcel}
              className="btn btn-sm btn-success"
            >
              <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export
              Excel
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table
            className="table table-hover align-middle mb-0"
            style={{ fontSize: "0.9rem" }}
          >
            <thead className="table-light">
              <tr>
                <th className="ps-3">Month</th>
                <th>Issued</th>
                <th>Returned</th>
                <th>Overdue</th>
                <th>Lost</th>
                <th className="text-end pe-3">Fees Collected</th>
              </tr>
            </thead>
            <tbody>
              {currentCirculation.length > 0 ? (
                currentCirculation.map((row, i) => (
                  <tr key={i}>
                    <td className="ps-3 fw-medium">{row.month}</td>
                    <td>{row.issued}</td>
                    <td>{row.returned}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.overdue > 0
                            ? "bg-danger-subtle text-danger"
                            : "bg-light text-muted"
                        }`}
                      >
                        {row.overdue}
                      </span>
                    </td>
                    <td>{row.lost}</td>
                    <td className="text-end pe-3 fw-bold">
                      ₱
                      {Number(row.fines ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No circulation data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (Styled like Attendance Log) */}
        <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
          <span className="small text-muted">
            Showing {indexOfFirstCirculation + 1} to{" "}
            {Math.min(indexOfLastCirculation, sortedCirculation.length)} of{" "}
            {sortedCirculation.length} entries
          </span>
          <nav>
            <ul className="pagination pagination-sm mb-0 gap-1">
              <li
                className={`page-item ${
                  currentPageCirculation === 1 ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted"
                  onClick={() => setCurrentPageCirculation((p) => p - 1)}
                >
                  Previous
                </button>
              </li>
              {[...Array(totalPagesCirculation)].map((_, i) => (
                <li
                  key={i}
                  className={`page-item ${
                    currentPageCirculation === i + 1 ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link rounded border-0 mx-1 shadow-none"
                    onClick={() => setCurrentPageCirculation(i + 1)}
                    style={{
                      backgroundColor:
                        currentPageCirculation === i + 1
                          ? "#c05b42"
                          : "transparent",
                      color:
                        currentPageCirculation === i + 1 ? "#fff" : "#64748b",
                      fontWeight:
                        currentPageCirculation === i + 1 ? "600" : "400",
                    }}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li
                className={`page-item ${
                  currentPageCirculation === totalPagesCirculation
                    ? "disabled"
                    : ""
                }`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted"
                  onClick={() => setCurrentPageCirculation((p) => p + 1)}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default CirculationTab;
