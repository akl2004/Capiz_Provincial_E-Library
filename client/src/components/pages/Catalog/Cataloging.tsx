import { useEffect, useRef, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";

interface MaterialType {
  id: number;
  name: string;
}

interface Book {
  id: number;
  title: string;
  contributor: string;
  edition: string;
  year: string | number;
  classification: string;
  cover_image?: string;
  topical_subjects?: string[];
  section?: string;
  copies?: BookCopy[];
}

interface BookCopy {
  book_id: number;
  material_type: MaterialType | string;
}

const Cataloging = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [viewMode, setViewMode] = useState<"image" | "list">("image");

  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<
    "title" | "contributor" | "year" | null
  >(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<
    "section" | "classification" | "material" | null
  >(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [classificationFilter, setClassificationFilter] = useState<
    string | null
  >(null);
  const [materialFilter, setMaterialFilter] = useState<string | null>(null);

  // Refs for closing dropdowns on outside click
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 10;

  const deweyMap: { [key: string]: string } = {
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

  const getDeweyCategory = (dewey: string): string => {
    if (!dewey) return "N/A";
    const mainClass = dewey.substring(0, 1) + "00";
    return deweyMap[mainClass] || "Unknown";
  };

  useEffect(() => {
    document.title = "Cataloging";
    fetchBooks();
  }, []);

  useEffect(() => {
    let updatedBooks = [...books];

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      updatedBooks = updatedBooks.filter((book) => {
        const title = book.title?.toLowerCase() || "";
        const contributor = book.contributor?.toLowerCase() || "";
        const edition = book.edition?.toLowerCase() || "";
        const year = book.year?.toString() || "";
        const classification = book.classification?.toLowerCase() || "";
        const material_type =
          book.copies
            ?.map((c) => {
              const val =
                typeof c.material_type === "object"
                  ? c.material_type.name
                  : c.material_type;
              return val?.toLowerCase() || "";
            })
            .join(", ") || "";
        const subjects = book.topical_subjects?.join(", ").toLowerCase() || "";
        const section = book.section?.toLowerCase() || "";

        return (
          title.includes(lowerSearch) ||
          contributor.includes(lowerSearch) ||
          edition.includes(lowerSearch) ||
          year.includes(lowerSearch) ||
          classification.includes(lowerSearch) ||
          material_type.includes(lowerSearch) ||
          subjects.includes(lowerSearch) ||
          section.includes(lowerSearch)
        );
      });
    }

    // Filters
    if (sectionFilter) {
      updatedBooks = updatedBooks.filter(
        (book) => book.section === sectionFilter
      );
    }
    if (classificationFilter) {
      updatedBooks = updatedBooks.filter(
        (book) => book.classification === classificationFilter
      );
    }
    if (materialFilter) {
      updatedBooks = updatedBooks.filter((book) =>
        book.copies?.some((c) => c.material_type === materialFilter)
      );
    }

    // Sorting
    if (sortField) {
      updatedBooks.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        // Convert year to number for proper sorting
        if (sortField === "year") {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        } else {
          aVal = aVal?.toString().toLowerCase() || "";
          bVal = bVal?.toString().toLowerCase() || "";
        }

        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredBooks(updatedBooks);
    setCurrentPage(1);
  }, [
    searchTerm,
    books,
    sectionFilter,
    classificationFilter,
    materialFilter,
    sortField,
    sortOrder,
  ]);

  // Close menus on outside click
  useEffect(() => {
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBooks = async () => {
    try {
      setIsLoading(true);

      const response = await AxiosInstance.get("/books");
      const booksData = Array.isArray(response.data)
        ? response.data
        : response.data.data;

      const formattedBooks = booksData.map((book: any) => {
        let subjects: string[] = [];

        if (book.topical_subject) {
          if (Array.isArray(book.topical_subject)) {
            subjects = book.topical_subject;
          } else if (
            typeof book.topical_subject === "string" &&
            book.topical_subject.trim() !== ""
          ) {
            try {
              const parsed = JSON.parse(book.topical_subject);
              subjects = Array.isArray(parsed)
                ? parsed
                : [book.topical_subject];
            } catch {
              subjects = [book.topical_subject];
            }
          }
        }

        // Filter out empty strings or whitespace
        subjects = subjects.filter((s) => s && s.trim() !== "");

        return {
          id: book.id,
          title: book.title,
          contributor: (() => {
            const list = [];

            if (book.author?.trim()) {
              list.push(book.author.trim());
            }
            if (book.editor?.trim()) {
              list.push(book.editor.trim());
            }
            if (book.other_author_editor?.trim()) {
              list.push(book.other_author_editor.trim());
            }

            return list.length ? list.join(", ") : "N/A";
          })(),

          edition: book.edition || "N/A",
          year: book.copyright || "N/A",
          classification: getDeweyCategory(book.dewey_decimal),
          cover_image: book.cover_image || "",
          topical_subjects: subjects,
          section: book.section || "N/A",
          copies: book.copies || [],
        };
      });

      // Sort newest first by id
      const sortedBooks = formattedBooks.sort(
        (a: Book, b: Book) => b.id - a.id
      );

      setBooks(sortedBooks);
      setFilteredBooks(sortedBooks);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination logic
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  return (
    <div className="catalog-container">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="text-xl font-semibold mb-0">Catalog</h1>
          <p className="mb-0">
            <i>
              This table contains all materials with their bibliographical
              details.
            </i>
          </p>
        </div>
        <button
          className="catalog-btn"
          onClick={() => {
            const role = localStorage.getItem("role")?.toLowerCase();
            if (role === "admin") {
              navigate("/admin/cataloging/addbook");
            } else if (role === "staff") {
              navigate("/staff/cataloging/addbook");
            }
          }}
        >
          Add New
        </button>
      </div>
      <div className="d-flex gap-2 align-items-center">
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
              placeholder="Search book"
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
                    { field: "title", label: "Title" },
                    { field: "contributor", label: "Contributor" },
                    { field: "year", label: "Year" },
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
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
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
                      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                    }}
                  >
                    DESC
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Controls */}
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

                {/* Classification Filter */}
                <div
                  className={`filter-section-header ${
                    activeFilterSection === "classification" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveFilterSection(
                      activeFilterSection === "classification"
                        ? null
                        : "classification"
                    )
                  }
                >
                  Classification{" "}
                  <i
                    className={`bi ${
                      activeFilterSection === "classification"
                        ? "bi-chevron-down"
                        : "bi-chevron-right"
                    } ms-2`}
                  ></i>
                </div>
                {activeFilterSection === "classification" &&
                  [
                    "General Works",
                    "Philosophy",
                    "Religion",
                    "Social Sciences",
                    "Language",
                    "Science",
                    "Technology",
                    "Arts",
                    "Literature",
                    "History & Geography",
                  ].map((cls) => (
                    <div
                      key={cls}
                      className={`filter-item ${
                        classificationFilter === cls ? "active" : ""
                      }`}
                      onClick={() =>
                        setClassificationFilter(
                          classificationFilter === cls ? null : cls
                        )
                      }
                    >
                      {cls}
                    </div>
                  ))}

                {/* Material Type Filter */}
                <div
                  className={`filter-section-header ${
                    activeFilterSection === "material" ? "active" : ""
                  }`}
                  onClick={() =>
                    setActiveFilterSection(
                      activeFilterSection === "material" ? null : "material"
                    )
                  }
                >
                  Material Type{" "}
                  <i
                    className={`bi ${
                      activeFilterSection === "material"
                        ? "bi-chevron-down"
                        : "bi-chevron-right"
                    } ms-2`}
                  ></i>
                </div>
                {activeFilterSection === "material" &&
                  ["Book", "Journal", "Magazine", "E-Book"].map((mat) => (
                    <div
                      key={mat}
                      className={`filter-item ${
                        materialFilter === mat ? "active" : ""
                      }`}
                      onClick={() =>
                        setMaterialFilter(materialFilter === mat ? null : mat)
                      }
                    >
                      {mat}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="btn-group" role="group">
          <button
            type="button"
            className={`btn ${
              viewMode === "image" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => setViewMode("image")}
          >
            <i className="bi bi-list-task"></i>
          </button>
          <button
            type="button"
            className={`btn ${
              viewMode === "list" ? "btn-secondary" : "btn-outline-secondary"
            }`}
            onClick={() => setViewMode("list")}
          >
            <i className="bi bi-list"></i>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3">
        {isLoading ? (
          <div className="text-center py-10">
            <LoadingSpinner message="Loading books..." />
          </div>
        ) : viewMode === "image" ? (
          currentBooks.length === 0 ? (
            <p className="text-center">No books found.</p>
          ) : (
            currentBooks.map((book) => (
              <div
                key={book.id}
                className="card mb-3 p-3"
                onClick={() => {
                  const role = localStorage.getItem("role")?.toLowerCase();
                  if (!book.id) return;
                  const path =
                    role === "admin"
                      ? `/admin/cataloging/${book.id}`
                      : role === "staff"
                      ? `/staff/cataloging/${book.id}`
                      : null;
                  if (path) navigate(path);
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="row">
                  <div className="col-md-2">
                    <img
                      src={
                        book.cover_image
                          ? `http://localhost:8000/storage/${book.cover_image}`
                          : "/src/assets/cover_placeholder.jpg"
                      }
                      alt={book.title}
                      className="img-fluid"
                      style={{
                        maxHeight: "200px",
                        objectFit: "contain",
                        width: "80%",
                      }}
                    />
                  </div>
                  <div className="description col-md-9">
                    <p className="mb-0">
                      <strong>Material:</strong>{" "}
                      {book.copies && book.copies.length > 0
                        ? typeof book.copies[0].material_type === "object"
                          ? book.copies[0].material_type.name
                          : book.copies[0].material_type
                        : "-"}
                    </p>
                    <p className="mb-0">
                      <strong>Title:</strong> {book.title}
                    </p>
                    <p className="mb-0">
                      <strong>Contributor:</strong> {book.contributor}
                    </p>
                    <p className="mb-0">
                      <strong>Edition:</strong> {book.edition}
                    </p>
                    <p className="mb-0">
                      <strong>Year:</strong> {book.year}
                    </p>
                    <p className="mb-0">
                      <strong>Subjects:</strong>{" "}
                      {book.topical_subjects && book.topical_subjects.length > 0
                        ? book.topical_subjects.join(", ")
                        : "N/A"}
                    </p>
                    <p className="mb-0">
                      <strong>Classification:</strong> {book.classification}
                    </p>
                    <p className="mb-0">
                      <strong>Section:</strong> {book.section}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          <table className="custom-table w-100 mt-3">
            <thead>
              <tr>
                <th>Material</th>
                <th>Title</th>
                <th>Contributor</th>
                <th>Edition</th>
                <th>Year</th>
                <th>Subjects</th>
                <th>Classification</th>
                <th>Section</th>
              </tr>
            </thead>
            <tbody>
              {currentBooks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No books found.
                  </td>
                </tr>
              ) : (
                currentBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="book-row"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      if (!book.id) return;
                      const role = localStorage.getItem("role")?.toLowerCase();
                      const path =
                        role === "admin"
                          ? `/admin/cataloging/${book.id}`
                          : role === "staff"
                          ? `/staff/cataloging/${book.id}`
                          : null;
                      if (path) navigate(path);
                    }}
                  >
                    <td>
                      {book.copies && book.copies.length > 0
                        ? typeof book.copies[0].material_type === "object"
                          ? book.copies[0].material_type.name
                          : book.copies[0].material_type
                        : "-"}
                    </td>
                    <td>{book.title}</td>
                    <td>{book.contributor}</td>
                    <td>{book.edition}</td>
                    <td>{book.year}</td>
                    <td>
                      <td>
                        {book.topical_subjects &&
                        book.topical_subjects.length > 0
                          ? book.topical_subjects.join(", ")
                          : "-"}
                      </td>
                    </td>
                    <td>{book.classification}</td>
                    <td>{book.section}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination info */}
        {filteredBooks.length > 0 && (
          <div className="pagination-info text-center mb-2 mt-3">
            Showing {indexOfFirstBook + 1} -{" "}
            {Math.min(indexOfLastBook, filteredBooks.length)} of{" "}
            {filteredBooks.length} books
          </div>
        )}

        {/* Pagination controls */}
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
      </div>
    </div>
  );
};

export default Cataloging;
