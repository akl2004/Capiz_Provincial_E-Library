import React, { useEffect, useState, useMemo } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { setupPDFHeader, setupPDFFooter } from "./ReportService";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import LoadingSpinner from "../../LoadingSpinner";

interface jsPDFWithPlugin extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface AccountsTabProps {
  activeTab: string;
  userRole: "admin" | "staff";
  filters: {
    timeRange: string;
    startDate: string;
    endDate: string;
  };
  printRequest?: {
    type: string;
    id: number;
    timeRange?: string;
    preparedBy?: string;
    notedBy?: string;
  } | null;
  onPrintComplete: () => void;
}

const AccountsTab: React.FC<AccountsTabProps> = ({
  activeTab,
  filters,
  printRequest,
  onPrintComplete,
}) => {
  const [accountStatus, setAccountStatus] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [newAccountsPerMonth, setNewAccountsPerMonth] = useState<any[]>([]);
  const [accountsData, setAccountsData] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loadingAccountsData, setLoadingAccountsData] = useState(false);
  const [currentPageAccounts, setCurrentPageAccounts] = useState(1);
  const rowsPerPageAccounts = 10;

  const statusColors: { [key: string]: string } = {
    active: "#10B981",
    deactivated: "#F59E0B",
    expired: "#6B7280",
    blocked: "#EF4444",
  };
  const roleColors = ["#F36E57", "#F58A68", "#F9A378"];

  const chartRef = React.useRef<HTMLDivElement>(null);
  const statusChartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingAccountsData(true);
      try {
        const res = await AxiosInstance.get(
          `/reports/accounts?range=${filters.timeRange}`,
        );
        setAccountStatus(res.data.accountStatus || []);
        setRoleDistribution(res.data.roleDistribution || []);
        setNewAccountsPerMonth(res.data.newAccountsPerMonth || []);
        setAccountsData(res.data.registry || []);
      } catch (error) {
        console.error("Error fetching accounts tab data:", error);
      } finally {
        setLoadingAccountsData(false);
      }
    };
    if (activeTab === "accounts") fetchData();
  }, [activeTab, filters.timeRange]);


  const filteredAccounts = useMemo(() => {
    const now = new Date();
    // Use printRequest range if available (for PDF), otherwise use UI filters
    const activeRange = printRequest?.timeRange || filters.timeRange;

    return accountsData.filter((user) => {
      if (!activeRange || activeRange === "all-time" || activeRange === "all")
        return true;

      const joinedDate = new Date(user.created_at);
      if (isNaN(joinedDate.getTime())) return true;

      if (activeRange === "this-month") {
        return (
          joinedDate.getMonth() === now.getMonth() &&
          joinedDate.getFullYear() === now.getFullYear()
        );
      }
      if (activeRange === "this-week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return joinedDate >= startOfWeek;
      }
      if (activeRange === "this-year") {
        return joinedDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [accountsData, filters.timeRange, printRequest]);

  const registrationTrends = useMemo(() => {
    const activeRange = printRequest?.timeRange || filters.timeRange;
    const groups: { [key: string]: number } = {};

    filteredAccounts.forEach((user) => {
      const date = new Date(user.created_at);
      let label = "";

      if (activeRange === "this-week") {
        // Group by Day Name (Mon, Tue, etc.)
        label = date.toLocaleDateString("en-US", { weekday: "short" });
      } else if (activeRange === "this-month") {
        // Group by Date (Jan 1, Jan 2, etc.)
        label = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        // Group by Month (Jan, Feb, etc.)
        label = date.toLocaleDateString("en-US", { month: "short" });
      }

      groups[label] = (groups[label] || 0) + 1;
    });

    // Convert to array format for Recharts and PDF tables
    return Object.keys(groups).map((key) => ({
      label: key,
      total: groups[key],
    }));
  }, [filteredAccounts, filters.timeRange, printRequest]);

  useEffect(() => {
    if (printRequest && activeTab === "accounts") {
      const preparedBy = printRequest.preparedBy || "Librarian / Staff Name";
      const notedBy = printRequest.notedBy || "Provincial Librarian";

      if (printRequest.type === "Export Excel") {
        exportAccountRegistryToExcel();
      } else {
        generateAccountsPDF(printRequest.type, preparedBy, notedBy);
      }
      onPrintComplete();
    }
  }, [printRequest, activeTab]);

  const generateAccountsPDF = async (
    reportType: string,
    preparedBy: string = "Librarian / Staff Name",
    notedBy: string = "Provincial Librarian",
  ) => {
    const doc = new jsPDF() as jsPDFWithPlugin;
    const timeLabel = (
      printRequest?.timeRange ||
      filters.timeRange ||
      "All"
    ).toUpperCase();
    const title = `${reportType.toUpperCase()} (${timeLabel})`;
    let currentY = setupPDFHeader(doc, title);

    // This is our source of truth for the report
    const dataToExport = filteredAccounts;

    // --- SECTION 1: SUMMARY (Tallies) ---
    if (reportType === "Account Summary") {
      const captureOptions = {
        scale: 3,
        backgroundColor: "#ffffff",
        logging: false,
      };

      // Growth Chart
      if (chartRef.current) {
        const canvasGrowth = await html2canvas(
          chartRef.current,
          captureOptions,
        );
        const imgGrowth = canvasGrowth.toDataURL("image/png");
        doc.setFontSize(12).text("Registration Growth Trends", 14, currentY);
        doc.addImage(imgGrowth, "PNG", 14, currentY + 5, 180, 70);
        currentY += 85;
      }

      // Growth Table (Note: This still uses monthly state, see note below)
      doc.setFontSize(12).text("Registration Data", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Period", "New Accounts Registered"]],
        body: registrationTrends.map((item) => [item.label, item.total]),
        headStyles: { fillColor: [100, 116, 139] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Distribution Tally - Using dataToExport (Filtered)
      const adminCount = dataToExport.filter(
        (u) => u.role?.toLowerCase() === "admin",
      ).length;
      const staffCount = dataToExport.filter(
        (u) => u.role?.toLowerCase() === "staff",
      ).length;
      const patronCount = dataToExport.filter(
        (u) => u.role?.toLowerCase() === "patron",
      ).length;

      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      doc
        .setFontSize(12)
        .text("Account Distribution Tally (Filtered)", 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Role", "Total Users", "Percentage"]],
        body: [
          [
            "Admins",
            adminCount,
            `${((adminCount / dataToExport.length) * 100 || 0).toFixed(1)}%`,
          ],
          [
            "Staff Members",
            staffCount,
            `${((staffCount / dataToExport.length) * 100 || 0).toFixed(1)}%`,
          ],
          [
            "Patrons",
            patronCount,
            `${((patronCount / dataToExport.length) * 100 || 0).toFixed(1)}%`,
          ],
        ],
        headStyles: { fillColor: [99, 102, 241] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- SECTION 2: REGISTRY TABLE ---
    if (reportType === "Account Summary" || reportType === "Active Users") {
      doc.addPage();
      currentY = 20;
      doc
        .setFontSize(14)
        .text(`Filtered Account Registry (${timeLabel})`, 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [["User ID", "Full Name", "Role", "Status", "Joined"]],
        // FIXED: Using dataToExport here
        body: dataToExport.map((u) => [
          u.user_id,
          u.full_name,
          u.role,
          u.status,
          new Date(u.created_at).toLocaleDateString(),
        ]),
        headStyles: { fillColor: [37, 90, 145] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- SECTION 3: CONDITIONAL LISTS (Flagged/Expired) ---
    let tableData: (string | number)[][] = [];
    let tableHeaders = [
      ["User ID", "Role", "Full Name", "Email", "Status", "Expiration"],
    ];
    let headerColor: [number, number, number] = [67, 85, 126];

    if (reportType === "Flagged Accounts") {
      headerColor = [239, 68, 68];
      // FIXED: Filter from dataToExport
      tableData = dataToExport
        .filter((u) =>
          ["Deactivated", "Blocked", "deactivate", "blocked"].includes(
            u.status.toLowerCase(),
          ),
        )
        .map((u) => [
          u.user_id,
          u.role,
          u.full_name,
          u.email,
          u.status.toUpperCase(),
          u.expiration_date || "N/A",
        ]);
    } else if (reportType === "Expired Accounts") {
      headerColor = [107, 114, 128];
      // FIXED: Filter from dataToExport
      tableData = dataToExport
        .filter((u) => u.status.toLowerCase() === "expired")
        .map((u) => [
          u.user_id,
          u.role,
          u.full_name,
          u.email,
          u.status.toUpperCase(),
          u.expiration_date || "Expired",
        ]);
    }

    if (tableData.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(12).text(`${reportType} List`, 14, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: tableHeaders,
        body: tableData,
        headStyles: { fillColor: headerColor },
      });
    }

    setupPDFFooter(doc, preparedBy, notedBy);
    doc.save(`${reportType.replace(/\s+/g, "_")}_${timeLabel}.pdf`);
  };

  // Fixed Sorting Logic
  const sortAccountRegistry = (order: "asc" | "desc") => {
    const sortedData = [...accountsData].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return order === "asc" ? dateA - dateB : dateB - dateA;
    });
    setAccountsData(sortedData);
    setSortOrder(order);
    setCurrentPageAccounts(1);
  };

  const exportAccountRegistryToExcel = () => {
    const worksheetData = filteredAccounts.map((user) => ({
      "User ID": user.user_id,
      "Full Name": user.full_name,
      Email: user.email,
      "Phone Number": user.number,
      Role: user.role,
      Status: user.status,
      "Date Registered": new Date(user.created_at).toLocaleDateString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registry");
    XLSX.writeFile(workbook, "Account_Registry.xlsx");
  };

  const totalPagesAccounts = Math.ceil(
    accountsData.length / rowsPerPageAccounts,
  );

  // useMemo fixed (dependency on accountsData added)
  const currentAccounts = useMemo(() => {
    const firstPageIndex = (currentPageAccounts - 1) * rowsPerPageAccounts;
    const lastPageIndex = firstPageIndex + rowsPerPageAccounts;
    return accountsData.slice(firstPageIndex, lastPageIndex);
  }, [currentPageAccounts, accountsData]);

  if (loadingAccountsData) return <LoadingSpinner />;

  return (
    <div className="accounts-section animate__animated animate__fadeIn">
      {/* Charts Row */}
      <div className="row g-4 mb-4">
        {/* Account Status */}
        <div className="col-lg-4">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "16px" }}
          >
            <div className="card-body p-4" ref={statusChartRef}>
              <h6 className="fw-bold text-dark mb-4">Account Status</h6>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={accountStatus} margin={{ left: -30 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="status"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={35}>
                    {accountStatus.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          statusColors[entry.status.toLowerCase()] || "#6366F1"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="col-lg-4">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "16px" }}
          >
            <div className="card-body p-4 text-center">
              <h6 className="fw-bold text-dark mb-4">Role Distribution</h6>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    nameKey="role" // Ensure this matches your data key for labels
                    dataKey="total"
                    innerRadius={50}
                    outerRadius={80} // Slightly reduced to prevent overlapping with legend
                    paddingAngle={5}
                    cornerRadius={6}
                    cy="45%" // Slightly move pie up to give legend more room
                  >
                    {roleDistribution.map((_, index) => (
                      <Cell
                        key={index}
                        fill={roleColors[index % roleColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-muted small fw-bold">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="col-lg-4">
          <div
            className="card border-0 shadow-sm h-100"
            style={{ borderRadius: "16px" }}
          >
            <div className="card-body p-4" ref={chartRef}>
              <h6 className="fw-bold text-dark mb-4">Account Growth</h6>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={newAccountsPerMonth} margin={{ left: -30 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c46e58" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#c46e58" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#c46e58"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className="accounts-section card shadow-sm">
        <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
          <h5 className="fw-bold mb-0">Account Registry</h5>
          <div className="d-flex gap-2 align-items-center">
            <div className="btn-group btn-group-sm">
              <button
                className={`btn btn-outline-secondary ${
                  sortOrder === "asc" ? "active" : ""
                }`}
                onClick={() => sortAccountRegistry("asc")}
              >
                Oldest
              </button>
              <button
                className={`btn btn-outline-secondary ${
                  sortOrder === "desc" ? "active" : ""
                }`}
                onClick={() => sortAccountRegistry("desc")}
              >
                Newest
              </button>
            </div>
            <button
              onClick={exportAccountRegistryToExcel}
              className="btn btn-sm btn-success px-3 ms-2 shadow-sm border-0"
            >
              <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export
              Excel
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  <th className="ps-4 py-3 border-0">User ID</th>
                  <th className="py-3 border-0">Full Name</th>
                  <th className="py-3 border-0">Email</th>
                  <th className="py-3 border-0">Phone Number</th>
                  <th className="py-3 border-0">Role</th>
                  <th className="py-3 border-0">Status</th>
                  <th className="py-3 border-0">Registered</th>
                  <th className="pe-4 py-3 border-0">Expiration</th>
                </tr>
              </thead>
              <tbody>
                {currentAccounts.map((user) => (
                  <tr
                    key={`${user.user_id}-${user.role}`}
                    style={{ fontSize: "0.9rem" }}
                  >
                    <td
                      className="ps-4 py-3 text-muted"
                      style={{ fontFamily: "monospace" }}
                    >
                      #{user.user_id}
                    </td>
                    <td className="py-3 fw-bold">{user.full_name}</td>
                    <td className="py-3 text-muted">{user.email}</td>
                    <td className="py-3 text-muted">{user.number}</td>
                    <td className="py-3 text-muted">{user.role}</td>
                    <td className="py-3">
                      <span
                        className="badge rounded-pill px-3 py-2"
                        style={{
                          color:
                            statusColors[user.status.toLowerCase()] ||
                            "#6B7280",
                          backgroundColor: `${statusColors[user.status.toLowerCase()] || "#6B7280"}33`,
                          border: `1px solid ${statusColors[user.status.toLowerCase()] || "#6B7280"}55`,
                        }}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="pe-4 py-3 text-muted">
                      {user.expiration_date
                        ? new Date(user.expiration_date).toLocaleDateString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Showing {currentAccounts.length} of {accountsData.length} accounts
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0 gap-1">
              <li
                className={`page-item ${
                  currentPageAccounts === 1 ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted"
                  onClick={() => setCurrentPageAccounts((p) => p - 1)}
                >
                  Prev
                </button>
              </li>
              {[...Array(totalPagesAccounts)].map((_, i) => (
                <li
                  key={i}
                  className={`page-item ${
                    currentPageAccounts === i + 1 ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link rounded border-0 mx-1 shadow-none"
                    onClick={() => setCurrentPageAccounts(i + 1)}
                    style={{
                      backgroundColor:
                        currentPageAccounts === i + 1
                          ? "#c05b42"
                          : "transparent",
                      color: currentPageAccounts === i + 1 ? "#fff" : "#64748b",
                      fontWeight: currentPageAccounts === i + 1 ? "600" : "400",
                    }}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
              <li
                className={`page-item ${
                  currentPageAccounts === totalPagesAccounts ? "disabled" : ""
                }`}
              >
                <button
                  className="page-link rounded border-0 bg-light text-muted"
                  onClick={() => setCurrentPageAccounts((p) => p + 1)}
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

export default AccountsTab;
