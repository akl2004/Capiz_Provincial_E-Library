import { useEffect, useState, useRef } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import coverPlaceholder from "/src/assets/cover_placeholder.jpg";
import * as XLSX from "xlsx";

interface BookCopy {
  id: number;
  accession_number: string;
  copy_number: string;
  material_type: string;
  barcode: string;
  source: string;
  price: number;
  source_person: string;
  cataloging_note: string;
  internal_note: string;
}

interface Book {
  id: number;
  cover_image: string;
  title: string;
  authors: string[];
  edition: string | null;
  volume: string | null;
  number_of_pages: number | null;
  section: string;
  dewey_decimal: string;
  created_at: string;
  copies: BookCopy[];
}

interface FlattenedCopy {
  bookId: number;
  accession_number: string;
  copy_number: string;
  title: string;
  section: string;
  source: string;
  price: number;
  created_at: string;
  cover_image?: string | null;
  material_type?: string;
  barcode?: string;
  source_person?: string;
  cataloging_note?: string;
  internal_note?: string;
}

const Accession = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<
    "accession" | "title" | "date" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const copiesPerPage = 10;

  const [selectedCopy, setSelectedCopy] = useState<FlattenedCopy | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  // Dropdown states
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [activeFilterSection, setActiveFilterSection] = useState<
    "section" | "source" | "date" | null
  >(null);

  // Date Filter
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null); // 0-11
  const [filterWeek, setFilterWeek] = useState<number | null>(null); // 1-5
  const [showDateOptions, setShowDateOptions] = useState(false);

  // Fetch books
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const response = await AxiosInstance.get("/books");
        const booksData = Array.isArray(response.data)
          ? response.data
          : response.data.data;
        setBooks(booksData);
      } catch (error) {
        console.error("Error fetching books:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  // Flatten copies
  const flattenedCopies: FlattenedCopy[] = books.flatMap((book) =>
    book.copies.map((copy) => ({
      bookId: book.id,
      accession_number: copy.accession_number,
      copy_number: copy.copy_number,
      title: book.title,
      section: book.section,
      source: copy.source,
      price: copy.price,
      created_at: book.created_at,
      cover_image: book.cover_image
        ? `http://localhost:8000/storage/${book.cover_image}`
        : null,
      material_type: copy.material_type,
      barcode: copy.barcode,
      source_person: copy.source_person,
      cataloging_note: copy.cataloging_note,
      internal_note: copy.internal_note,
    }))
  );

  // Filter logic
  const filteredCopies = flattenedCopies.filter((copy) => {
    const matchesSearch = [
      copy.accession_number,
      copy.copy_number,
      copy.title,
      copy.section,
      copy.source,
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesSection = sectionFilter
      ? copy.section === sectionFilter
      : true;
    const matchesSource = sourceFilter ? copy.source === sourceFilter : true;

    let matchesDate = true;
    if (filterYear) {
      const copyDate = new Date(copy.created_at);
      matchesDate = copyDate.getFullYear() === filterYear;

      if (filterMonth !== null) {
        matchesDate = matchesDate && copyDate.getMonth() === filterMonth;
      }

      if (filterWeek !== null && filterMonth !== null) {
        // Week of month (1-5)
        const day = copyDate.getDate();
        const weekOfMonth = Math.ceil(day / 7);
        matchesDate = matchesDate && weekOfMonth === filterWeek;
      }
    }

    return matchesSearch && matchesSection && matchesSource && matchesDate;
  });

  // Sorting
  const sortedCopies = [...filteredCopies].sort((a, b) => {
    if (!sortField) return 0;
    if (sortField === "title")
      return sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    if (sortField === "date")
      return sortOrder === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortField === "accession")
      return sortOrder === "asc"
        ? a.accession_number.localeCompare(b.accession_number)
        : b.accession_number.localeCompare(a.accession_number);
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedCopies.length / copiesPerPage);
  const indexOfLastCopy = currentPage * copiesPerPage;
  const indexOfFirstCopy = indexOfLastCopy - copiesPerPage;
  const currentCopies = sortedCopies.slice(indexOfFirstCopy, indexOfLastCopy);

  // Close menus on outside click
  useEffect(() => {
    document.title = "Accession";
    const handleClickOutside = (event: MouseEvent) => {
      // Close sort menu if clicked outside
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }

      // Close filter menu if clicked outside
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterMenuOpen(false);
      }

      // Close slider panel if clicked outside
      if (
        sliderRef.current &&
        !sliderRef.current.contains(event.target as Node)
      ) {
        setSelectedCopy(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Export function
  const handleExportToExcel = () => {
    if (sortedCopies.length === 0) return;

    // Prepare the data in a flat object array
    const dataToExport = sortedCopies.map((copy) => ({
      "Accession No": copy.accession_number,
      Title: copy.title,
      Section: copy.section,
      "Copy No": copy.copy_number,
      "Date Added": new Date(copy.created_at).toLocaleDateString(),
      "Source Acquisition": copy.source,
    }));

    // Convert JSON to worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto column widths
    type ExportKey =
      | "Accession No"
      | "Title"
      | "Section"
      | "Copy No"
      | "Date Added"
      | "Source Acquisition";

    const colWidths = Object.keys(dataToExport[0]).map((key) => ({
      wch: Math.max(
        key.length,
        ...dataToExport.map((row) =>
          row[key as ExportKey] ? row[key as ExportKey].toString().length : 0
        )
      ),
    }));
    worksheet["!cols"] = colWidths;

    // Apply bold style to header row
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "");
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C }); // First row
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true },
        };
      }
    }

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accession Record");

    // Export to Excel file
    XLSX.writeFile(workbook, "accession_record.xlsx");
  };

  return (
    <div className="copies-info mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="text-xl font-semibold mb-0">Accession Record</h1>
          <p className="mb-0">
            {" "}
            <i>
              Unique identification details for each library item from
              acquisition to shelving.
            </i>
          </p>
        </div>

        {/* Controls */}
        <div className="d-flex gap-2 align-items-center">
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
              placeholder="Search accession"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sort Controls */}
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
                    { field: "accession", label: "Accession Number" },
                    { field: "title", label: "Title" },
                    { field: "date", label: "Date Acquired" },
                  ].map(({ field, label }) => (
                    <div
                      key={field}
                      className="sort-field"
                      onClick={() =>
                        setSortField(
                          sortField === field ? null : (field as any)
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
                    onClick={() => {
                      if (!sortField) return;
                      if (sortOrder === "asc") setSortField(null);
                      else setSortOrder("asc");
                    }}
                  >
                    ASC
                  </button>
                  <button
                    className={`sort-btn ${
                      sortField && sortOrder === "desc" ? "active" : ""
                    }`}
                    onClick={() => {
                      if (!sortField) return;
                      if (sortOrder === "desc") setSortField(null);
                      else setSortOrder("desc");
                    }}
                  >
                    DESC
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter dropdown */}
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
                {/* Section Filter */}
                <div
                  className={`filter-section-header ${
                    activeFilterSection === "section" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveFilterSection(
                      activeFilterSection === "section" ? null : "section"
                    )
                  }
                >
                  Section{" "}
                  <i
                    className={`bi ${
                      activeFilterSection === "section"
                        ? "bi-chevron-down"
                        : "bi-chevron-right"
                    } ms-2`}
                  ></i>
                </div>
                {activeFilterSection === "section" &&
                  ["Filipiniana", "Gen. Reference", "Gen. Circulation"].map(
                    (section) => (
                      <div
                        key={section}
                        className={`filter-item ${
                          sectionFilter === section ? "active" : ""
                        }`}
                        onClick={() =>
                          setSectionFilter(
                            sectionFilter === section ? null : section
                          )
                        }
                      >
                        {section}
                      </div>
                    )
                  )}

                {/* Source Filter */}
                <div
                  className={`filter-section-header ${
                    activeFilterSection === "source" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveFilterSection(
                      activeFilterSection === "source" ? null : "source"
                    )
                  }
                >
                  Source of Acquisition{" "}
                  <i
                    className={`bi ${
                      activeFilterSection === "source"
                        ? "bi-chevron-down"
                        : "bi-chevron-right"
                    } ms-2`}
                  ></i>
                </div>
                {activeFilterSection === "source" &&
                  ["Purchased", "Donation", "Exchange", "Legal Deposit"].map(
                    (src) => (
                      <div
                        key={src}
                        className={`filter-item ${
                          sourceFilter === src ? "active" : ""
                        }`}
                        onClick={() =>
                          setSourceFilter(sourceFilter === src ? null : src)
                        }
                      >
                        {src}
                      </div>
                    )
                  )}

                {/* Date Filter */}
                <div
                  className={`filter-section-header ${
                    filterYear || filterMonth !== null || filterWeek !== null
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    if (showDateOptions) {
                      setFilterYear(null);
                      setFilterMonth(null);
                      setFilterWeek(null);
                    }
                    setShowDateOptions(!showDateOptions);
                  }}
                >
                  Date Added{" "}
                  <i
                    className={`bi ${
                      showDateOptions ? "bi-chevron-down" : "bi-chevron-right"
                    } ms-2`}
                  ></i>
                </div>

                {showDateOptions && (
                  <div
                    className="filter-date-options d-flex"
                    style={{ gap: "2px" }}
                  >
                    {/* Year */}
                    <select
                      value={filterYear ?? ""}
                      onChange={(e) =>
                        setFilterYear(e.target.value ? +e.target.value : null)
                      }
                      className="form-select form-select-sm"
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>

                    {/* Month */}
                    <select
                      value={filterMonth ?? ""}
                      onChange={(e) =>
                        setFilterMonth(e.target.value ? +e.target.value : null)
                      }
                      className="form-select form-select-sm"
                      disabled={!filterYear}
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {new Date(0, i).toLocaleString("default", {
                            month: "short",
                          })}
                        </option>
                      ))}
                    </select>

                    {/* Week */}
                    <select
                      value={filterWeek ?? ""}
                      onChange={(e) =>
                        setFilterWeek(e.target.value ? +e.target.value : null)
                      }
                      className="form-select form-select-sm"
                      disabled={!filterYear || !filterMonth}
                    >
                      <option value="">Week</option>
                      {Array.from({ length: 5 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Export Controls */}
          <div className="position-relative">
            {/* Export / Print */}
            <button
              className="btn btn-outline-secondary d-flex align-items-center"
              onClick={handleExportToExcel}
            >
              <i className="bi bi-file-earmark-spreadsheet me-2"></i> Export
            </button>
          </div>
        </div>
      </div>

      {/* Table + Pagination */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Accession No.</th>
                <th>Title</th>
                <th>Section</th>
                <th>Copy No.</th>
                <th>Date Added</th>
                <th>Source Acquisition</th>
              </tr>
            </thead>
            <tbody>
              {currentCopies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    No accession records found.
                  </td>
                </tr>
              ) : (
                currentCopies.map((copy) => (
                  <tr
                    key={`${copy.accession_number}-${copy.copy_number}`}
                    onClick={() => setSelectedCopy(copy)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{copy.accession_number}</td>
                    <td>{copy.title}</td>
                    <td>{copy.section}</td>
                    <td>{copy.copy_number}</td>
                    <td>{new Date(copy.created_at).toLocaleDateString()}</td>
                    <td>{copy.source}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="pagination-info text-center mb-2 mt-3">
            Showing {indexOfFirstCopy + 1} -{" "}
            {Math.min(indexOfLastCopy, sortedCopies.length)} of{" "}
            {sortedCopies.length} copies
          </div>

          {totalPages > 1 && (
            <div className="pagination mt-1">
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
        </>
      )}

      {/* Slider Panel */}
      {selectedCopy && (
        <div className="slider-panel" ref={sliderRef}>
          <button className="close-btn" onClick={() => setSelectedCopy(null)}>
            &times;
          </button>
          <div className="slider-image-title">
            <img
              src={
                selectedCopy.cover_image
                  ? selectedCopy.cover_image
                  : coverPlaceholder
              }
              alt={selectedCopy.title}
              className="img-fluid"
              style={{
                maxHeight: "200px",
                objectFit: "contain",
                width: "80%",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = coverPlaceholder;
              }}
            />

            <h5>{selectedCopy.title}</h5>
          </div>
          <div className="slider-details mt-4">
            {[
              ["Accession No", selectedCopy.accession_number],
              ["Section", selectedCopy.section],
              ["Copy No", selectedCopy.copy_number],
              ["Material Type", selectedCopy.material_type || "-"],
              ["Barcode", selectedCopy.barcode],
              [
                "Date Acquired",
                selectedCopy.created_at
                  ? new Date(selectedCopy.created_at).toLocaleDateString()
                  : "-",
              ],
              ["Price", selectedCopy.price ? `₱${selectedCopy.price}` : "-"],
              ["Source of Acquisition", selectedCopy.source || "-"],
              ["Funding Source", selectedCopy.source_person || "-"],
              ["Cataloging Note", selectedCopy.cataloging_note || "-"],
              ["Internal Notes", selectedCopy.internal_note || "-"],
            ].map(([label, value]) => (
              <div className="detail-row" key={label}>
                <span className="detail-label">{label}:</span>
                <span className="detail-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Accession;
