import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AxiosInstance from "../../../AxiosInstance";
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
  classification?: string;
  cover_image?: string | null;
  topical_subject?: string[];
  section?: string;
  copies: BookCopy[];
}

interface BookCopy {
  material_type?: string;
  status?: string;
}

const deweyMap: { [key: string]: string } = {
  "000": "General Works",
  "100": "Philosophy & Psychology",
  "200": "Religion",
  "300": "Social Sciences",
  "400": "Language",
  "500": "Science",
  "600": "Technology",
  "700": "Arts & Recreation",
  "800": "Literature",
  "900": "History & Geography",
};

// This maps the first digit (e.g., "4") to the full Dewey category name
const getDeweyCategory = (dewey: string | number | undefined): string => {
  if (dewey === undefined || dewey === null) return "Unknown";
  
  const deweyStr = dewey.toString().trim();
  if (deweyStr.length === 0) return "Unknown";

  // Get the first digit. Even if it's "432.54", charAt(0) gives "4"
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

  // Get query from URL
  const params = new URLSearchParams(location.search);
  const query = params.get("query") || "";
  const deweyParam = params.get("dewey") || "";

  // Helper to normalize backend data to our interface
  const mapBookData = (data: any) => {
    const books = Array.isArray(data) ? data : data.data || [];
    return books.map((book: any) => ({
      id: book.id,
      title: book.title,
      contributor: book.author || book.other_author_editor || "N/A",
      edition: book.edition || "N/A",
      year: book.copyright || "N/A",
      classification: getDeweyCategory(book.dewey_decimal),
      cover_image: book.cover_image || null,
      topical_subject: Array.isArray(book.topical_subject)
        ? book.topical_subject
        : typeof book.topical_subject === "string"
        ? book.topical_subject.split(",").map((s: string) => s.trim())
        : [],
      section: book.section || "N/A",
      copies: book.copies || [],
    }));
  };

  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      try {
        // Sync search bar with URL
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
        const res = await AxiosInstance.get(
          `/books/search?query=${encodeURIComponent(searchTerm)}`
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
            {/* Use deweyParam if it exists, otherwise use "Search Results" */}
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

        <div className="d-flex gap-2 align-items-center">
          <div className="position-relative" style={{ maxWidth: "300px" }}>
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

            {showDropdown && (
              <ul
                className="list-group position-absolute w-100 shadow"
                style={{ zIndex: 1050, maxHeight: "250px", overflowY: "auto" }}
              >
                {suggestions.map((book) => (
                  <li
                    key={book.id}
                    className="list-group-item list-group-item-action"
                    style={{ cursor: "pointer" }}
                    onMouseDown={() => {
                      setSearchTerm(book.title);
                      handleSearchSubmit(book.title);
                    }}
                  >
                    {book.title}
                  </li>
                ))}
              </ul>
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
                            ? `http://127.0.0.1:8000/storage/${book.cover_image}`
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
                        {book.copies?.length
                          ? book.copies[0].material_type || "N/A"
                          : "N/A"}
                      </p>

                      <p className="mb-0">
                        <strong>Title:</strong> {book.title}
                      </p>
                      <p className="mb-0">
                        <strong>Author:</strong> {book.author || book.editor || book.other_author_editor || "Unknown Author"}
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
                          : "N/A"}
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
                            (copy) => copy.status === "Available"
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
                    {book.copies?.length
                      ? book.copies[0].material_type || "N/A"
                      : "N/A"}
                  </td>
                  <td>{book.title}</td>
                  <td>{book.author || book.editor || book.other_author_editor || "Unknown Author"}</td>
                  <td>{book.edition}</td>
                  <td>{book.year}</td>
                  <td>
                    {book.topical_subject?.length
                      ? book.topical_subject.join(", ")
                      : "N/A"}
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
                    ? `http://127.0.0.1:8000/storage/${bookModal.cover_image}`
                    : placeholder
                }
                alt={bookModal.title}
                className="modal-cover-img"
              />
            </div>
            <div className="modal-right">
              <div className="modal-header-row">
                <h2 className="modal-book-title">
                  {bookModal.title} /{" "}
                  <span className="modal-author d-inline">
                    {bookModal.author ||
                      bookModal.editor ||
                      bookModal.other_author_editor ||
                      "Unknown Author"}
                  </span>
                </h2>
                <span className="info-icon">ⓘ</span>
              </div>

              <hr className="modal-divider" />

              {/* Book details content goes here */}
              <div className="modal-details-list">
                <p className="mb-0">
                  <strong>Title:</strong> {bookModal.title}
                </p>
                <p className="mb-0">
                  <strong>Available Copies:</strong>{" "}
                  {
                    bookModal.copies.filter(
                      (copy) => copy.status === "Available"
                    ).length
                  }
                </p>
              </div>
              <div className="form-actions">
                <button type="button" className="submit-btn">
                  Request to borrow
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setBookModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
