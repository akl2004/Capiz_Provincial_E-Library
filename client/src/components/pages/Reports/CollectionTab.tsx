import React, { useState, useEffect, useMemo } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { setupPDFHeader, setupPDFFooter } from "./ReportService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import LoadingSpinner from "../../LoadingSpinner";

interface CollectionTabProps {
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

interface LostBook {
  accession_number: string;
  copy_number?: string | number;
  title: string;
  call_number: string;
  author: string;
  first_name: string;
  last_name: string;
  date_lost?: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
const INVENTORY_COLORS: Record<string, string> = {
  Purchased: "#F36E57",
  Donation: "#F58A68",
  Replacement: "#F9A378",
  Others: "#FFBB28",
};

const MATERIAL_TYPE_MAP: Record<number | string, string> = {
  1: "Book",
  2: "Magazine",
  3: "Journal",
  4: "Thesis",
  5: "Newspaper",
  6: "Audio-Visual",
  7: "E-Resource",
  8: "Manuscript",
  9: "Map",
  10: "Microform",
  11: "Other",
};

const DDC_COLORS: Record<string, string> = {
  "General Works": "#E6644D",
  Philosophy: "#FF7144",
  Religion: "#E64E22",
  "Social Sciences": "#FF7463",
  Language: "#FF782B",
  Science: "#F28500",
  Technology: "#FF5900",
  Arts: "#FF8F4E",
  Literature: "#E86F2E",
  "History & Geography": "#FF8040",
};

const DDC_CATEGORIES: Record<string, string> = {
  "000": "General Works",
  "100": "Philosophy",
  "200": "Religion",
  "300": "Social Sciences",
  "400": "Language",
  "500": "Science",
  "600": "Technology",
  "700": "Arts",
  "800": "Literature",
  "900": "History & Geography",
};

const CollectionTab: React.FC<CollectionTabProps> = ({
  activeTab,
  filters,
  printRequest,
  onPrintComplete,
}) => {
  const [reportData, setReportData] = useState<any>(null);
  const [masterlist, setMasterlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const itemsPerPage = 10;

  useEffect(() => {
    if (activeTab !== "collection") return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportRes, masterRes] = await Promise.all([
          AxiosInstance.get("/reports/collection"),
          AxiosInstance.get("/reports/collection-masterlist"),
        ]);

        const counts: Record<string, number> = {};
        Object.values(DDC_CATEGORIES).forEach((cat) => (counts[cat] = 0));

        (reportRes.data.booksByCategory || []).forEach((item: any) => {
          const category = item.category || "Other";
          const total = Number(item.total) || 0;
          if (counts.hasOwnProperty(category)) {
            counts[category] += total;
          }
        });

        const booksPerDDC = Object.values(DDC_CATEGORIES).map((name) => ({
          category: name,
          books: counts[name] || 0,
        }));

        setReportData({
          materialsByType: (reportRes.data.materialsByType || []).map(
            (item: any) => ({
              name:
                MATERIAL_TYPE_MAP[item.material_type_id] ||
                item.material_type ||
                "Unknown",
              value: Number(item.total || item.value),
            }),
          ),
          booksPerMonth: (reportRes.data.booksPerMonth || []).map(
            (item: any) => ({
              month: item.month,
              books: Number(item.total),
            }),
          ),
          sourcesPercentage: (reportRes.data.sources || []).map(
            (item: any) => ({
              name: item.source || item.name,
              value: Number(item.total || item.value),
            }),
          ),
          booksPerDDC,
          collectionOverview: (reportRes.data.collectionOverview || []).map(
            (item: any) => ({
              ...item,

              material_type:
                MATERIAL_TYPE_MAP[item.material_type_id] || item.material_type,
            }),
          ),
        });

        setMasterlist(masterRes.data || []);
      } catch (err) {
        console.error("Failed to fetch collection data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // Design requirement: sorted data for the Bar Chart
  const sortedData = useMemo(() => {
    if (!reportData?.booksPerDDC) return [];
    return [...reportData.booksPerDDC].sort((a, b) => b.books - a.books);
  }, [reportData]);

  const getIdentifier = (book: any) => {
    if (book?.issn) return `ISSN: ${book.issn}`;
    if (book?.isbn_paperback) return `ISBN (PB): ${book.isbn_paperback}`;
    if (book?.isbn_hardcover) return `ISBN (HC): ${book.isbn_hardcover}`;
    return book?.isbn || "-";
  };

  useEffect(() => {
    if (printRequest && activeTab === "collection") {
      const specialTypes: Record<string, string> = {
        "Full Inventory": "All",
        "Summary Only": "Summary_Only",
        "DDC Only": "DDC_Only",
        "Lost Books": "Lost_Books",
      };

      const preparedBy = printRequest.preparedBy || "Librarian / Staff Name";
      const notedBy = printRequest.notedBy || "Provincial Librarian";

      const targetCategory =
        specialTypes[printRequest.type] || printRequest.type;

      setSelectedCategory(targetCategory);

      exportSummaryToPDF(targetCategory, preparedBy, notedBy);

      onPrintComplete();
    }
  }, [printRequest, activeTab]);

  const [lostBooksList, setLostBooksList] = useState<LostBook[]>([]);

  const fetchLostBooks = async () => {
    try {
      // Replace with your actual API route
      const response = await AxiosInstance.get("/reports/lost-books-details");
      setLostBooksList(response.data);
    } catch (error) {
      console.error("Failed to fetch lost books", error);
    }
  };

  // Fetch when the user picks the "Lost Books" category
  useEffect(() => {
    if (selectedCategory === "Lost_Books" || selectedCategory === "All") {
      fetchLostBooks();
    }
  }, [selectedCategory]);

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
      Subjects: (() => {
        if (!copy.book?.topical_subject) return "N/A";
        try {
          const subjects = Array.isArray(copy.book.topical_subject)
            ? copy.book.topical_subject
            : JSON.parse(copy.book.topical_subject);
          return subjects.length ? subjects.join(", ") : "N/A";
        } catch {
          return copy.book.topical_subject || "N/A";
        }
      })(),
      "Person as Subject": copy.book?.person_as_subject,
      Identifier: getIdentifier(copy.book),
      DDC: copy.book?.dewey_decimal,
      "Call Number": copy.book?.call_number,
      "Material Type":
        MATERIAL_TYPE_MAP[copy.material_type_id] || copy.material_type_id,
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
        ...data.map((row) => (row[key] ? row[key].toString().length : 0)),
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

  const exportSummaryToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(reportData.collectionOverview);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
    XLSX.writeFile(workbook, "Collection_Summary.xlsx");
  };

  const getFilteredData = (dataArray: any[]) => {
    const now = new Date();
    if (!dataArray || dataArray.length === 0) return [];

    return dataArray.filter((item) => {
      // 1. Look for ANY date property available on the object
      const rawDate = item.date_lost || item.created_at || item.date_added;

      // 2. If "All Time" is selected, show everything
      if (filters.timeRange === "all-time") return true;

      // 3. If the item has no date at all, show it (safety net)
      if (!rawDate) return true;

      const itemDate = new Date(rawDate);

      // 4. Match against your global filters
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
      return true;
    });
  };

  // Export summary to PDF
  const exportSummaryToPDF = (
    overrideCategory?: string,
    preparedBy: string = "Librarian / Staff Name",
    notedBy: string = "Provincial Librarian",
  ) => {
    if (!reportData || !masterlist) return;

    const doc = new jsPDF();
    const margin = 20;

    // --- STEP 1: FILTER DATA BY TIME RANGE ---
    const currentCategory = overrideCategory || selectedCategory;
    const filteredMaster = getFilteredData(masterlist);

    // Logic Flags (Keep your data logic)
    const isAll = currentCategory === "All";
    const isSummaryOnly = currentCategory === "Summary_Only";
    const isDDCOnly = currentCategory === "DDC_Only";
    const isLostBooks = currentCategory === "Lost_Books";
    const isSpecificDDC =
      !isAll && !isSummaryOnly && !isDDCOnly && !isLostBooks;

    let reportLabel =
      currentCategory.toUpperCase().replace("_", " ") + " REPORT";
    if (isAll) reportLabel = "FULL INVENTORY SUMMARY";
    if (isDDCOnly) reportLabel = "DDC DISTRIBUTION REPORT";
    if (isLostBooks) reportLabel = "LOST BOOKS REPORT";
    // Add the time range to the title so it looks professional
    const fullTitle = `${reportLabel} (${filters.timeRange
      .replace("-", " ")
      .toUpperCase()})`;

    // --- STEP 3: USE YOUR NEW SKELETON HEADER ---
    let currentY = setupPDFHeader(doc, fullTitle);

    // --- 2. MATERIAL SUMMARY TABLE (Data Kept) ---
    if (isAll || isSummaryOnly) {
      doc.setFontSize(12).setFont("helvetica", "bold");
      doc.text("Material Type Summary", margin, currentY);
      currentY += 6;

      // 1. Group your filteredMaster by material type to get fresh totals
      const materialCounts = filteredMaster.reduce((acc: any, item: any) => {
        const type = item.material_type || "Book";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // 2. Map those fresh totals into the table
      autoTable(doc, {
        startY: currentY,
        theme: "grid",
        head: [["Material Type", "Quantity", "Collection Contribution"]],
        body: Object.entries(materialCounts).map(([type, count]) => [
          type,
          Number(count).toLocaleString(),
          `${((Number(count) / filteredMaster.length) * 100).toFixed(1)}%`,
        ]),
        headStyles: { fillColor: [192, 91, 66], halign: "center" },
        margin: { left: margin, right: margin, bottom: 50 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // --- 3. DDC DISTRIBUTION TABLE (Data Kept) ---
    if (isAll || isDDCOnly) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12).setFont("helvetica", "bold");
      doc.text(
        "Dewey Decimal Classification (DDC) Distribution",
        margin,
        currentY,
      );
      currentY += 6;

      // 1. RE-CALCULATE DDC COUNTS BASED ON FILTERS
      const ddcCounts: Record<string, number> = {};
      Object.values(DDC_CATEGORIES).forEach((cat) => (ddcCounts[cat] = 0));

      // Count only the books that passed the date filter
      filteredMaster.forEach((item: any) => {
        const ddcCode = item.book?.dewey_decimal || "";
        const firstDigit = ddcCode.charAt(0) + "00"; // Get "100", "200", etc.
        const categoryName =
          DDC_CATEGORIES[firstDigit] || "Others/Unclassified";

        if (ddcCounts[categoryName] !== undefined) {
          ddcCounts[categoryName]++;
        }
      });

      // 2. GENERATE THE TABLE
      autoTable(doc, {
        startY: currentY,
        theme: "striped",
        head: [["DDC Category", "Total Added in Period"]],
        body: Object.entries(ddcCounts)
          .filter(([_, count]) => count > 0 || isDDCOnly) // Show all if DDC Only, otherwise only those with data
          .map(([category, count]) => [category, count.toLocaleString()]),
        headStyles: { fillColor: [192, 91, 66] },
        margin: { left: margin, right: margin, bottom: 50 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // --- 4. DETAILED LISTING (Data Kept) ---
    if (isAll || isSpecificDDC) {
      if (isAll) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detailed Collection Listing", margin, currentY);
      currentY += 6;
      const categoriesToProcess = isAll
        ? sortedData
        : sortedData.filter((c) => c.category === selectedCategory);

      categoriesToProcess.forEach((catObj: any) => {
        const categoryName = catObj.category;
        const categoryPrefix = Object.keys(DDC_CATEGORIES).find(
          (key) => DDC_CATEGORIES[key] === categoryName,
        );

        let booksInCategory = filteredMaster.filter((item: any) => {
          const ddc = item.book?.dewey_decimal || "";
          return (
            categoryPrefix && ddc.startsWith(categoryPrefix.substring(0, 1))
          );
        });

        if (isAll) {
          booksInCategory = booksInCategory.slice(0, 15);
        }

        if (booksInCategory.length > 0) {
          autoTable(doc, {
            startY: currentY,
            theme: "grid",
            head: [
              [
                {
                  content: categoryName,
                  colSpan: 5,
                  styles: { fillColor: [192, 91, 66], fontStyle: "bold" },
                },
              ],
              [
                "Accession",
                "Call Number",
                "Title",
                "Author/Editor",
                "Published",
                "Condition",
              ],
            ],
            body: booksInCategory.map((b: any) => [
              b.accession_number,
              b.book?.call_number || "N/A",
              b.book?.title,
              b.book?.author || b.book?.editor || "N/A",
              `${b.book?.place_of_publication || ""}, ${
                b.book?.publisher || ""
              }, ${b.book?.copyright || ""}`.replace(/^: |, $/g, ""),
              b.condition,
            ]),
            styles: { fontSize: 8 },
            margin: { left: margin, right: margin, bottom: 50 },
          });
          currentY = (doc as any).lastAutoTable.finalY + 10;
        }
      });
    }

    // --- 5. LOST BOOKS SECTION (Data Kept) ---
    if (isAll || isLostBooks) {
      if (isAll) {
        doc.addPage();
        currentY = 20;
      }

      // 1. Filter the data using your updated function
      const filteredLost = getFilteredData(lostBooksList);

      doc.setFontSize(12).setFont("helvetica", "bold");
      doc.text("Lost Books Listing", margin, currentY);
      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        theme: "grid",
        head: [
          ["Accession", "Copy", "Title", "Call Number", "Author", "Lost By"],
        ],
        // 2. Use filteredLost here
        body:
          filteredLost.length > 0
            ? filteredLost.map((item: any) => [
                item.accession_number,
                item.copy_number || "1",
                item.book?.title || item.title || "N/A",
                item.book?.call_number || item.call_number || "N/A",
                item.book?.author || item.author || "N/A",
                `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                  "Unknown",
              ])
            : [
                [
                  "-",
                  "-",
                  "No lost books found for this period",
                  "-",
                  "-",
                  "-",
                ],
              ],
        headStyles: { fillColor: [192, 91, 66] },
        styles: { fontSize: 8 },
        margin: { left: margin, right: margin, bottom: 50 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- STEP 6: USE YOUR NEW SKELETON FOOTER ---
    setupPDFFooter(doc, preparedBy, notedBy);

    doc.save(`${reportLabel.replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) return <LoadingSpinner />;
  if (!reportData)
    return <div className="p-4 text-center">No data available.</div>;

  const indexOfLastMasterlist = currentPage * itemsPerPage;
  const indexOfFirstMasterlist = indexOfLastMasterlist - itemsPerPage;
  const currentMasterlist = masterlist.slice(
    indexOfFirstMasterlist,
    indexOfLastMasterlist,
  );
  const totalPagesMasterlist = Math.ceil(masterlist.length / itemsPerPage);

  return (
    <>
      <div className="charts-grid">
        {/* Composition by Material Type */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Composition by Material Type</h2>
            <span className="badge bg-light text-dark border chart-badge">
              Live Data
            </span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={reportData.materialsByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                cornerRadius={6}
                label={false}
              >
                {reportData.materialsByType.map((_: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                layout="horizontal"
                formatter={(value) => {
                  const item = reportData.materialsByType.find(
                    (d: any) => d.name === value,
                  );
                  const total = reportData.materialsByType.reduce(
                    (sum: number, d: any) => sum + d.value,
                    0,
                  );
                  const percentage = item
                    ? ((item.value / total) * 100).toFixed(0)
                    : 0;
                  return (
                    <span
                      style={{
                        color: "#333",
                        fontSize: "13px",
                        fontWeight: "500",
                      }}
                    >
                      {value} ({percentage}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Collection Growth Over Time */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Collection Growth Over Time</h2>
            <span className="badge bg-light text-dark border chart-badge">
              Monthly Growth
            </span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={reportData.booksPerMonth}
              margin={{ top: 10, right: 30, left: -10, bottom: 10 }}
            >
              <defs>
                <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C05B42" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C05B42" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tickFormatter={(val) => {
                  const months = [
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
                  return months[parseInt(val, 10) - 1] || val;
                }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#666" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="books"
                stroke="#C05B42"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorBooks)"
                dot={{ r: 4, fill: "#C05B42", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Control */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Inventory Control</h2>
            <span className="badge bg-light text-dark border chart-badge">
              Asset Status
            </span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={reportData.sourcesPercentage}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                paddingAngle={3}
                cornerRadius={4}
              >
                {reportData.sourcesPercentage.map(
                  (entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        INVENTORY_COLORS[entry.name] ||
                        COLORS[index % COLORS.length]
                      }
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ),
                )}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                formatter={(value) => (
                  <span
                    style={{
                      color: "#333",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Books per Category */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Books per Category</h2>
            <span className="badge bg-light text-dark border chart-badge">
              DDC Distribution
            </span>
          </div>

          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              layout="vertical"
              data={sortedData}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              barSize={30}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#f0f0f0"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#666" }}
              />
              <YAxis
                dataKey="category"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#444" }}
                width={150}
              />
              <Tooltip
                cursor={{ fill: "#f8f9fa" }}
                contentStyle={{ borderRadius: "8px", border: "none" }}
              />
              <Bar dataKey="books" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DDC_COLORS[entry.category] || "#10B981"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collection Overview Summary */}
      <div
        className="collection-summary-section card shadow-sm mb-4 mt-4"
        style={{ borderRadius: "12px", overflow: "hidden" }}
      >
        <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
          <div>
            <h5 className="fw-bold mb-1" style={{ color: "#2d3436" }}>
              Collection Overview
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
              Detailed breakdown by material category
            </p>
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
                    letterSpacing: "0.5px",
                  }}
                >
                  <th className="ps-4 py-3 border-0 text-muted">
                    Material Type
                  </th>
                  <th className="py-3 border-0 text-muted text-center">
                    Quantity
                  </th>
                  <th className="py-3 border-0 text-muted">
                    Total Collection (%)
                  </th>
                  <th className="py-3 border-0 text-muted">
                    Active Circulation
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.collectionOverview.map(
                  (item: any, index: number) => (
                    <tr
                      key={item.material_type}
                      style={{ borderBottom: "1px solid #f8f9fa" }}
                    >
                      <td className="ps-4 py-3">
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle me-3"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          ></div>
                          <span
                            className="fw-semibold"
                            style={{ color: "#4b4b4b" }}
                          >
                            {item.material_type}
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-3">
                        <span
                          className="badge bg-light text-dark border-0 fw-bold px-3 py-2"
                          style={{ borderRadius: "8px" }}
                        >
                          {item.total.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3">
                        <div
                          className="d-flex align-items-center"
                          style={{ width: "150px" }}
                        >
                          <div
                            className="progress flex-grow-1"
                            style={{
                              height: "6px",
                              borderRadius: "10px",
                              backgroundColor: "#f0f2f5",
                            }}
                          >
                            <div
                              className="progress-bar"
                              style={{
                                width: `${item.percent_of_total}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                                borderRadius: "10px",
                              }}
                            />
                          </div>
                          <span
                            className="ms-3 fw-bold text-muted"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {item.percent_of_total}%
                          </span>
                        </div>
                      </td>
                      <td className="pe-4 py-3">
                        <div className="d-flex align-items-center justify-content-start">
                          <span
                            className={`me-2 fw-bold ${
                              item.percent_active > 50
                                ? "text-success"
                                : "text-warning"
                            }`}
                            style={{ fontSize: "0.85rem" }}
                          >
                            {item.percent_active}%
                          </span>
                          <div
                            style={{
                              width: "40px",
                              height: "4px",
                              background: `linear-gradient(to right, #10B981 ${item.percent_active}%, #eee ${item.percent_active}%)`,
                              borderRadius: "2px",
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Masterlist Table */}
      <div
        className="masterlist-section card mt-4 shadow-sm"
        style={{ width: "100%", maxWidth: "100%" }}
      >
        <div
          className="shadow-sm border-0"
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            maxWidth: "calc(100vw - 40px)",
            backgroundColor: "#fff",
          }}
        >
          <div className="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 className="fw-bold mb-1">Collection Masterlist</h5>
              <p className="text-muted mb-0" style={{ fontSize: "0.8rem" }}>
                Swipe table left/right to view all columns
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={exportMasterlistToExcel}
                className="btn btn-sm btn-success px-3 shadow-sm border-0"
                style={{ borderRadius: "6px" }}
              >
                <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            <div
              className="table-responsive"
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <th
                      className="ps-4 py-3 bg-white"
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 11,
                        borderRight: "1px solid #eee",
                      }}
                    >
                      Accession
                    </th>
                    <th
                      className="py-3 bg-white"
                      style={{
                        position: "sticky",
                        left: "100px",
                        zIndex: 11,
                        borderRight: "2px solid #eee",
                      }}
                    >
                      Title
                    </th>
                    <th className="px-3">Material</th>
                    <th className="px-3">Call No.</th>
                    <th className="px-3">Barcode</th>
                    <th className="px-3">Status</th>
                    <th className="px-3">Contributor</th>
                    <th className="px-3">Edition</th>
                    <th className="px-3">Series</th>
                    <th className="px-3">Publisher</th>
                    <th className="px-3 pe-4">Date Added</th>
                  </tr>
                </thead>
                <tbody style={{ whiteSpace: "nowrap" }}>
                  {currentMasterlist.map((copy, i) => (
                    <tr key={i} style={{ fontSize: "0.85rem" }}>
                      <td
                        className="ps-4 py-3 bg-white fw-bold text-muted"
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 10,
                          borderRight: "1px solid #eee",
                        }}
                      >
                        {copy.accession_number}
                      </td>
                      <td
                        className="py-3 bg-white"
                        style={{
                          position: "sticky",
                          left: "100px",
                          zIndex: 10,
                          borderRight: "2px solid #eee",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <strong>{copy.book?.title}</strong>
                        </div>
                      </td>
                      <td className="px-3">
                        {MATERIAL_TYPE_MAP[copy.material_type_id] || "Book"}
                      </td>
                      <td className="px-3 fw-semibold">
                        {copy.book?.call_number}
                      </td>
                      <td className="px-3 text-muted">{copy.barcode}</td>
                      <td className="px-3">
                        <span
                          className={`badge ${
                            copy.status === "Available"
                              ? "text-success bg-success-subtle"
                              : "text-secondary bg-light"
                          } border-0`}
                        >
                          {copy.status}
                        </span>
                      </td>
                      <td className="px-3 text-muted">
                        {copy.book?.author || "-"}
                      </td>
                      <td className="px-3 text-muted">
                        {copy.book?.edition || "-"}
                      </td>
                      <td className="px-3 text-muted">
                        {[
                          copy.book?.series_name,
                          copy.book?.volume ? `${copy.book.volume}` : null,
                        ]
                          .filter(Boolean)
                          .join(" - ") || "-"}
                      </td>
                      <td className="px-3 text-muted">
                        {[
                          copy.book?.place_of_publication,
                          copy.book?.publisher,
                          copy.book?.copyright,
                        ]
                          .filter(Boolean)
                          .join(", ") || "-"}
                      </td>
                      <td className="px-3 pe-4 text-muted">
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
          </div>

          {/* MATCHING PAGINATION STYLE */}
          <div className="card-footer bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center border-top">
            <small className="fw-medium text-secondary">
              Showing{" "}
              <span className="text-dark">{indexOfFirstMasterlist + 1}</span> to{" "}
              <span className="text-dark">
                {Math.min(indexOfLastMasterlist, masterlist.length)}
              </span>{" "}
              of <span className="text-dark">{masterlist.length}</span> entries
            </small>

            <nav>
              <ul className="pagination pagination-sm mb-0 gap-1">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link rounded border-0 bg-light text-muted"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                </li>

                {[...Array(totalPagesMasterlist)].map((_, i) => {
                  // Logic to show limited page numbers if there are too many
                  if (
                    totalPagesMasterlist > 5 &&
                    (i + 1 < currentPage - 1 || i + 1 > currentPage + 1) &&
                    i !== 0 &&
                    i !== totalPagesMasterlist - 1
                  ) {
                    if (i + 1 === currentPage - 2 || i + 1 === currentPage + 2)
                      return (
                        <li key={i} className="px-1 text-muted">
                          ...
                        </li>
                      );
                    return null;
                  }

                  return (
                    <li
                      key={i}
                      className={`page-item ${
                        currentPage === i + 1 ? "active" : ""
                      }`}
                    >
                      <button
                        className="page-link rounded border-0 mx-1 shadow-none"
                        onClick={() => setCurrentPage(i + 1)}
                        style={{
                          backgroundColor:
                            currentPage === i + 1 ? "#c05b42" : "transparent",
                          color: currentPage === i + 1 ? "#fff" : "#64748b",
                          fontWeight: currentPage === i + 1 ? "600" : "400",
                        }}
                      >
                        {i + 1}
                      </button>
                    </li>
                  );
                })}

                <li
                  className={`page-item ${
                    currentPage === totalPagesMasterlist ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link rounded border-0 bg-light text-muted"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPagesMasterlist, p + 1),
                      )
                    }
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default CollectionTab;
