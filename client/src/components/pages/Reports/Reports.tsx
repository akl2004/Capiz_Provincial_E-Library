import { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import book from "../../../assets/book_icon.png";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";
import LoadingSpinner from "../../LoadingSpinner";

const Reports = () => {
  useEffect(() => {
    document.title = "Reports";
    fetchCollectionReports();
  }, []);

  const [activeTab, setActiveTab] = useState("collection");

  // COLLECTION TAB STATES AND LOGIC
  const [loadingMasterlist, setLoadingMasterlist] = useState(false);
  const [loadingCollectionData, setLoadingCollectionData] = useState(false);
  const [masterlist, setMasterlist] = useState<any[]>([]);

  type ReportData = {
    materialsByType: { name: string; value: number }[];
    booksPerMonth: { month: string; books: number }[];
    sourcesPercentage: { name: string; value: number }[];
    booksPerDDC: { category: string; books: number }[];
  };

  const [reportData, setReportData] = useState<ReportData>({
    materialsByType: [],
    booksPerMonth: [],
    sourcesPercentage: [],
    booksPerDDC: [],
  });

  const fetchCollectionReports = async () => {
    setLoadingCollectionData(true);
    try {
      const res = await AxiosInstance.get("/reports/collection");

      const ddcCategories: Record<string, string> = {
        "000": "Technology",
        "100": "Religion",
        "200": "Philosophy",
        "300": "General Works",
        "400": "Arts",
        "500": "Languages",
        "600": "Literature",
        "700": "Social Sciences",
        "800": "Science",
        "900": "History and geography",
      };

      // Initialize counts
      const counts: Record<string, number> = {};
      Object.values(ddcCategories).forEach((cat) => (counts[cat] = 0));

      res.data.booksByCategory.forEach((item: any) => {
        const category = item.category || "Other";
        const total = Number(item.total) || 0;
        counts[category] += total;
      });

      const booksPerDDC = Object.values(ddcCategories).map((name) => ({
        category: name,
        books: counts[name] || 0,
      }));

      setReportData({
        materialsByType: res.data.materialsByType.map((item: any) => ({
          name: item.material_type || item.name,
          value: item.total || item.value,
        })),
        booksPerMonth: res.data.booksPerMonth.map((item: any) => ({
          month: item.month,
          books: item.total,
        })),
        sourcesPercentage: res.data.sources.map((item: any) => ({
          name: item.source || item.name,
          value: item.total || item.value,
        })),
        booksPerDDC,
      });

      // Fetch masterlist
      fetchMasterlist();
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoadingCollectionData(false);
    }
  };

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  // Export masterlist to Excel
  const exportMasterlistToExcel = () => {
    if (!masterlist.length) return;

    // Map data for Excel
    const data = masterlist.map((copy) => ({
      "Accession #": copy.accession_number,
      Barcode: copy.barcode,
      "Copy #": copy.copy_number,
      Title: copy.book?.title,
      Contributor: [
        copy.book?.author,
        copy.book?.editor,
        copy.book?.other_author_editor,
      ]
        .filter(Boolean)
        .join(", "),
      Edition: copy.book?.edition,
      Series: copy.book?.series_name,
      Volume: copy.book?.volume,
      Publisher: copy.book?.publisher,
      "Place of Publication": copy.book?.place_of_publication,
      Copyright: copy.book?.copyright,
      Pages: copy.book?.number_of_pages,
      Language: copy.book?.book_language,
      Subjects: (() => {
        if (!copy.book?.topical_subject) return "N/A";
        try {
          // Try parsing if it's a stringified array
          const subjects = Array.isArray(copy.book.topical_subject)
            ? copy.book.topical_subject
            : JSON.parse(copy.book.topical_subject);
          return subjects.length ? subjects.join(", ") : "N/A";
        } catch {
          // Fallback if it's just a string
          return copy.book.topical_subject || "N/A";
        }
      })(),
      "Person as Subject": copy.book?.person_as_subject,
      ISBN: copy.book?.isbn,
      DDC: copy.book?.dewey_decimal,
      "Call Number": copy.book?.call_number,
      "Material Type": copy.material_type,
      "Cataloging Note": copy.cataloging_note,
      Source: copy.source,
      "Source Person": copy.source_person,
      Status: copy.status,
      "Date Added": copy.date_added,
    })) as Record<string, any>[];

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-adjust column widths based on content
    const cols = Object.keys(data[0]).map((key) => {
      const maxLength = Math.max(
        key.length, // header length
        ...data.map((row) => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: Math.min(maxLength + 2, 50) }; // optional max width 50
    });
    worksheet["!cols"] = cols;

    // Style header row (first row)
    const range = XLSX.utils.decode_range(worksheet["!ref"]!);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true, sz: 20 }, // bold + larger font
        alignment: { horizontal: "center" },
      };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Masterlist");

    // Directly download Excel file
    XLSX.writeFile(workbook, "masterlist.xlsx");
  };

  const sortMasterlist = (order: "asc" | "desc") => {
    const sorted = [...masterlist].sort((a, b) => {
      const titleA = a.book?.title?.toLowerCase() ?? "";
      const titleB = b.book?.title?.toLowerCase() ?? "";
      if (order === "asc") return titleA.localeCompare(titleB);
      else return titleB.localeCompare(titleA);
    });
    setMasterlist(sorted);
  };

  const fetchMasterlist = async () => {
    setLoadingMasterlist(true);
    try {
      const res = await AxiosInstance.get("/reports/collection-masterlist");
      setMasterlist(res.data);
    } catch (error) {
      console.error("Error fetching masterlist:", error);
    } finally {
      setLoadingMasterlist(false);
    }
  };

  // CIRCULATION TAB STATES AND LOGIC
  const [loadingCirculation, setLoadingCirculation] = useState(false);
  const [circulationData, setCirculationData] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    onLoan: 0,
    returned: 0,
    renewed: 0,
    overdue: 0,
    fines: 0,
  });

  const DDC_COLORS: Record<string, string> = {
    Technology: "#3B82F6",
    Religion: "#10B981",
    Philosophy: "#F59E0B",
    "General Works": "#EF4444",
    Arts: "#8B5CF6",
    Languages: "#EC4899",
    Literature: "#14B8A6",
    "Social Sciences": "#F87171",
    Science: "#FBBF24",
    "History and geography": "#60A5FA",
  };

  const [summarySort, setSummarySort] = useState<"asc" | "desc">("asc");

  // Prepare table data
  const total = reportData.materialsByType.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const summaryData = reportData.materialsByType.map((item) => ({
    ...item,
    totalPercentage: (item.value / total) * 100,
    activePercent: Math.floor(Math.random() * 50) + 20,
  }));

  // Sorting function
  const sortSummary = (direction: "asc" | "desc") => {
    setSummarySort(direction);
  };

  const sortedSummary = [...summaryData].sort((a, b) => {
    if (summarySort === "asc") return a.value - b.value;
    return b.value - a.value;
  });

  const exportSummaryToExcel = () => {
    if (!reportData.materialsByType.length) return;

    // Prepare data
    const total = reportData.materialsByType.reduce(
      (sum, item) => sum + item.value,
      0
    );
    const data = reportData.materialsByType.map((item) => ({
      "Material Type": item.name,
      "Total Materials": item.value,
      "Total Collection": ((item.value / total) * 100).toFixed(2) + "%",
      "Active Circulation": Math.floor(Math.random() * 50 + 20) + "%",
    }));

    // Convert to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-width columns
    const cols = Object.keys(data[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) =>
          row[key as keyof typeof row]
            ? row[key as keyof typeof row]?.toString()?.length || 0
            : 0
        )
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Collection Summary");

    XLSX.writeFile(workbook, "collection_summary.xlsx");
  };

  // Circulation tab sorting
  const [circulationSort, setCirculationSort] = useState<"asc" | "desc">(
    "desc"
  );

  // Sort function
  const sortCirculation = (direction: "asc" | "desc") => {
    setCirculationSort(direction);
  };

  // Sorted circulation data
  const sortedCirculation = [...circulationData].sort((a, b) => {
    if (circulationSort === "asc")
      return a.year_month.localeCompare(b.year_month);
    return b.year_month.localeCompare(a.year_month);
  });

  const exportCirculationToExcel = () => {
    if (!circulationData.length) return;

    const data = circulationData.map((row) => ({
      Month: row.month,
      OnLoan: row.onLoan,
      Returned: row.returned,
      Renewed: row.renewed,
      Overdue: row.overdue,
      Fines: Number(row.fines ?? 0).toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-adjust column widths
    const cols = Object.keys(data[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) =>
          // cast row to an indexable type so TypeScript accepts string indexing
          (row as Record<string, any>)[key]
            ? (row as Record<string, any>)[key].toString().length
            : 0
        )
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Circulation Summary");
    XLSX.writeFile(workbook, "circulation_summary.xlsx");
  };

  // For the circulation tab
  useEffect(() => {
    if (activeTab === "circulation") {
      const fetchCirculationReports = async () => {
        setLoadingCirculation(true);
        try {
          const res = await AxiosInstance.get("/reports/circulation");
          setCirculationData(res.data.rows);
          setTotals(res.data.summary);
          console.log(res.data.rows);
        } catch (error) {
          console.error("Error fetching circulation reports:", error);
        } finally {
          setLoadingCirculation(false);
        }
      };

      fetchCirculationReports();
    }
  }, [activeTab]);

  // For the attendance tab
  const [attendanceSort, setAttendanceSort] = useState<"asc" | "desc">("asc");

  const [attendanceSummaryData, setAttendanceSummaryData] = useState<
    { date: string; guest: number; patron: number; total: number }[]
  >([]);
  const [attendanceLogData, setAttendanceLogData] = useState<
    {
      id: number;
      type: "guest" | "patron";
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      suffix?: string;
      patron_id?: number;
      time_in: string;
      time_out?: string | null;
      date: string;
      address?: string;
      contact_number?: string;
      purpose?: string;
      affiliation?: string;
      fullname: string;
    }[]
  >([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Fetch attendance data when the tab is active
  useEffect(() => {
    if (activeTab === "attendance") {
      const fetchAttendanceReports = async () => {
        setLoadingAttendance(true);
        try {
          // Fetch summary
          const summaryRes = await AxiosInstance.get(
            "/reports/attendance/summary"
          );

          const summaryArray = Array.isArray(summaryRes.data.rows)
            ? summaryRes.data.rows
            : [];

          setAttendanceSummaryData(
            summaryArray.map((row: any) => ({
              date: row.date,
              guest: Number(row.guest),
              patron: Number(row.patron),
              total: Number(row.total),
            }))
          );

          // Fetch logs
          const logRes = await AxiosInstance.get("/reports/attendance/log");

          const logArray = logRes.data.logs || [];

          setAttendanceLogData(
            logArray.map((row: any) => ({
              id: row.id,
              date: row.date,
              type: row.type,
              fullname: row.fullname,
              address: row.address ?? "-",
              contact_number: row.contact_number ?? "-",
              purpose: row.purpose ?? "-",
              affiliation: row.affiliation ?? "-",
              time_in: row.time_in,
              time_out: row.time_out ?? "-",
            }))
          );
        } catch (error) {
          console.error("Error fetching attendance reports:", error);
        } finally {
          setLoadingAttendance(false);
        }
      };

      fetchAttendanceReports();
    }
  }, [activeTab]);

  // Sort function
  const sortAttendanceLog = (order: "asc" | "desc") => {
    const sorted = [...attendanceLogData].sort((a, b) => {
      if (order === "asc") return a.date.localeCompare(b.date);
      return b.date.localeCompare(a.date);
    });
    setAttendanceLogData(sorted);
    setAttendanceSort(order);
  };

  // Export to Excel
  const exportAttendanceLogToExcel = () => {
    if (!attendanceLogData.length) return;

    const data = attendanceLogData.map((row) => ({
      Date: row.date,
      Type: row.type,
      "Full Name": row.fullname,
      Address: row.address,
      "Contact Number": row.contact_number,
      "Purpose of Visit": row.purpose,
      Affiliation: row.affiliation,
      "Time In": row.time_in,
      "Time Out": row.time_out,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const cols = Object.keys(data[0]).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) =>
          row[key as keyof typeof row] != null
            ? (row[key as keyof typeof row] ?? "").toString().length
            : 0
        )
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet["!cols"] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");
    XLSX.writeFile(workbook, "attendance_log.xlsx");
  };

  // accounts
  const [userRole, setUserRole] = useState<"admin" | "staff">("staff");

  const [accountStatus, setAccountStatus] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [newAccountsPerMonth, setNewAccountsPerMonth] = useState<any[]>([]);
  const [accountsData, setAccountsData] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loadingAccountsData, setLoadingAccountsData] = useState(false);

  useEffect(() => {
    if (activeTab !== "accounts") return;
    setLoadingAccountsData(true);
    AxiosInstance.get("/reports/accounts")
      .then((res) => {
        setAccountStatus(res.data.accountStatus);
        setRoleDistribution(res.data.roleDistribution);
        setNewAccountsPerMonth(res.data.newAccountsPerMonth);
        setAccountsData(res.data.registry);
      })
      .finally(() => {
        setLoadingAccountsData(false);
      });
  }, [activeTab]);

  // 🔹 SORT FUNCTION
  const sortAccountRegistry = (order: "asc" | "desc") => {
    const sortedData = [...accountsData].sort((a, b) => {
      const nameA = a.full_name.toLowerCase();
      const nameB = b.full_name.toLowerCase();

      if (nameA < nameB) return order === "asc" ? -1 : 1;
      if (nameA > nameB) return order === "asc" ? 1 : -1;
      return 0;
    });

    setAccountsData(sortedData);
    setSortOrder(order);
  };

  // EXPORT FUNCTION
  const exportAccountRegistryToExcel = () => {
    if (!accountsData.length) return alert("No account data to export!");

    const worksheetData = accountsData.map((user) => ({
      "User ID": user.user_id,
      "Full Name": user.full_name,
      Role: user.role,
      Status: user.status,
      "Date Registered": new Date(user.created_at).toLocaleDateString(),
      Expiration: user.expiration_date
        ? new Date(user.expiration_date).toLocaleDateString()
        : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Account Registry");
    XLSX.writeFile(workbook, "Account_Registry_Report.xlsx");
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const res = await AxiosInstance.get("/user"); // Adjust endpoint if needed
        setUserRole(res.data.role); // assuming backend returns { role: "admin" | "staff" }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    fetchUserRole();
  }, []);

  // Pagination states
  // ===== ATTENDANCE LOG PAGINATION =====
  const [currentPageAttendance, setCurrentPageAttendance] = useState(1);
  const rowsPerPageAttendance = 10;

  const totalPagesAttendance = Math.ceil(
    attendanceLogData.length / rowsPerPageAttendance
  );
  const indexOfLastAttendance = currentPageAttendance * rowsPerPageAttendance;
  const indexOfFirstAttendance = indexOfLastAttendance - rowsPerPageAttendance;
  const currentAttendance = attendanceLogData.slice(
    indexOfFirstAttendance,
    indexOfLastAttendance
  );

  // ===== CIRCULATION PAGINATION =====
  const [currentPageCirculation, setCurrentPageCirculation] = useState(1);
  const rowsPerPageCirculation = 6;

  const totalPagesCirculation = Math.ceil(
    sortedCirculation.length / rowsPerPageCirculation
  );
  const indexOfLastCirculation =
    currentPageCirculation * rowsPerPageCirculation;
  const indexOfFirstCirculation =
    indexOfLastCirculation - rowsPerPageCirculation;
  const currentCirculation = sortedCirculation.slice(
    indexOfFirstCirculation,
    indexOfLastCirculation
  );

  // ===== MASTERLIST PAGINATION =====
  const [currentPageMasterlist, setCurrentPageMasterlist] = useState(1);
  const rowsPerPageMasterlist = 10;

  const totalPagesMasterlist = Math.ceil(
    masterlist.length / rowsPerPageMasterlist
  );
  const indexOfLastMasterlist = currentPageMasterlist * rowsPerPageMasterlist;
  const indexOfFirstMasterlist = indexOfLastMasterlist - rowsPerPageMasterlist;
  const currentMasterlist = masterlist.slice(
    indexOfFirstMasterlist,
    indexOfLastMasterlist
  );

  // ===== ACCOUNT REGISTRY PAGINATION =====
  const [currentPageAccounts, setCurrentPageAccounts] = useState(1);
  const rowsPerPageAccounts = 10;

  const totalPagesAccounts = Math.ceil(
    accountsData.length / rowsPerPageAccounts
  );
  const indexOfLastAccounts = currentPageAccounts * rowsPerPageAccounts;
  const indexOfFirstAccounts = indexOfLastAccounts - rowsPerPageAccounts;
  const currentAccounts = accountsData.slice(
    indexOfFirstAccounts,
    indexOfLastAccounts
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "collection":
        if (loadingCollectionData) {
          return <LoadingSpinner />;
        }
        return (
          <>
            <div className="charts-grid">
              {/* Donut Graph */}
              <div className="chart-card">
                <h2 className="chart-title">Composition by Material Type</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.materialsByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      label
                    >
                      {reportData.materialsByType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Line Graph */}
              <div className="chart-card">
                <h2 className="chart-title">Collection of Growth Over Time</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.booksPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(monthNumber) => {
                        const monthNames = [
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "May",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Dec",
                        ];
                        return (
                          monthNames[parseInt(monthNumber, 10) - 1] ||
                          monthNumber
                        );
                      }}
                    />

                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="books"
                      stroke="#C05B42"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Graph */}
              <div className="chart-card">
                <h2 className="chart-title">Inventory Control</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.sourcesPercentage}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {reportData.sourcesPercentage.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Graph */}
              <div className="chart-card">
                <h2 className="chart-title">Books per Category</h2>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    layout="vertical"
                    data={reportData.booksPerDDC}
                    margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
                  >
                    <XAxis
                      type="number"
                      ticks={Array.from(
                        {
                          length:
                            Math.ceil(
                              Math.max(
                                ...reportData.booksPerDDC.map((d) => d.books)
                              ) / 2
                            ) + 1,
                        },
                        (_, i) => i * 2
                      )}
                    />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ width: 160 }}
                    />
                    <Tooltip />
                    <Bar dataKey="books">
                      {reportData.booksPerDDC.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={DDC_COLORS[entry.category] || "#10B981"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Collection Overview Summary */}
            <div className="collection-summary-section">
              <div className="summary-header-bar">
                {/* Left: Sorting */}
                <div className="header-left">
                  <button onClick={() => sortSummary("asc")}>↑ ASC</button>
                  <button onClick={() => sortSummary("desc")}>↓ DESC</button>
                </div>

                {/* Center: Title */}
                <h2 className="summary-title">Collection Overview Summary</h2>

                {/* Right: Print / Export */}
                <div className="header-right">
                  <button
                    onClick={exportSummaryToExcel}
                    className="print-button"
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                    Export
                  </button>
                </div>
              </div>
              <div className="summary-table-container">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Material Type</th>
                      <th>Total Materials</th>
                      <th>Total Collection</th>
                      <th>Active Circulation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate total materials
                      const total = reportData.materialsByType.reduce(
                        (sum, item) => sum + item.value,
                        0
                      );

                      return reportData.materialsByType.map((item) => {
                        const activePercent =
                          Math.floor(Math.random() * 50) + 20;

                        return (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.value}</td>
                            <td>{((item.value / total) * 100).toFixed(2)}%</td>
                            <td>{activePercent}%</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Masterlist Table */}
            <div className="masterlist-section">
              <div className="masterlist-header-bar">
                {/* Left: Sorting */}
                <div className="header-left">
                  <button onClick={() => sortMasterlist("asc")}>↑ ASC</button>
                  <button onClick={() => sortMasterlist("desc")}>↓ DESC</button>
                </div>

                {/* Center: Title */}
                <h2 className="masterlist-title">Collection Masterlist</h2>

                {/* Right: Export */}
                <div className="header-right">
                  <button
                    className="print-button"
                    onClick={exportMasterlistToExcel}
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                    Export
                  </button>
                </div>
              </div>
              {loadingMasterlist ? (
                <LoadingSpinner />
              ) : (
                <div className="masterlist-container">
                  <table className="masterlist-table">
                    <thead>
                      <tr>
                        <th>Accession Number</th>
                        <th>Barcode</th>
                        <th>Copy Number</th>
                        <th>Title</th>
                        <th>Contributor</th>
                        <th>Edition</th>
                        <th>Series</th>
                        <th>Volume</th>
                        <th>Publisher</th>
                        <th>Place of Publication</th>
                        <th>Copyright</th>
                        <th>Pages</th>
                        <th>Language</th>
                        <th>Subjects</th>
                        <th>Person as Subject</th>
                        <th>ISBN</th>
                        <th>DDC</th>
                        <th>Call Number</th>
                        <th>Material Type</th>
                        <th>Cataloging Note</th>
                        <th>Source</th>
                        <th>Source Person</th>
                        <th>Status</th>
                        <th>Date Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMasterlist.map((copy, i) => (
                        <tr key={i}>
                          <td>{copy.accession_number}</td>
                          <td>{copy.barcode}</td>
                          <td>{copy.copy_number}</td>
                          <td>{copy.book?.title}</td>
                          <td>
                            {[
                              copy.book?.author,
                              copy.book?.editor,
                              copy.book?.other_author_editor,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </td>
                          <td>{copy.book?.edition}</td>
                          <td>{copy.book?.series_name}</td>
                          <td>{copy.book?.volume}</td>
                          <td>{copy.book?.publisher}</td>
                          <td>{copy.book?.place_of_publication}</td>
                          <td>{copy.book?.copyright}</td>
                          <td>{copy.book?.number_of_pages}</td>
                          <td>{copy.book?.book_language}</td>
                          <td>
                            {(() => {
                              if (!copy.book?.topical_subject) return "N/A";
                              try {
                                const subjects = Array.isArray(
                                  copy.book.topical_subject
                                )
                                  ? copy.book.topical_subject
                                  : JSON.parse(copy.book.topical_subject);
                                return subjects.length
                                  ? subjects.join(", ")
                                  : "N/A";
                              } catch {
                                return copy.book.topical_subject || "N/A";
                              }
                            })()}
                          </td>
                          <td>{copy.book?.person_as_subject}</td>
                          <td>{copy.book?.isbn}</td>
                          <td>{copy.book?.dewey_decimal}</td>
                          <td>{copy.book?.call_number}</td>
                          <td>{copy.material_type}</td>
                          <td>{copy.cataloging_note}</td>
                          <td>{copy.source}</td>
                          <td>{copy.source_person}</td>
                          <td>{copy.status}</td>
                          <td>
                            {copy.date_added
                              ? new Date(copy.date_added)
                                  .toISOString()
                                  .split("T")[0]
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* === Pagination Info + Buttons === */}
              <div className="pagination-info-report text-center mb-2 mt-3">
                Showing {indexOfFirstMasterlist + 1} -{" "}
                {Math.min(indexOfLastMasterlist, masterlist.length)} of{" "}
                {masterlist.length} entries
              </div>

              {totalPagesMasterlist > 1 && (
                <div className="pagination-report mt-1">
                  <button
                    disabled={currentPageMasterlist === 1}
                    onClick={() => setCurrentPageMasterlist((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-double-left"></i> Prev
                  </button>

                  {Array.from({ length: totalPagesMasterlist }, (_, i) => (
                    <button
                      key={i}
                      className={
                        currentPageMasterlist === i + 1 ? "active" : ""
                      }
                      onClick={() => setCurrentPageMasterlist(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    disabled={currentPageMasterlist === totalPagesMasterlist}
                    onClick={() => setCurrentPageMasterlist((p) => p + 1)}
                  >
                    Next <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          </>
        );

      case "circulation":
        if (loadingCirculation) {
          return <LoadingSpinner />;
        }

        return (
          <div className="circulation-section">
            {/* ===== Row 1: Chart + Tally Cards ===== */}
            <div className="circulation-top">
              {/* Left: Bar Chart */}
              <div className="circulation-chart">
                <h2 className="chart-title">Monthly Circulation Report</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={circulationData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="onLoan"
                      stackId="a"
                      fill="#3B82F6"
                      name="OnLoan"
                    />
                    <Bar
                      dataKey="returned"
                      stackId="a"
                      fill="#10B981"
                      name="Returned"
                    />
                    <Bar
                      dataKey="renewed"
                      stackId="a"
                      fill="#F59E0B"
                      name="Renewed"
                    />
                    <Bar
                      dataKey="overdue"
                      stackId="a"
                      fill="#EF4444"
                      name="Overdue"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Right: Tally Cards */}
              <div className="circulation-tallies">
                {[
                  {
                    label: "ON LOAN",
                    value: totals.onLoan,
                    color: "#3B82F6",
                    image: book,
                  },
                  {
                    label: "RETURNED",
                    value: totals.returned,
                    color: "#10B981",
                    image: book,
                  },
                  {
                    label: "RENEWED",
                    value: totals.renewed,
                    color: "#F59E0B",
                    image: book,
                  },
                  {
                    label: "OVERDUE",
                    value: totals.overdue,
                    color: "#EF4444",
                    image: book,
                  },
                ].map((tally) => (
                  <div
                    className="tally-card-circ"
                    key={tally.label}
                    style={{
                      border: `3px solid ${tally.color}`,
                      borderLeft: `10px solid ${tally.color}`,
                    }}
                  >
                    <img
                      src={tally.image}
                      alt={tally.label}
                      className="tally-image "
                      style={{
                        backgroundColor: tally.color,
                        padding: "5px 15px",
                        borderRadius: "8px",
                      }}
                    />
                    <div className="tally-text">
                      <div className="label" style={{ color: tally.color }}>
                        {tally.label}
                      </div>
                      <div className="value">{tally.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ===== Row 2: Summary Table ===== */}
            <div className="circulation-table-section">
              <div className="summary-header-bar">
                {/* Left: Sorting */}
                <div className="header-left">
                  <button onClick={() => sortCirculation("asc")}>↑ ASC</button>
                  <button onClick={() => sortCirculation("desc")}>
                    ↓ DESC
                  </button>
                </div>

                {/* Center: Title */}
                <h2 className="summary-title">Circulation Summary Table</h2>

                {/* Right: Print / Export */}
                <div className="header-right">
                  <button
                    onClick={exportCirculationToExcel}
                    className="print-button"
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-2"></i>Export
                  </button>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>On Loan</th>
                      <th>Returned</th>
                      <th>Renewed</th>
                      <th>Overdue</th>
                      <th>Fines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCirculation.length > 0 ? (
                      currentCirculation.map((row, i) => (
                        <tr key={i}>
                          <td>{row.month}</td>
                          <td>{row.onLoan}</td>
                          <td>{row.returned}</td>
                          <td>{row.renewed}</td>
                          <td>{row.overdue}</td>
                          <td>₱{Number(row.fines ?? 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          No circulation data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* === Pagination Info + Buttons === */}
              <div className="pagination-info-report text-center mb-2 mt-3">
                Showing {indexOfFirstCirculation + 1} -{" "}
                {Math.min(indexOfLastCirculation, sortedCirculation.length)} of{" "}
                {sortedCirculation.length} rows
              </div>

              {totalPagesCirculation > 1 && (
                <div className="pagination-report mt-1">
                  <button
                    disabled={currentPageCirculation === 1}
                    onClick={() => setCurrentPageCirculation((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-double-left"></i> Prev
                  </button>
                  {Array.from({ length: totalPagesCirculation }, (_, i) => (
                    <button
                      key={i}
                      className={
                        currentPageCirculation === i + 1 ? "active" : ""
                      }
                      onClick={() => setCurrentPageCirculation(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPageCirculation === totalPagesCirculation}
                    onClick={() => setCurrentPageCirculation((p) => p + 1)}
                  >
                    Next <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case "attendance":
        if (loadingAttendance) return <LoadingSpinner />;

        // Prepare chart data
        const barChartData = attendanceSummaryData.map((row) => ({
          date: row.date,
          Guest: row.guest,
          Patron: row.patron,
        }));
        const lineChartData = attendanceSummaryData.map((row) => ({
          date: row.date,
          Visitors: row.total,
        }));
        const summaryData = attendanceSummaryData;
        const logData = attendanceLogData;

        return (
          <div className="attendance-section">
            {/* ===== Row 1: Charts + Summary Table ===== */}
            <div className="attendance-top">
              {/* Left: Charts */}
              <div className="attendance-charts">
                <div className="chart-container">
                  <h2>Patron vs Guest Attendance</h2>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Guest" fill="#8884d8" />
                      <Bar dataKey="Patron" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container" style={{ marginTop: "20px" }}>
                  <h2>Daily Visitors</h2>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Visitors"
                        stroke="#ff7300"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Attendance Summary Table */}
              <div className="attendance-summary">
                <h2 className="summary-title">Attendance Summary</h2>
                <div className="table-wrapper">
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Guest</th>
                        <th>Patron</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.length ? (
                        [...summaryData] // create a shallow copy so we don’t mutate the original
                          .sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime()
                          ) // sort descending by date
                          .map((row, i) => (
                            <tr key={i}>
                              <td>{row.date}</td>
                              <td>{row.guest}</td>
                              <td>{row.patron}</td>
                              <td>{row.total}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center" }}>
                            No attendance summary available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ===== Row 2: Attendance Log Table ===== */}
            <div className="attendance-log-section">
              <div className="summary-header-bar">
                {/* Left: Sorting */}
                <div className="header-left">
                  <button onClick={() => sortAttendanceLog("asc")}>
                    ↑ ASC
                  </button>
                  <button onClick={() => sortAttendanceLog("desc")}>
                    ↓ DESC
                  </button>
                </div>

                {/* Center: Title */}
                <h2 className="summary-title">Attendance Log</h2>

                {/* Right: Export */}
                <div className="header-right">
                  <button
                    onClick={exportAttendanceLogToExcel}
                    className="print-button"
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                    Export
                  </button>
                </div>
              </div>

              <div className="attendance-log-container">
                <table className="attendance-log-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Full Name</th>
                      <th>Address</th>
                      <th>Contact Number</th>
                      <th>Purpose of Visit</th>
                      <th>Affiliation</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAttendance.length ? (
                      currentAttendance.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>{row.type}</td>
                          <td>{row.fullname}</td>
                          <td>{row.address ?? "-"}</td>
                          <td>{row.contact_number ?? "-"}</td>
                          <td>{row.purpose ?? "-"}</td>
                          <td>{row.affiliation ?? "-"}</td>
                          <td>{row.time_in}</td>
                          <td>{row.time_out ?? "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center" }}>
                          No attendance logs available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* === Pagination Info + Buttons === */}
              <div className="pagination-info-report text-center mb-2 mt-3">
                Showing {indexOfFirstAttendance + 1} -{" "}
                {Math.min(indexOfLastAttendance, logData.length)} of{" "}
                {logData.length} attendance logs
              </div>

              {totalPagesAttendance > 1 && (
                <div className="pagination-report mt-1">
                  <button
                    disabled={currentPageAttendance === 1}
                    onClick={() => setCurrentPageAttendance((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-double-left"></i> Prev
                  </button>
                  {Array.from({ length: totalPagesAttendance }, (_, i) => (
                    <button
                      key={i}
                      className={
                        currentPageAttendance === i + 1 ? "active" : ""
                      }
                      onClick={() => setCurrentPageAttendance(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPageAttendance === totalPagesAttendance}
                    onClick={() => setCurrentPageAttendance((p) => p + 1)}
                  >
                    Next <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case "accounts":
        // Map backend status to chart key
        const statusMapping: { [key: string]: string } = {
          active: "active",
          deactivated: "deactivate", // backend "Deactivated" maps to "deactivate"
          expired: "expired",
          blocked: "blocked",
        };

        // Define colors per status
        const statusColors: { [key: string]: string } = {
          active: "#98FF79",
          deactivate: "#FFCC59",
          expired: "#E77135",
          blocked: "#FF0000",
        };

        if (loadingAccountsData) {
          return <LoadingSpinner />;
        }

        return (
          <div className="accounts-section">
            {/* ===== TOP ROW: 3 CHARTS ===== */}
            <div className="charts-row">
              {/* 1️⃣ Bar Graph */}
              <div className="chart-card">
                <h3>Account Status</h3>
                {/* Simple manual legend */}
                <div className="legend">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div className="legend-item text-muted" key={status}>
                      <div
                        className="legend-color"
                        style={{
                          backgroundColor: color,
                        }}
                      />
                      <span>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={accountStatus}>
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />

                    {/* Tooltip showing only hovered bar */}
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        value,
                        name.charAt(0).toUpperCase() + name.slice(1),
                      ]}
                    />

                    {/* Single Bar, Cells for coloring */}
                    <Bar dataKey="total">
                      {accountStatus.map((entry, index) => {
                        const statusKey =
                          statusMapping[entry.status.toLowerCase()] ||
                          entry.status.toLowerCase();
                        return (
                          <Cell
                            key={index}
                            fill={statusColors[statusKey] || "#4e73df"}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 2️⃣ Donut Chart */}
              <div className="chart-card">
                <h3>Accounts Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      dataKey="total"
                      nameKey="role"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#82ca9d"
                      label={(props: PieLabelRenderProps) => {
                        const { name, percent, x, y } = props;
                        const pct = Number(percent ?? 0);
                        return (
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={12}
                          >
                            {name}: {(pct * 100).toFixed(2)}%
                          </text>
                        );
                      }}
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={["#36A2EB", "#FFCE56", "#FF6384"][index % 3]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 3️⃣ Line Graph */}
              <div className="chart-card">
                <h3>Newly Added Accounts</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={newAccountsPerMonth}>
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#C05B42"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ===== REGISTRY TABLE ===== */}
            <div className="accounts-registry-container">
              <div className="summary-header-bar">
                {/* Left: Sorting */}
                <div className="header-left">
                  <button
                    className={`sort-button ${
                      sortOrder === "asc" ? "active" : ""
                    }`}
                    onClick={() => sortAccountRegistry("asc")}
                  >
                    ↑ ASC
                  </button>
                  <button
                    className={`sort-button ${
                      sortOrder === "desc" ? "active" : ""
                    }`}
                    onClick={() => sortAccountRegistry("desc")}
                  >
                    ↓ DESC
                  </button>
                </div>

                {/* Center: Title */}
                <h2 className="summary-title">Account Registry Table</h2>

                {/* Right: Export */}
                <div className="header-right">
                  <button
                    onClick={exportAccountRegistryToExcel}
                    className="print-button"
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                    Export
                  </button>
                </div>
              </div>
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Date Registered</th>
                    <th>Expiration</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAccounts?.length ? (
                    currentAccounts.map((user) => (
                      <tr key={`${user.user_id}-${user.role}`}>
                        <td>{user.user_id}</td>
                        <td>{user.full_name}</td>
                        <td>{user.role}</td>
                        <td>
                          <span
                            className={`status-badges status-${user.status.toLowerCase()}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          {user.expiration_date
                            ? new Date(
                                user.expiration_date
                              ).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center" }}>
                        No account data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* === Pagination Info + Buttons === */}
              <div className="pagination-info-report text-center mb-2 mt-3">
                Showing {indexOfFirstAccounts + 1} -{" "}
                {Math.min(indexOfLastAccounts, accountsData.length)} of{" "}
                {accountsData.length} accounts
              </div>

              {totalPagesAccounts > 1 && (
                <div className="pagination-report mt-1">
                  <button
                    disabled={currentPageAccounts === 1}
                    onClick={() => setCurrentPageAccounts((p) => p - 1)}
                  >
                    <i className="bi bi-chevron-double-left"></i> Prev
                  </button>

                  {Array.from({ length: totalPagesAccounts }, (_, i) => (
                    <button
                      key={i}
                      className={currentPageAccounts === i + 1 ? "active" : ""}
                      onClick={() => setCurrentPageAccounts(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    disabled={currentPageAccounts === totalPagesAccounts}
                    onClick={() => setCurrentPageAccounts((p) => p + 1)}
                  >
                    Next <i className="bi bi-chevron-double-right"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="reports-container">
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "collection" ? "active" : ""}`}
          onClick={() => setActiveTab("collection")}
        >
          Collection Reports
        </button>
        <button
          className={`tab-button ${
            activeTab === "circulation" ? "active" : ""
          }`}
          onClick={() => setActiveTab("circulation")}
        >
          Circulation Reports
        </button>
        <button
          className={`tab-button ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => setActiveTab("attendance")}
        >
          Attendance Reports
        </button>

        {userRole === "admin" && (
          <button
            className={`tab-button ${activeTab === "accounts" ? "active" : ""}`}
            onClick={() => setActiveTab("accounts")}
          >
            Accounts Reports
          </button>
        )}
      </div>

      {renderTabContent()}
    </div>
  );
};

export default Reports;
