import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import guestHome0 from "../../../assets/carousel/000.jpg";
import guestHome1 from "../../../assets/carousel/100.jpg";
import guestHome2 from "../../../assets/carousel/200.jpg";
import guestHome3 from "../../../assets/carousel/300.jpg";
import guestHome4 from "../../../assets/carousel/400.jpg";
import guestHome5 from "../../../assets/carousel/500.jpg";
import guestHome6 from "../../../assets/carousel/600.jpg";
import guestHome7 from "../../../assets/carousel/700.jpg";
import guestHome8 from "../../../assets/carousel/800.jpg";
import guestHome9 from "../../../assets/carousel/900.jpg";
import placeholder from "../../../assets/cover_placeholder.jpg";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../LoadingSpinner";

interface Book {
  id: number;
  title: string;
  cover_image?: string | null;
  copyright?: string | null;
  author?: string | null;
  editor?: string | null;
  other_author_editor?: string | null;
  edition?: string;
  author_number: string;
  dewey_decimal: string;
  number_of_pages?: number;
  classification?: string;
  topical_subject?: string[] | string;
  section?: string;
  call_number?: string;
  publisher?: string;
  place_of_publication?: string;
  includes_index?: boolean;
  includes_appendix?: boolean;
  includes_glossary?: boolean;
  includes_bibliographical_references?: boolean;
  copies: BookCopy[];
}

interface BookCopy {
  id: number;
  material_type?: string;
  status?: string;
  condition?: string;
}

const categories = [
  { name: "GENERAL WORKS", image: guestHome0, dewey: "000" },
  { name: "PHILOSOPHY", image: guestHome1, dewey: "100" },
  { name: "RELIGION", image: guestHome2, dewey: "200" },
  { name: "SOCIAL SCIENCES", image: guestHome3, dewey: "300" },
  { name: "LANGUAGE", image: guestHome4, dewey: "400" },
  { name: "SCIENCE", image: guestHome5, dewey: "500" },
  { name: "TECHNOLOGY", image: guestHome6, dewey: "600" },
  { name: "ARTS", image: guestHome7, dewey: "700" },
  { name: "LITERATURE", image: guestHome8, dewey: "800" },
  { name: "HISTORY & GEOGRAPHY", image: guestHome9, dewey: "900" },
];

const GuestDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [latestBooks, setLatestBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [showGuide, setShowGuide] = useState(false);

  const navigate = useNavigate();

  const [activeIndex, setActiveIndex] = useState(2);

  const nextSlide = () =>
    setActiveIndex((prev) => (prev + 1) % categories.length);
  const prevSlide = () =>
    setActiveIndex(
      (prev) => (prev - 1 + categories.length) % categories.length
    );

  // Auto-slide effect
  useEffect(() => {
    document.title = "Guest Dashboard";
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, []);

  const getPositionData = (index: number) => {
    const diff = (index - activeIndex + categories.length) % categories.length;

    if (diff === 0)
      return { class: "active-card", x: "0px", scale: 1.25, z: 10, opacity: 1 };

    // Level 1: Immediately beside center
    if (diff === 1)
      return {
        class: "side-card-1",
        x: "260px",
        scale: 0.9,
        z: 5,
        opacity: 0.8,
      };
    if (diff === categories.length - 1)
      return {
        class: "side-card-1",
        x: "-260px",
        scale: 0.9,
        z: 5,
        opacity: 0.8,
      };

    // Level 2: Outer edges
    if (diff === 2)
      return {
        class: "side-card-2",
        x: "460px",
        scale: 0.7,
        z: 2,
        opacity: 0.5,
      };
    if (diff === categories.length - 2)
      return {
        class: "side-card-2",
        x: "-460px",
        scale: 0.7,
        z: 2,
        opacity: 0.5,
      };

    return { class: "hidden-card", x: "0px", scale: 0.5, z: 1, opacity: 0 };
  };

  const handleCategoryClick = (idx: number, categoryDewey: string) => {
    if (idx === activeIndex) {
      navigate(`/guest/guestdashboard/search?dewey=${categoryDewey}`);
    } else {
      setActiveIndex(idx);
    }
  };

  // Fetch latest 7 books from backend
  useEffect(() => {
    setLoading(true);

    AxiosInstance.get("/books/latest")
      .then((res) => setLatestBooks(res.data))
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleBookClick = async (partialBook: Book) => {
    setSelectedBook(partialBook);
    setIsLoadingDetails(true);

    try {
      const res = await AxiosInstance.get(`/books/${partialBook.id}`);
      const bookData = res.data;

      // Normalization
      let subjects: string[] = [];
      if (bookData.topical_subject) {
        if (Array.isArray(bookData.topical_subject)) {
          subjects = bookData.topical_subject;
        } else if (typeof bookData.topical_subject === "string") {
          try {
            const parsed = JSON.parse(bookData.topical_subject);
            subjects = Array.isArray(parsed)
              ? parsed
              : [bookData.topical_subject];
          } catch {
            subjects = [bookData.topical_subject];
          }
        }
      }
      setSelectedBook({ ...bookData, topical_subject: subjects });
    } catch (err) {
      console.error("Error fetching book details:", err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Fetch search suggestions
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      AxiosInstance.get(`/books/search?query=${searchTerm}`)
        .then((res) => {
          setSearchResults(res.data);
          setShowDropdown(true);
        })
        .catch((err) => console.error(err));
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const notesArray = [
    selectedBook?.includes_index && "index",
    selectedBook?.includes_appendix && "appendix",
    selectedBook?.includes_glossary && "glossary",
    selectedBook?.includes_bibliographical_references &&
      "bibliographical references",
  ].filter(Boolean);

  const ddcCategories: Record<string, string> = {
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

  return (
    <div className="guest-dashboard">
      {/* Search */}
      <div className="search-container">
        <div
          className="position-relative"
          style={{ maxWidth: "85%", margin: "0 auto" }}
        >
          <div
            className="position-absolute top-50 translate-middle-y"
            style={{ left: "15px", zIndex: 5, pointerEvents: "none" }}
          >
            <i
              className="bi bi-search"
              style={{ color: "#6c757d", fontSize: "1.2rem" }}
            ></i>
          </div>
          <input
            className="form-control ps-5 pe-5"
            style={{ padding: "12px" }}
            placeholder="Search here..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchTerm.trim() !== "") {
                setShowDropdown(false);
                setSearchResults([]);
                navigate(
                  `/guest/guestdashboard/search?query=${encodeURIComponent(
                    searchTerm
                  )}`
                );
              }
            }}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />

          {/* Dropdown for suggestions */}
          {showDropdown && searchResults.length > 0 && (
            <ul
              className="list-group position-absolute w-100"
              style={{
                top: "100%",
                left: 0,
                zIndex: 1000,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((book) => (
                <li
                  key={book.id}
                  className="list-group-item list-group-item-action"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchTerm(book.title);
                    setShowDropdown(false);
                    navigate(
                      `/guest/guestdashboard/search?query=${encodeURIComponent(
                        book.title
                      )}`
                    );
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {book.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Category Carousel */}
      <div className="carousel-3d-wrapper">
        <button className="nav-arrow left" onClick={prevSlide}>
          <i className="bi bi-chevron-double-left"></i>
        </button>

        <div className="carousel-3d-container">
          {categories.map((cat, idx) => {
            const pos = getPositionData(idx);
            return (
              <div
                key={idx}
                className={`category-card-3d ${pos.class}`}
                style={{
                  transform: `translateX(${pos.x}) scale(${pos.scale})`,
                  zIndex: pos.z,
                  opacity: pos.opacity,
                }}
                // Change this line:
                onClick={() => handleCategoryClick(idx, cat.dewey)}
              >
                <div className="category-image-wrapper">
                  <img src={cat.image} alt={cat.name} />
                </div>
                <div className="category-label">
                  <hr />
                  <span>{cat.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="nav-arrow right" onClick={nextSlide}>
          <i className="bi bi-chevron-double-right"></i>
        </button>
        <div className="carousel-dots">
          {categories.map((_, idx) => (
            <span
              key={idx}
              className={`dot ${activeIndex === idx ? "active" : ""}`}
              onClick={() => setActiveIndex(idx)}
            />
          ))}
        </div>
      </div>

      {/* Latest Books */}
      <div className="guestdashboard">
        <h1>Recommended</h1>
        {loading && <LoadingSpinner />}
        <div className="book-cards">
          {latestBooks.map((book) => (
            <div
              className="book-card"
              key={book.id}
              onClick={() => handleBookClick(book)}
            >
              <img
                src={
                  book.cover_image
                    ? `http://127.0.0.1:8000/storage/${book.cover_image}`
                    : placeholder
                }
                alt={book.title}
                className="book-image"
              />
              <p className="book-title">{book.title}</p>
              <small className="book-copyright">
                {book.copyright || "Unknown"}
              </small>
            </div>
          ))}
        </div>
      </div>

      {selectedBook && (
        <div className="modal-overlay" onClick={() => setSelectedBook(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-left">
              <img
                src={
                  selectedBook.cover_image
                    ? `http://127.0.0.1:8000/storage/${selectedBook.cover_image}`
                    : placeholder
                }
                alt={selectedBook.title}
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
                    {selectedBook.title} /{" "}
                    <span className="modal-author d-inline">
                      {selectedBook.author ||
                        selectedBook.editor ||
                        selectedBook.other_author_editor ||
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
                    <strong>Contributor:</strong>{" "}
                    {selectedBook.author ||
                      selectedBook.other_author_editor ||
                      "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Edition:</strong> {selectedBook.edition || "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Published:</strong>{" "}
                    {[
                      selectedBook.publisher,
                      selectedBook.place_of_publication,
                      selectedBook.copyright,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Pages:</strong>{" "}
                    {selectedBook.number_of_pages || "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Notes:</strong>{" "}
                    {notesArray.length
                      ? `Includes ${notesArray.join(", ")}`
                      : "-"}
                  </p>
                  <p className="mt-0 mb-0">
                    <strong>Subject/s:</strong>{" "}
                    {Array.isArray(selectedBook.topical_subject)
                      ? selectedBook.topical_subject.join(" | ")
                      : selectedBook.topical_subject || "-"}
                  </p>
                  <p className="call-number">
                    <strong>
                      CALL NUMBER: {selectedBook.call_number || "-"}
                    </strong>
                  </p>

                  <div className="availability-box mt-4">
                    <p className="mb-0">
                      <strong>Availability:</strong>{" "}
                      {selectedBook.copies?.filter((c) => {
                        return c.status !== "On Loan" && c.status !== "Lost";
                      }).length || 0}{" "}
                      out of {selectedBook.copies?.length || 0} copies in shelf
                    </p>
                    <p>
                      <strong>For Loan:</strong>{" "}
                      {(() => {
                        const allCopies = selectedBook.copies || [];
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
                <button
                  className="back-btn"
                  onClick={() => setSelectedBook(null)}
                >
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

                <div className="example-tag">{selectedBook?.call_number}</div>
                {/* DYNAMIC VISUAL TAG */}
                <div className="call-number-breakdown">
                  <div className="breakdown-item">
                    <span className="code-part">
                      {selectedBook?.section === "Gen. Reference"
                        ? "REF"
                        : selectedBook?.section === "Gen. Circulation"
                        ? "GC"
                        : selectedBook?.section === "Filipiniana"
                        ? "FIL"
                        : selectedBook?.section}
                    </span>
                    <span className="desc">
                      <strong>Section:</strong> Go to the{" "}
                      {selectedBook?.section} area.
                    </span>
                  </div>

                  <div className="breakdown-item">
                    <span className="code-part">
                      {selectedBook?.dewey_decimal || "000"}
                    </span>
                    <span className="desc">
                      <strong>Classification:</strong> Look for the shelves
                      labeled with{" "}
                      <strong>
                        {ddcCategories[
                          selectedBook?.dewey_decimal?.toString().charAt(0) +
                            "00"
                        ]?.toUpperCase() || "GENERAL WORKS"}
                      </strong>{" "}
                    </span>
                  </div>

                  <div className="breakdown-item">
                    <span className="code-part">
                      {selectedBook?.author_number || "A11"}
                    </span>
                    <span className="desc">
                      <strong>Author:</strong> Arranged alphabetically on that
                      shelf.
                    </span>
                  </div>

                  <div className="breakdown-item">
                    <span className="code-part">
                      {selectedBook?.copyright || "0000"}
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

export default GuestDashboard;
