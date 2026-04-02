import React, { useEffect, useState, useRef } from "react";
import AxiosInstance, { BASE_URL } from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import coverPlaceholder from "/src/assets/cover_placeholder.jpg";
import available from "/src/assets/accession-icons/available.png";
import total from "/src/assets/accession-icons/total.png";
import repair from "/src/assets/accession-icons/repair.png";

interface MaterialType {
  id: number;
  name: string;
}

interface BookCopy {
  id: number;
  accession_number: string;
  copy_number: string;
  material_type_id: number;
  material_type?: MaterialType;
  barcode: string;
  source: string;
  price: number;
  condition: string;
  source_person: string;
  cataloging_note: string;
  internal_note: string;
  status: string;
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
  id: number;
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
  condition?: string;
  source_person?: string;
  cataloging_note?: string;
  internal_note?: string;
  status: string;
}

const Accession = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [conditionFilter, setConditionFilter] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<
    "accession" | "title" | "date" | null
  >("accession");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const copiesPerPage = 10;

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [selectedCopy, setSelectedCopy] = useState<FlattenedCopy | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const [selectedAccessions, setSelectedAccessions] = useState<string[]>([]);

  // Dropdown states
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [activeFilterSection, setActiveFilterSection] = useState<
    "section" | "condition" | "source" | "date" | null
  >(null);

  // Date Filter
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterWeek, setFilterWeek] = useState<number | null>(null);
  const [showDateOptions, setShowDateOptions] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");
  const [expandedBooks, setExpandedBooks] = useState<number | null>(null);

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
  const flattenedCopies: FlattenedCopy[] = books
    .flatMap((book) =>
      book.copies.map((copy) => ({
        id: copy.id,
        bookId: book.id,
        accession_number: copy.accession_number,
        copy_number: copy.copy_number,
        title: book.title,
        section: book.section,
        source: copy.source,
        price: copy.price,
        created_at: book.created_at,
        cover_image: book.cover_image
          ? `${BASE_URL}/storage/${book.cover_image}`
          : null,
        material_type: copy.material_type?.name || "N/A",
        barcode: copy.barcode,
        condition: copy.condition,
        source_person: copy.source_person,
        cataloging_note: copy.cataloging_note,
        internal_note: copy.internal_note,
        status: copy.status || "Available",
      })),
    )
    .sort((a, b) =>
      b.accession_number.localeCompare(a.accession_number, undefined, {
        numeric: true,
      }),
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
    const matchesCondition = conditionFilter
      ? copy.condition?.toLowerCase() === conditionFilter.toLowerCase()
      : true;

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

    return (
      matchesSearch &&
      matchesSection &&
      matchesCondition &&
      matchesSource &&
      matchesDate
    );
  });

  // Sorting
  const sortedCopies = [...filteredCopies].sort((a, b) => {
    if (!sortField) return 0;

    const order = sortOrder === "asc" ? 1 : -1;

    if (sortField === "title") {
      return order * a.title.localeCompare(b.title);
    }
    if (sortField === "date") {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return order * (dateA - dateB);
    }
    if (sortField === "accession") {
      return (
        order *
        a.accession_number.localeCompare(b.accession_number, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    }
    return 0;
  });

  // Pagination
  const indexOfLastCopy = currentPage * copiesPerPage;
  const indexOfFirstCopy = indexOfLastCopy - copiesPerPage;
  const currentCopies = sortedCopies.slice(indexOfFirstCopy, indexOfLastCopy);
  const itemsPerPage = 10;

  const handleWithdraw = async () => {
    const idsToWithdraw = flattenedCopies
      .filter((copy) => selectedAccessions.includes(copy.accession_number))
      .map((copy) => copy.id);

    try {
      setLoading(true);
      setShowWithdrawModal(false); // Close modal
      await AxiosInstance.post("/circulations/book-copies/withdraw-bulk", {
        ids: idsToWithdraw,
      });

      setBooks((prev) =>
        prev.map((book) => ({
          ...book,
          copies: book.copies.filter((c) => !idsToWithdraw.includes(c.id)),
        })),
      );

      setSelectedAccessions([]);
      alert("Successfully withdrawn.");
    } catch (error) {
      console.error(error);
      alert("Withdrawal failed.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle single selection
  const toggleSelect = (accession: string) => {
    setSelectedAccessions((prev) =>
      prev.includes(accession)
        ? prev.filter((a) => a !== accession)
        : [...prev, accession],
    );
  };

  // Close menus on outside click
  useEffect(() => {
    document.title = "Accession";
    const handleClickOutside = (event: MouseEvent) => {
      // Close sort menu if clicked outside
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterMenuOpen(false);
      }

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

  const groupedBooks = books
    .map((book) => {
      // Filter the book's copies based on the same logic used for filteredCopies
      const relevantCopies = filteredCopies.filter((c) => c.bookId === book.id);
      return {
        ...book,
        relevantCopies,
      };
    })
    .filter((b) => b.relevantCopies.length > 0);

  const toggleBookExpansion = (bookId: number) => {
    setExpandedBooks((prev) => (prev === bookId ? null : bookId));
  };

  const dataToPaginate = viewMode === "table" ? sortedCopies : groupedBooks;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dataToPaginate.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(dataToPaginate.length / itemsPerPage);

  return (
    <>
      {/* Tally Summary Cards */}
      <div className="d-flex justify-content-between gap-3 mb-4">
        {[
          {
            label: "ACCESSIONED COPIES",
            value: filteredCopies.length,
            icon: total,
          },
          {
            label: "CURRENT HOLDINGS",
            value: filteredCopies.filter(
              (c) => !["lost", "missing"].includes(c.status?.toLowerCase()),
            ).length,
            icon: available,
          },
          {
            label: "AVAILABLE FOR USE",
            value: filteredCopies.filter(
              (c) =>
                c.status?.toLowerCase() === "available" &&
                !["damaged", "poor"].includes(
                  c.condition?.toLowerCase() || "",
                ) &&
                !["lost", "missing", "issued"].includes(
                  c.status?.toLowerCase(),
                ),
            ).length,
            icon: available,
          },
          {
            label: "REPAIR/REVIEW",
            value: filteredCopies.filter((c) =>
              ["damaged", "poor"].includes(c.condition?.toLowerCase() || ""),
            ).length,
            icon: repair,
          },
        ].map((item, i) => (
          <div key={i} className="accession-tally-card">
            <div className="accession-tally-header">{item.label}</div>
            <div className="accession-tally-body">
              <img
                src={item.icon}
                alt={item.label}
                className="accession-tally-icon-img"
              />
              <span className="accession-tally-value">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

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

          <div className="d-flex align-items-center gap-3 custom-actions-bar">
            {/* WITHDRAW BUTTON - Styled like a floating alert */}
            {selectedAccessions.length > 0 && (
              <button
                className="btn btn-withdraw-action animate-slide-in"
                onClick={() => setShowWithdrawModal(true)}
              >
                <i className="bi bi-trash3-fill me-2"></i>
                Withdraw
                <span className="badge-count">{selectedAccessions.length}</span>
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="d-flex gap-2 align-items-center w-100">
          {/* Search */}
          <div className="position-relative flex-grow-1">
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
                      activeFilterSection === "section" ? null : "section",
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
                  [
                    "Filipiniana",
                    "General Reference",
                    "General Collection",
                  ].map((section) => (
                    <div
                      key={section}
                      className={`filter-item ${
                        sectionFilter === section ? "active" : ""
                      }`}
                      onClick={() =>
                        setSectionFilter(
                          sectionFilter === section ? null : section,
                        )
                      }
                    >
                      {section}
                    </div>
                  ))}

                {/* Condition Filter */}
                <div
                  className={`filter-section-header ${
                    activeFilterSection === "condition" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveFilterSection(
                      activeFilterSection === "condition" ? null : "condition",
                    )
                  }
                >
                  Condition{" "}
                  <i
                    className={`bi ${
                      activeFilterSection === "condition"
                        ? "bi-chevron-down"
                        : "bi-chevron-right"
                    } ms-2`}
                  ></i>
                </div>
                {activeFilterSection === "condition" &&
                  ["New", "Fine", "Damaged"].map((cond) => (
                    <div
                      key={cond}
                      className={`filter-item ${
                        conditionFilter === cond ? "active" : ""
                      }`}
                      onClick={() =>
                        setConditionFilter(
                          conditionFilter === cond ? null : cond,
                        )
                      }
                    >
                      {cond}
                    </div>
                  ))}

                {/* Source Filter */}
                <div
                  className={`filter-section-header ${
                    activeFilterSection === "source" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveFilterSection(
                      activeFilterSection === "source" ? null : "source",
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
                    ),
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

                {(sectionFilter ||
                  sourceFilter ||
                  conditionFilter ||
                  filterYear) && (
                  <div
                    className="filter-clear-all text-center border-top mt-2 text-danger"
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    onClick={() => {
                      setSectionFilter(null);
                      setSourceFilter(null);
                      setConditionFilter(null);
                      setFilterYear(null);
                      setFilterMonth(null);
                      setFilterWeek(null);
                    }}
                  >
                    Clear All Filters
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VIEW TOGGLE BUTTONS */}
          <div className="btn-group">
            <button
              className={`btn ${
                viewMode === "grouped"
                  ? "btn-secondary"
                  : "btn-outline-secondary"
              }`}
              onClick={() => setViewMode("grouped")}
            >
              <i className="bi bi-collection"></i>
            </button>
            <button
              type="button"
              className={`btn ${
                viewMode === "table" ? "btn-secondary" : "btn-outline-secondary"
              }`}
              onClick={() => setViewMode("table")}
            >
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="table-container mt-3">
              <table className="modern-table">
                <thead>
                  {viewMode === "table" ? (
                    <tr>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          onChange={(e) =>
                            setSelectedAccessions(
                              e.target.checked
                                ? currentItems.map(
                                    (c: any) => c.accession_number,
                                  )
                                : [],
                            )
                          }
                          checked={
                            selectedAccessions.length === currentItems.length &&
                            currentItems.length > 0
                          }
                        />
                      </th>
                      <th>Accession No.</th>
                      <th>Title</th>
                      <th>Section</th>
                      <th>Copy No.</th>
                      <th>Date Acquired</th>
                      <th>Condition</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: "40px" }}></th>
                      <th style={{ width: "60px" }}>#</th>
                      <th>Title</th>
                      <th>Section</th>
                      <th>Inventory</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {currentItems.map((item: any, index: number) => (
                    <React.Fragment key={item.id || item.accession_number}>
                      <tr
                        className={`${
                          viewMode === "grouped" ? "group-header" : ""
                        } ${expandedBooks === item.id ? "is-expanded" : ""}`}
                        onClick={() =>
                          viewMode === "table"
                            ? setSelectedCopy(item)
                            : toggleBookExpansion(item.id)
                        }
                      >
                        {viewMode === "table" ? (
                          <>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedAccessions.includes(
                                  item.accession_number,
                                )}
                                onChange={() =>
                                  toggleSelect(item.accession_number)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="fw-medium">
                              {item.accession_number}
                            </td>
                            <td>{item.title}</td>
                            <td>
                              <span className="badge-section">
                                {item.section}
                              </span>
                            </td>
                            <td>{item.copy_number}</td>
                            <td>
                              {new Date(item.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                className={`status-dot dot-${item.condition?.toLowerCase()}`}
                              ></span>
                              {item.condition}
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <i
                                className={`bi bi-chevron-${
                                  expandedBooks === item.id ? "down" : "right"
                                }`}
                              ></i>
                            </td>
                            <td className="text-muted">
                              {indexOfFirstItem + index + 1}
                            </td>
                            <td className="fw-bold">{item.title}</td>
                            <td>
                              <span className="badge-section">
                                {item.section}
                              </span>
                            </td>
                            <td className="fw-medium">
                              {item.relevantCopies.length} Copies
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Nested Table for Grouped View */}
                      {viewMode === "grouped" && expandedBooks === item.id && (
                        <tr className="expansion-row">
                          <td colSpan={5} className="p-0">
                            <div className="expansion-wrapper">
                              <table className="inner-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: "40px" }}></th>
                                    <th>Accession No.</th>
                                    <th>Copy No.</th>
                                    <th>Condition</th>
                                    <th>Date Acquired</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.relevantCopies.map((copy: any) => (
                                    <tr
                                      key={copy.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCopy(copy);
                                      }}
                                    >
                                      <td>
                                        <input
                                          type="checkbox"
                                          checked={selectedAccessions.includes(
                                            copy.accession_number,
                                          )}
                                          onChange={() =>
                                            toggleSelect(copy.accession_number)
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </td>
                                      <td className="fw-medium">
                                        {copy.accession_number}
                                      </td>
                                      <td>{copy.copy_number}</td>
                                      <td>
                                        <span
                                          className={`status-dot dot-${copy.condition?.toLowerCase()}`}
                                        ></span>
                                        {copy.condition}
                                      </td>
                                      <td>
                                        {new Date(
                                          copy.created_at,
                                        ).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SHARED PAGINATION */}
            <div className="pagination-info text-center mb-2 mt-3">
              Showing {indexOfFirstItem + 1} -{" "}
              {Math.min(indexOfLastItem, dataToPaginate.length)} of{" "}
              {dataToPaginate.length}{" "}
              {viewMode === "table" ? "copies" : "titles"}
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
      </div>

      {showWithdrawModal && (
        <div className="modal-overlay">
          <div className="modal-box text-center" style={{ maxWidth: "400px" }}>
            <div className="mb-3">
              <i
                className="bi bi-trash3 text-danger"
                style={{ fontSize: "3rem" }}
              ></i>
            </div>
            <h3>Confirm Withdrawal</h3>
            <p className="text-muted">
              Are you sure you want to withdraw{" "}
              <b>{selectedAccessions.length}</b> selected copies? This action
              cannot be undone.
            </p>
            <div className="form-actions mt-4">
              <button
                className="cancel-btn"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn btn-danger"
                onClick={handleWithdraw}
              >
                Yes, Withdraw
              </button>
            </div>
          </div>
        </div>
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
              ["Condition", selectedCopy.condition],
              ["Status", selectedCopy.status],
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
    </>
  );
};

export default Accession;
