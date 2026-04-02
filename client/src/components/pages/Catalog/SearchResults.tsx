import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AxiosInstance, { BASE_URL } from "../../../AxiosInstance";
import LoadingSpinner from "../../../components/LoadingSpinner";
import placeholder from "../../../assets/cover_placeholder.jpg";

interface Book {
  id: number;
  title: string;
  author?: string;
  editor?: string;
  other_author_editor?: string;
  edition?: string;
  year?: string | number;
  author_number: string;
  dewey_decimal: string;
  number_of_pages?: number;
  call_number?: string;
  publisher?: string;
  place_of_publication?: string;
  classification?: string;
  cover_image?: string | null;
  topical_subject?: string[];
  section?: string;
  includes_index?: boolean;
  includes_appendix?: boolean;
  includes_glossary?: boolean;
  includes_bibliographical_references?: boolean;
  copies: BookCopy[];
}

interface MaterialType {
  id: number;
  name: string;
}

interface BookCopy {
  id: number;
  material_type: MaterialType | string;
  status?: string;
  condition?: string;
}

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

// This maps the first digit (e.g., "4") to the full Dewey category name
const getDeweyCategory = (dewey: string | number | undefined): string => {
  if (dewey === undefined || dewey === null) return "Unknown";

  const deweyStr = dewey.toString().trim();
  if (deweyStr.length === 0) return "Unknown";

  const firstDigit = deweyStr.charAt(0);
  const mainClass = firstDigit + "00";

  return deweyMap[mainClass] || "Unknown";
};

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [bookModal, setBookModal] = useState<Book | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [mainResults, setMainResults] = useState<Book[]>([]);
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"image" | "list">("image");
  const [isLoadingDetails] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Get query from URL
  const params = new URLSearchParams(location.search);
  const query = params.get("query") || "";
  const deweyParam = params.get("dewey") || "";

  // Helper to normalize backend data to our interface
  const mapBookData = (data: any) => {
    const books = Array.isArray(data) ? data : data.data || [];
    return books.map((book: any) => {
      const displayAuthor =
        book.author?.trim() ||
        book.editor?.trim() ||
        book.other_author_editor?.trim() ||
        "Unknown Author";
      return {
        id: book.id,
        title: book.title,
        author: displayAuthor,
        edition: book.edition || "-",
        year: book.copyright || "-",
        number_of_pages: book.number_of_pages,
        call_number: book.call_number,
        publisher: book.publisher,
        place_of_publication: book.place_of_publication,
        dewey_decimal: book.dewey_decimal,
        author_number: book.author_number,
        classification: getDeweyCategory(book.dewey_decimal),
        cover_image: book.cover_image || null,
        topical_subject: Array.isArray(book.topical_subject)
          ? book.topical_subject
          : typeof book.topical_subject === "string"
          ? book.topical_subject.split(",").map((s: string) => s.trim())
          : [],
        section: book.section,
        includes_index: book.includes_index,
        includes_appendix: book.includes_appendix,
        includes_glossary: book.includes_glossary,
        includes_bibliographical_references:
          book.includes_bibliographical_references,
        copies: book.copies || [],
      };
    });
  };

  const notesArray = [
    bookModal?.includes_index && "index",
    bookModal?.includes_appendix && "appendix",
    bookModal?.includes_glossary && "glossary",
    bookModal?.includes_bibliographical_references &&
      "bibliographical references",
  ].filter(Boolean);

  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      try {
        if (query) setSearchTerm(query);

        const endpoint = deweyParam
          ? `/books/search?dewey=${encodeURIComponent(deweyParam)}`
          : `/books/search?query=${encodeURIComponent(query)}`;

        const response = await AxiosInstance.get(endpoint);
        setMainResults(mapBookData(response.data));
      } catch (err) {
        console.error("Search Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [query, deweyParam]);

  useEffect(() => {
    if (searchTerm.trim() === "" || searchTerm === query) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const encodedTerm = encodeURIComponent(searchTerm);
        const res = await AxiosInstance.get(
          `/books/search?query=${encodedTerm}&author=${encodedTerm}`
        );

        const formatted = mapBookData(res.data);
        setSuggestions(formatted);
        setShowDropdown(formatted.length > 0);
      } catch (err) {
        console.error("Suggestion Error:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, query]);
  

  const handleSearchSubmit = (val: string) => {
    setShowDropdown(false);
    navigate(`/guest/guestdashboard/search?query=${encodeURIComponent(val)}`);
  };

  return (
    <div className="catalog-container">
      {/* Header: Search + View Toggle */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="text-xl font-semibold mb-0">
            <span
              className="me-2"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(-1)}
            >
              <i className="bi bi-arrow-left"></i>
            </span>
            {deweyParam ? getDeweyCategory(deweyParam) : "Search Results"}
          </h1>
          <p className="mb-0">
            <i>
              {deweyParam
                ? `Showing books for classification: ${deweyParam}`
                : query
                  ? `Search results for "${query}"`
                  : "Browsing all books"}
            </i>
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center flex-grow-1 justify-content-end">
          <div className="position-relative" style={{ width: "500px" }}>
            <span
              className="position-absolute top-50 translate-middle-y ps-2"
              style={{ left: "10px", color: "#6c757d" }}
            >
              <i className="bi bi-search"></i>
            </span>
            <input
              className="form-control ps-5 pe-3"
              placeholder="Search Book..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSearchSubmit(searchTerm)
              }
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />

            {showDropdown && suggestions.length > 0 && (
              <div
                className="list-group position-absolute w-100 shadow mt-1"
                style={{
                  top: "100%",
                  left: 0,
                  zIndex: 1050,
                  maxHeight: "250px",
                  overflowY: "auto",
                }}
              >
                {suggestions.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className="list-group-item list-group-item-action p-2 text-start border-bottom"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchTerm(book.title);
                      handleSearchSubmit(book.title);
                    }}
                  >
                    <div
                      className="fw-bold text-truncate"
                      style={{ fontSize: "0.9rem", color: "#212529" }}
                    >
                      {book.title}
                    </div>
                    <div
                      className="text-muted text-truncate mt-1"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Author: {book.author || "Unknown"} &bull; Year:{" "}
                      {book.year || "N/A"}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
      </div>

      {/* Content */}
      <div className="mt-3">
        {loading ? (
          <div className="text-center py-10">
            <LoadingSpinner message="Loading books..." />
          </div>
        ) : mainResults.length === 0 ? (
          <p className="text-center">No books found.</p>
        ) : viewMode === "image" ? (
          <div className="row">
            {mainResults.map((book) => (
              <div
                key={book.id}
                className="col-md-4 mb-4"
                onClick={() => setBookModal(book)}
              >
                <div className="card h-100 p-3 shadow-sm">
                  <div className="d-flex">
                    {/* LEFT: COVER IMAGE */}
                    <div style={{ width: "40%" }}>
                      <img
                        src={
                          book.cover_image
                            ? `${BASE_URL}/storage/${book.cover_image}`
                            : placeholder
                        }
                        alt={book.title}
                        className="img-fluid"
                        style={{
                          height: "200px",
                          objectFit: "contain",
                        }}
                      />
                    </div>

                    {/* RIGHT: TEXT */}
                    <div className="card-text ms-3">
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
                        <strong>Contributor:</strong>{" "}
                        {book.author ||
                          book.editor ||
                          book.other_author_editor ||
                          "Unknown Author"}
                      </p>
                      <p className="mb-0">
                        <strong>Edition:</strong> {book.edition}
                      </p>
                      <p className="mb-0">
                        <strong>Year:</strong> {book.year}
                      </p>

                      <p className="mb-0">
                        <strong>Subjects:</strong>{" "}
                        {book.topical_subject?.length
                          ? book.topical_subject.join(", ")
                          : "-"}
                      </p>

                      <p className="mb-0">
                        <strong>Section:</strong> {book.section}
                      </p>

                      <p className="mb-4">
                        <strong>Classification:</strong> {book.classification}
                      </p>
                      <p className="mb-0">
                        <strong>Available Copies:</strong>{" "}
                        {
                          book.copies.filter(
                            (copy) => copy.status === "Available",
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <th>Section</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {mainResults.map((book) => (
                <tr key={book.id}>
                  <td>
                    {book.copies && book.copies.length > 0
                      ? typeof book.copies[0].material_type === "object"
                        ? book.copies[0].material_type.name
                        : book.copies[0].material_type
                      : "-"}
                  </td>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td>{book.edition}</td>
                  <td>{book.year}</td>
                  <td>
                    {book.topical_subject?.length
                      ? book.topical_subject.join(", ")
                      : "-"}
                  </td>
                  <td>{book.section}</td>
                  <td>{book.classification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {bookModal && (
        <div className="modal-overlay" onClick={() => setBookModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-left">
              <img
                src={
                  bookModal.cover_image
                    ? `${BASE_URL}/storage/${bookModal.cover_image}`
                    : placeholder
                }
                alt={bookModal.title}
                className="modal-cover-img"
              />
            </div>

            <div className="modal-right">
              <div className="modal-header-row">
                {isLoadingDetails ? (
                  /* --- HEADER SKELETON --- */
                  <div className="skeleton-header" style={{ width: "100%" }}>
                    <div
                      className="skeleton-line"
                      style={{ width: "70%", height: "35px" }}
                    ></div>
                  </div>
                ) : (
                  /* --- REAL HEADER DATA --- */
                  <h2 className="modal-book-title">
                    {bookModal.title} /{" "}
                    <span className="modal-author d-inline">
                      {bookModal.author ||
                        bookModal.editor ||
                        bookModal.other_author_editor ||
                        "Unknown Author"}
                    </span>
                  </h2>
                )}
                <span
                  className="info-icon"
                  onClick={() => setShowGuide(true)}
                  style={{ cursor: "pointer" }}
                  title="How to find this book"
                >
                  ⓘ
                </span>
              </div>

              <hr className="modal-divider" />

              {isLoadingDetails ? (
                /* --- SKELETON UI --- */
                <div className="skeleton-container">
                  <div className="skeleton-line" style={{ width: "80%" }}></div>
                  <div className="skeleton-line" style={{ width: "60%" }}></div>
                  <div className="skeleton-line" style={{ width: "75%" }}></div>
                  <div className="skeleton-line" style={{ width: "50%" }}></div>
                  <div className="skeleton-line" style={{ width: "60%" }}></div>
                  <div className="skeleton-line" style={{ width: "70%" }}></div>

                  <div
                    className="skeleton-line"
                    style={{ width: "90%", marginTop: "20px" }}
                  ></div>
                  <div
                    className="skeleton-line"
                    style={{ width: "40%", marginTop: "20px" }}
                  ></div>
                  <div className="skeleton-line" style={{ width: "40%" }}></div>
                </div>
              ) : (
                /* --- REAL DATA --- */
                <div className="modal-details-list">
                  <p className="mb-0">
                    <strong>Contributor:</strong> {bookModal.author}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Edition:</strong> {bookModal.edition || "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Published:</strong>{" "}
                    {[
                      bookModal.publisher,
                      bookModal.place_of_publication,
                      bookModal.year,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Pages:</strong> {bookModal.number_of_pages || "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Notes:</strong>{" "}
                    {notesArray.length
                      ? `Includes ${notesArray.join(", ")}`
                      : "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Subject/s:</strong>{" "}
                    {Array.isArray(bookModal.topical_subject)
                      ? bookModal.topical_subject.join(" | ")
                      : bookModal.topical_subject || "-"}
                  </p>
                  <p className="call-number">
                    <strong>CALL NUMBER: {bookModal.call_number || "-"}</strong>
                  </p>

                  <div className="availability-box mt-4">
                    <p className="mb-0">
                      <strong>Availability:</strong>{" "}
                      {bookModal.copies?.filter((c) => {
                        return c.status !== "Issued" && c.status !== "Lost";
                      }).length || 0}{" "}
                      out of {bookModal.copies?.length || 0} copies in shelf
                    </p>
                    <p>
                      <strong>For Loan:</strong>{" "}
                      {(() => {
                        const allCopies = bookModal.copies || [];
                        const totalOwned = allCopies.length;
                        const healthyAvailableCopies = allCopies.filter((c) => {
                          return (
                            c.status === "Available" &&
                            c.condition !== "Damaged" &&
                            c.condition !== "Poor"
                          );
                        });
                        if (totalOwned <= 1) {
                          return (
                            <span className="text-danger fw-bold">
                              0 (Reference Only)
                            </span>
                          );
                        }
                        return `${healthyAvailableCopies.length} copies available to borrow`;
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button className="back-btn" onClick={() => setBookModal(null)}>
                  BACK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGuide && (
        <div
          className="modal-overlay guide-overlay"
          onClick={() => setShowGuide(false)}
        >
          <div className="guide-card" onClick={(e) => e.stopPropagation()}>
            <div className="guide-header">
              <h3>How to Find This Book</h3>
              <button
                className="close-guide-btn"
                onClick={() => setShowGuide(false)}
              >
                &times;
              </button>
            </div>

            <div className="guide-body">
              <section className="guide-section">
                <h5>
                  <i className="bi bi-person-badge"></i> Option A: Ask a
                  Librarian
                </h5>
                <p>
                  Show this screen to any library staff. They will help you find
                  the shelf!
                </p>
              </section>

              <hr className="guide-divider" />

              <section className="guide-section">
                <h5>
                  <i className="bi bi-search"></i> Option B: Find It Yourself
                </h5>
                <p className="mb-3">
                  Follow these steps using the <strong>Call Number</strong>:
                </p>

                <div className="example-tag">{bookModal?.call_number}</div>
                {/* DYNAMIC VISUAL TAG */}
                <div className="call-number-breakdown">
                  <div className="breakdown-item">
                    <span className="code-part">
                      {bookModal?.section === "Gen. Reference"
                        ? "REF"
                        : bookModal?.section === "Gen. Circulation"
                          ? "GC"
                          : bookModal?.section === "Filipiniana"
                            ? "FIL"
                            : bookModal?.section}
                    </span>
                    <span className="desc">
                      <strong>Section:</strong> Go to the {bookModal?.section}{" "}
                      area.
                    </span>
                  </div>

                  <div className="breakdown-item">
                    <span className="code-part">
                      {bookModal?.dewey_decimal || "000"}
                    </span>
                    <span className="desc">
                      <strong>Classification:</strong> Look for the shelves
                      labeled with{" "}
                      <strong>
                        {deweyMap[
                          bookModal?.dewey_decimal?.toString().charAt(0) + "00"
                        ]?.toUpperCase() || "GENERAL WORKS"}
                      </strong>{" "}
                    </span>
                  </div>

                  <div className="breakdown-item">
                    <span className="code-part">
                      {bookModal?.author_number || "A11"}
                    </span>
                    <span className="desc">
                      <strong>Author:</strong> Arranged alphabetically on that
                      shelf.
                    </span>
                  </div>

                  <div className="breakdown-item">
                    <span className="code-part">
                      {bookModal?.year || "0000"}
                    </span>
                    <span className="desc">
                      <strong>Year:</strong> Check this for the correct edition.
                    </span>
                  </div>
                </div>
              </section>

              <div className="guide-footer-note">
                ✨ If anything is confusing, just ask — we’re happy to help!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
