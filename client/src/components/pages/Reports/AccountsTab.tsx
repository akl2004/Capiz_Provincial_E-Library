import React, { useEffect, useState, useMemo } from "react"; // Added useMemo here
import AxiosInstance from "../../../AxiosInstance";
import * as XLSX from "xlsx";
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
} from "recharts";
import LoadingSpinner from "../../LoadingSpinner";

interface AccountsTabProps {
  activeTab: string;
  userRole: "admin" | "staff";
}

const AccountsTab: React.FC<AccountsTabProps> = ({ activeTab }) => {
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
    deactivate: "#F59E0B",
    expired: "#6B7280",
    blocked: "#EF4444",
  };

  const roleColors = ["#6366F1", "#EC4899", "#8B5CF6"];

  useEffect(() => {
    const fetchData = async () => {
      setLoadingAccountsData(true);
      try {
        const res = await AxiosInstance.get("/reports/accounts");
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
  }, [activeTab]);

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
    const worksheetData = accountsData.map((user) => ({
      "User ID": user.user_id,
      "Full Name": user.full_name,
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
    accountsData.length / rowsPerPageAccounts
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
            <div className="card-body p-4">
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
                    dataKey="total"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    cornerRadius={6}
                  >
                    {roleDistribution.map((_, index) => (
                      <Cell
                        key={index}
                        fill={roleColors[index % roleColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
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
            <div className="card-body p-4">
              <h6 className="fw-bold text-dark mb-4">Account Growth</h6>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={newAccountsPerMonth} margin={{ left: -30 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
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
                    <td className="py-3 text-muted">{user.role}</td>
                    <td className="py-3">
                      <span
                        className={`badge rounded-pill px-3 py-2 ${
                          user.status.toLowerCase() === "active"
                            ? "bg-success-subtle text-success"
                            : user.status.toLowerCase() === "blocked"
                            ? "bg-danger-subtle text-danger"
                            : "bg-warning-subtle text-warning"
                        }`}
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
