import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import guestHome1 from "../../../assets/carousel/guest-home1.png";
import guestHome2 from "../../../assets/carousel/guest-home2.jpg";
import guestHome3 from "../../../assets/carousel/guest-home3.png";
import guestHome4 from "../../../assets/carousel/guest-home4.png";
import guestHome5 from "../../../assets/carousel/guest-home5.png";
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
  material_type?: string;
  status?: string;
}

const categories = [
  { name: "HISTORY & GEOGRAPHY", image: guestHome1, dewey: "900" },
  { name: "LITERATURE", image: guestHome2, dewey: "800" },
  { name: "RELIGION", image: guestHome3, dewey: "200" },
  { name: "SOCIAL SCIENCES", image: guestHome4, dewey: "300" },
  { name: "PHILOSOPHY", image: guestHome5, dewey: "100" },
  { name: "GENERAL WORKS", image: guestHome3, dewey: "000" },
  { name: "LANGUAGE", image: guestHome4, dewey: "400" },
  { name: "SCIENCE", image: guestHome3, dewey: "500" },
  { name: "TECHNOLOGY", image: guestHome1, dewey: "600" },
  { name: "ARTS & RECREATION", image: guestHome2, dewey: "700" },
];

const GuestDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [latestBooks, setLatestBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

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
                  onClick={() => {
                    setSearchTerm(book.title);
                    setShowDropdown(false);
                    navigate(
                      `/guest/guestdashboard/search?query=${encodeURIComponent(
                        book.title
                      )}`
                    );
                  }}
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
                <span className="info-icon">ⓘ</span>
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
                      {selectedBook.copies?.filter(
                        (c) => c.status === "Available"
                      ).length || 0}{" "}
                      out of {selectedBook.copies?.length || 0} copies
                    </p>
                    <p>
                      <strong>For Loan:</strong>{" "}
                      {selectedBook.copies?.filter(
                        (c) => c.status === "Available"
                      ).length || 0}{" "}
                      copies available
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
    </div>
  );
};

export default GuestDashboard;
