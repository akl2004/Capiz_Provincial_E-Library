import React, { useEffect, useRef, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Barcode from "react-barcode";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

declare global {
  interface Window {
    electronAPI: {
      printBarcodes: (htmlContent: string) => void;
    };
  }
}

interface MaterialType {
  id: number;
  name: string;
}

interface Copy {
  copy_number: number;
  barcode: string;
  cataloging_note: string;
  internal_note: string;
  source_person: string;
  source: string;
  condition: string;
  binding: string;
  price: string | number;
  material_type: string;
}

interface BookSession {
  id: string; // unique ID for React keys
  title: string;
  author: string;
  editor: string;
  isbn_paperback: string;
  isbn_hardcover: string;
  issn: string;
  deweyDecimal: string;
  authorNumber: string;
  edition: string;
  placeOfPublication: string;
  publisher: string;
  yearCopyright: string;
  seriesName: string;
  volume: string;
  numberOfPages: number | "";
  personSubject: string;
  geographicalSubject: string;
  topicalSubjects: string[];
  otherAuthorsEditors: string[];
  includesIndex: boolean;
  includesAppendix: boolean;
  includesGlossary: boolean;
  includesBibliographicalReferences: boolean;
  // Accession specific to this book
  copies: number;
  bookCopies: Copy[];
  coverImage: File | null;
  section: string;
  source: string;
  sourcePerson: string;
  cataloging_note: string;
  internal_note: string;
  materialType: string;
  price: string | number;
}

const BookForm: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [showModal, setShowModal] = useState(false);

  // Toggle state
  const [identifierMode, setIdentifierMode] = useState<"ISBN" | "ISSN">("ISBN");

  const [conditions, setConditions] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [bookCopies, setBookCopies] = useState<Copy[]>([]);

  // Barcode modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Topical subjects
  const [topicalSubjects, setTopicalSubjects] = useState<string[]>([
    "",
    "",
    "",
  ]);

  // 1. Tracks which tab is currently visible
  const [activeTab, setActiveTab] = useState(0);
  const [allBooks, setAllBooks] = useState<BookSession[]>([createEmptyBook()]);

  const [showTopBtn, setShowTopBtn] = useState(true);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function createEmptyBook(
    initSections?: string[],
    initMTypes?: MaterialType[],
    initSources?: string[]
  ): BookSession {
    const defaultSource = initSources?.[0] || sources[0] || "";
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: "",
      author: "",
      editor: "",
      isbn_paperback: "",
      isbn_hardcover: "",
      issn: "",
      deweyDecimal: "",
      authorNumber: "",
      edition: "",
      placeOfPublication: "",
      publisher: "",
      yearCopyright: "",
      seriesName: "",
      volume: "",
      numberOfPages: "" as number | "", // Cast to match interface
      personSubject: "",
      geographicalSubject: "",
      topicalSubjects: ["", "", ""],
      otherAuthorsEditors: [""],
      includesIndex: false,
      includesAppendix: false,
      includesGlossary: false,
      includesBibliographicalReferences: false,
      copies: 1,
      bookCopies: [
        {
          copy_number: 1,
          barcode: `BC${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          cataloging_note: "",
          internal_note: "",
          source_person: "",
          source: defaultSource,
          condition: "New",
          binding: "",
          price: "",
          material_type:
            initMTypes?.[0]?.id.toString() ||
            materialTypes[0]?.id.toString() ||
            "",
        },
      ],
      coverImage: null,
      section: initSections?.[0] || sections[0] || "",
      source: defaultSource,
      sourcePerson: "",
      cataloging_note: "",
      internal_note: "",
      materialType:
        initMTypes?.[0]?.id.toString() || materialTypes[0]?.id.toString() || "",
      price: "" as string | number,
    };
  }

  const updateActiveBook = (field: keyof BookSession, value: any) => {
    setAllBooks((prev) => {
      const updated = [...prev];
      updated[activeTab] = { ...updated[activeTab], [field]: value };
      return updated;
    });
  };

  const addNewTab = () => {
    // Check if the limit has been reached
    if (allBooks.length >= 10) {
      setModalType("error");
      setModalMessage("You can only add a maximum of 10 books per batch.");
      setShowModal(true);
      return;
    }

    // Pass the existing dropdown states to the new book
    const newBook = createEmptyBook(sections, materialTypes, sources);
    setAllBooks([...allBooks, newBook]);
    setActiveTab(allBooks.length);
  };

  const removeTab = (index: number) => {
    if (allBooks.length === 1) return; // Don't remove the last tab
    const updated = allBooks.filter((_, i) => i !== index);
    setAllBooks(updated);
    setActiveTab(Math.max(0, index - 1));
  };

  const handleOtherAuthorEditorChange = (index: number, value: string) => {
    setAllBooks((prev) => {
      const updatedBooks = [...prev];
      const updatedAuthors = [...updatedBooks[activeTab].otherAuthorsEditors];

      updatedAuthors[index] = value;

      updatedBooks[activeTab] = {
        ...updatedBooks[activeTab],
        otherAuthorsEditors: updatedAuthors,
      };

      return updatedBooks;
    });
  };

  const navigate = useNavigate();

  // Fetch dropdown options
  useEffect(() => {
    AxiosInstance.get("/dropdown-options").then((res) => {
      const fetchedSources = res.data.sources || [];
      const fetchedSections = res.data.sections || [];
      const fetchedMTypes = res.data.materialTypes || [];

      setSources(fetchedSources);
      setSections(fetchedSections);
      setConditions(res.data.conditions || []);
      setMaterialTypes(fetchedMTypes);

      // Pass all three arrays to create the initial book correctly
      setAllBooks([
        createEmptyBook(fetchedSections, fetchedMTypes, fetchedSources),
      ]);
    });
  }, []);

  const handleCopyCountChange = (newCount: number) => {
    const currentBook = allBooks[activeTab];
    const currentCopiesArray = [...(currentBook.bookCopies || [])];

    if (newCount > currentCopiesArray.length) {
      const copiesToAdd = newCount - currentCopiesArray.length;
      for (let i = 0; i < copiesToAdd; i++) {
        currentCopiesArray.push({
          copy_number: currentCopiesArray.length + 1,
          barcode: `BC${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          condition: conditions.length > 0 ? conditions[0] : "New",
          price: currentBook.price || "0.00",
          cataloging_note: "",
          internal_note: "",
          source_person: "",
          source: currentBook.source,
          material_type: currentBook.materialType,
          binding: currentBook.isbn_hardcover ? "Hardcover" : "Paperback",
        });
      }
    } else if (newCount < currentCopiesArray.length) {
      currentCopiesArray.length = newCount;
    }

    setAllBooks((prev) => {
      const updated = [...prev];
      updated[activeTab] = {
        ...updated[activeTab],
        copies: newCount,
        bookCopies: currentCopiesArray,
      };
      return updated;
    });
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();

    allBooks.forEach((book, bIdx) => {
      // Basic Text Fields
      formData.append(`books[${bIdx}][title]`, book.title);
      formData.append(`books[${bIdx}][author]`, book.author);
      formData.append(`books[${bIdx}][editor]`, book.editor);
      formData.append(`books[${bIdx}][isbn_paperback]`, book.isbn_paperback);
      formData.append(`books[${bIdx}][isbn_hardcover]`, book.isbn_hardcover);
      formData.append(`books[${bIdx}][issn]`, book.issn);
      formData.append(`books[${bIdx}][deweyDecimal]`, book.deweyDecimal);
      formData.append(`books[${bIdx}][author_number]`, book.authorNumber);
      formData.append(`books[${bIdx}][edition]`, book.edition);
      formData.append(
        `books[${bIdx}][place_of_publication]`,
        book.placeOfPublication
      );
      formData.append(`books[${bIdx}][publisher]`, book.publisher);
      formData.append(`books[${bIdx}][copyright]`, book.yearCopyright);
      formData.append(`books[${bIdx}][series_name]`, book.seriesName);
      formData.append(`books[${bIdx}][volume]`, book.volume);
      formData.append(
        `books[${bIdx}][number_of_pages]`,
        book.numberOfPages ? book.numberOfPages.toString() : "0"
      );

      // Booleans (Checkboxes) - Convert to 1/0 for Database
      formData.append(
        `books[${bIdx}][includes_index]`,
        book.includesIndex ? "1" : "0"
      );
      formData.append(
        `books[${bIdx}][includes_appendix]`,
        book.includesAppendix ? "1" : "0"
      );
      formData.append(
        `books[${bIdx}][includes_glossary]`,
        book.includesGlossary ? "1" : "0"
      );
      formData.append(
        `books[${bIdx}][includes_bibliographical_references]`,
        book.includesBibliographicalReferences ? "1" : "0"
      );

      formData.append(
        `books[${bIdx}][cataloging_note]`,
        book.cataloging_note || ""
      );
      formData.append(
        `books[${bIdx}][internal_note]`,
        book.internal_note || ""
      );

      // Arrays (Subjects and Contributors)
      book.topicalSubjects
        .filter((s) => s.trim())
        .forEach((subject, sIdx) => {
          formData.append(`books[${bIdx}][topical_subject][${sIdx}]`, subject);
        });

      formData.append(
        `books[${bIdx}][geographical_subject]`,
        book.geographicalSubject || ""
      );
      formData.append(
        `books[${bIdx}][person_as_subject]`,
        book.personSubject || ""
      );

      formData.append(
        `books[${bIdx}][other_author_editor]`,
        book.otherAuthorsEditors.filter((oae) => oae.trim() !== "").join(", "),
      );

      // Accession Record Fields
      formData.append(`books[${bIdx}][section]`, book.section);
      formData.append(`books[${bIdx}][materialType]`, book.materialType);
      
      formData.append(`books[${bIdx}][copies]`, book.copies.toString());

      formData.append(
        `books[${bIdx}][price]`,
        book.price ? book.price.toString() : "0.00",
      );

      // Image file
      if (book.coverImage) {
        formData.append(`books[${bIdx}][cover_image]`, book.coverImage);
      }

      // Copy Data (Nested Array)
      book.bookCopies.forEach((c, cIdx) => {
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][copy_number]`,
          c.copy_number.toString()
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][barcode]`,
          c.barcode
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][condition]`,
          c.condition || "New"
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][price]`,
          book.price ? book.price.toString() : "0.00",
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][source]`,
          c.source || ""
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][source_person]`,
          c.source_person || ""
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][cataloging_note]`,
          book.cataloging_note || ""
        );
        formData.append(
          `books[${bIdx}][bookCopies][${cIdx}][internal_note]`,
          c.internal_note || ""
        );
      });
    });

    try {
      const res = await AxiosInstance.post("/books", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setModalType("success");
      setModalMessage(
        `${allBooks.length} books saved successfully! Preparing barcodes...`
      );
      setShowModal(true);

      if (res.data.books && Array.isArray(res.data.books)) {
        const allGeneratedBarcodes = res.data.books.flatMap(
          (book: any) => book.copies
        );
        setBookCopies(allGeneratedBarcodes);
      }
      setTimeout(() => {
        setShowModal(false);
        setShowBarcodeModal(true);
      }, 2000);
    } catch (error: any) {
      setModalType("error");
      setModalMessage(
        error.response?.data?.message ||
          "Failed to save batch. Please check all tabs for errors."
      );
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="catalog-wrapper">
        {/* Folder-style Tabs */}
        <div className="tabs-outer-container" ref={tabsRef}>
          <div className="tabs-container">
            {allBooks.map((book, index) => (
              <div
                key={book.id}
                className={`folder-tab ${activeTab === index ? "active" : ""}`}
                onClick={() => setActiveTab(index)}
              >
                <span className="tab-text">
                  {book.title || `Book ${index + 1}`}
                </span>
                {allBooks.length > 1 && (
                  <button
                    className="remove-tab-x"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(index);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {allBooks.length < 10 && (
              <button
                type="button"
                onClick={addNewTab}
                className="add-book-tab"
              >
                + Add Book
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="book-form folder-content">
          {/* ===== Catalog Record ===== */}
          <fieldset>
            <legend className="record text-white">CATALOG RECORD</legend>
            {/* Identifiers */}
            <fieldset>
              <legend>Identifiers</legend>
              <div className="flex-row" style={{ gap: "40px" }}>
                {/* Left Column: existing input fields */}
                <div className="flex-col" style={{ flex: 1, gap: "10px" }}>
                  <div
                    className="flex-row"
                    style={{ alignItems: "flex-start", gap: "15px" }}
                  >
                    {/* Left Label & MARC Code */}
                    <div
                      className="flex-row"
                      style={{ width: "160px", flexShrink: 0 }}
                    >
                      <label style={{ fontWeight: "bold" }}>
                        {identifierMode}
                      </label>
                      <span
                        className="catalog_number"
                        style={{ marginLeft: "10px" }}
                      >
                        {identifierMode === "ISBN" ? "(020)" : "(022)"}
                      </span>
                    </div>

                    {/* Center: Input Fields */}
                    <div className="flex-row flex-grow" style={{ gap: "10px" }}>
                      {identifierMode === "ISBN" ? (
                        <>
                          <div className="flex-col flex-grow">
                            <input
                              type="text"
                              value={allBooks[activeTab]?.isbn_paperback || ""}
                              onChange={(e) =>
                                updateActiveBook(
                                  "isbn_paperback",
                                  e.target.value,
                                )
                              }
                            />
                            <span className="sub-label">
                              <i>Paperback</i>
                            </span>
                          </div>
                          <div className="flex-col flex-grow">
                            <input
                              type="text"
                              value={allBooks[activeTab]?.isbn_hardcover || ""}
                              onChange={(e) =>
                                updateActiveBook(
                                  "isbn_hardcover",
                                  e.target.value,
                                )
                              }
                            />
                            <span className="sub-label">
                              <i>Hardcover</i>
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex-col flex-grow">
                          <input
                            type="text"
                            placeholder="Enter ISSN"
                            value={allBooks[activeTab]?.issn || ""}
                            onChange={(e) =>
                              updateActiveBook("issn", e.target.value)
                            }
                          />
                          <span className="sub-label">
                            <i>International Standard Serial Number</i>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: The Professional Toggle Button */}
                    <div
                      className="flex-col"
                      style={{ justifyContent: "center", height: "38px" }}
                    >
                      <button
                        type="button"
                        className="switch-mode-btn compact"
                        onClick={() =>
                          setIdentifierMode(
                            identifierMode === "ISBN" ? "ISSN" : "ISBN",
                          )
                        }
                        title={`Switch to ${
                          identifierMode === "ISBN" ? "ISSN" : "ISBN"
                        }`}
                      >
                        ⇄ Switch to{" "}
                        {identifierMode === "ISBN" ? "ISSN" : "ISBN"}
                      </button>
                    </div>
                  </div>
                  <div className="flex-row">
                    <label>Dewey Decimal</label>
                    <span className="catalog_number">(082)</span>
                    <input
                      type="text"
                      value={allBooks[activeTab]?.deweyDecimal || ""}
                      onChange={(e) =>
                        updateActiveBook("deweyDecimal", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-row">
                    <label>Author Number</label>
                    <span className="catalog_number">(949)</span>
                    <input
                      type="text"
                      value={allBooks[activeTab]?.authorNumber || ""}
                      onChange={(e) =>
                        updateActiveBook("authorNumber", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Right Column: cover image input */}
                <div className="cover-image-container">
                  <label className="cover-image-label">Cover Image</label>
                  <div
                    className="cover-image-box"
                    onClick={() =>
                      document
                        .getElementById(`coverInput-${activeTab}`)
                        ?.click()
                    }
                  >
                    {allBooks[activeTab]?.coverImage ? (
                      <img
                        src={URL.createObjectURL(
                          allBooks[activeTab].coverImage as File,
                        )}
                        alt="Preview"
                      />
                    ) : (
                      <span className="cover-image-placeholder">Add Image</span>
                    )}
                    <button
                      type="button"
                      className="cover-image-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById("coverInput")?.click();
                      }}
                    >
                      Choose File
                    </button>
                    <input
                      type="file"
                      id="coverInput"
                      className="cover-image-input"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          updateActiveBook("coverImage", e.target.files[0]);
                      }}
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <hr />

            {/* ===== Description ===== */}
            <fieldset>
              <legend>Description</legend>

              {/* Top Rows: Title, Edition */}
              <div className="flex-col" style={{ gap: "10px" }}>
                <div className="flex-row">
                  <label>Title</label>
                  <span className="catalog_number">(245)</span>
                  <input
                    type="text"
                    value={allBooks[activeTab]?.title || ""}
                    onChange={(e) => updateActiveBook("title", e.target.value)}
                  />
                </div>

                {/* Publication Row */}
                <div className="flex-row">
                  <label>Publication</label>
                  <span className="catalog_number">(264)</span>
                  <div className="flex-col flex-grow">
                    <input
                      type="text"
                      value={allBooks[activeTab]?.placeOfPublication || ""}
                      onChange={(e) =>
                        updateActiveBook("placeOfPublication", e.target.value)
                      }
                    />
                    <span className="sub-label">
                      <i>Place</i>
                    </span>
                  </div>
                  <div className="flex-col flex-grow">
                    <input
                      type="text"
                      value={allBooks[activeTab]?.publisher || ""}
                      onChange={(e) =>
                        updateActiveBook("publisher", e.target.value)
                      }
                    />
                    <span className="sub-label">
                      <i>Publisher</i>
                    </span>
                  </div>
                  <div className="flex-col" style={{ width: "100px" }}>
                    <input
                      type="text"
                      className="small"
                      value={allBooks[activeTab]?.yearCopyright || ""}
                      onChange={(e) =>
                        updateActiveBook("yearCopyright", e.target.value)
                      }
                    />
                    <span className="sub-label">
                      <i>Year</i>
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Two-Column Layout: Left = Series, Pages; Right = Checklist */}
              <div className="flex-row" style={{ gap: "40px" }}>
                {/* Left Column */}
                <div className="flex-col flex-grow" style={{ gap: "10px" }}>
                  <div className="flex-row">
                    <label>Edition</label>
                    <span className="catalog_number">(250)</span>
                    <input
                      type="text"
                      className="small"
                      value={allBooks[activeTab]?.edition || ""}
                      onChange={(e) =>
                        updateActiveBook("edition", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-row">
                    <label>Series</label> {/* single main label for the row */}
                    <span className="catalog_number">(400)</span>
                    <div className="flex-col flex-grow">
                      <input
                        type="text"
                        value={allBooks[activeTab]?.seriesName || ""}
                        onChange={(e) =>
                          updateActiveBook("seriesName", e.target.value)
                        }
                      />
                      <span className="sub-label">
                        <i>Series Name</i>
                      </span>
                    </div>
                    <div className="flex-col" style={{ width: "100px" }}>
                      <input
                        type="text"
                        className="small"
                        value={allBooks[activeTab]?.volume || ""}
                        onChange={(e) =>
                          updateActiveBook("volume", e.target.value)
                        }
                      />
                      <span className="sub-label">
                        <i>Volume</i>
                      </span>
                    </div>
                  </div>

                  <div className="flex-row">
                    <label>Number of Pages</label>
                    <span className="catalog_number">(300)</span>
                    <input
                      type="text"
                      className="small"
                      value={allBooks[activeTab]?.numberOfPages || ""}
                      onChange={(e) =>
                        updateActiveBook("numberOfPages", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Right Column: Checklist aligned to top of Series */}
                <div className="right-column">
                  <label>General Notes</label>
                  <div className="checklist">
                    <p>
                      <input
                        type="checkbox"
                        className="book-checkbox"
                        checked={allBooks[activeTab]?.includesIndex || false}
                        onChange={() =>
                          updateActiveBook(
                            "includesIndex",
                            !allBooks[activeTab].includesIndex,
                          )
                        }
                      />{" "}
                      Includes Index
                    </p>
                    <p>
                      <input
                        type="checkbox"
                        className="book-checkbox"
                        checked={allBooks[activeTab]?.includesAppendix || false}
                        onChange={() =>
                          updateActiveBook(
                            "includesAppendix",
                            !allBooks[activeTab].includesAppendix,
                          )
                        }
                      />{" "}
                      Includes Appendix
                    </p>
                    <p>
                      <input
                        type="checkbox"
                        className="book-checkbox"
                        checked={allBooks[activeTab]?.includesGlossary || false}
                        onChange={() =>
                          updateActiveBook(
                            "includesGlossary",
                            !allBooks[activeTab].includesGlossary,
                          )
                        }
                      />{" "}
                      Includes Glossary
                    </p>
                    <p>
                      <input
                        type="checkbox"
                        className="book-checkbox"
                        checked={
                          allBooks[activeTab]
                            ?.includesBibliographicalReferences || false
                        }
                        onChange={() =>
                          updateActiveBook(
                            "includesBibliographicalReferences",
                            !allBooks[activeTab]
                              .includesBibliographicalReferences,
                          )
                        }
                      />{" "}
                      Includes Bibliographical References
                    </p>
                  </div>
                </div>
              </div>
            </fieldset>

            <hr />

            {/* Subjects */}
            <fieldset>
              <legend>Subjects</legend>
              <div className="flex-col">
                <div className="flex-row">
                  <label>Person as Subject</label>
                  <span className="catalog_number">(600)</span>
                  <input
                    type="text"
                    value={allBooks[activeTab]?.personSubject || ""}
                    onChange={(e) =>
                      updateActiveBook("personSubject", e.target.value)
                    }
                  />
                </div>

                {topicalSubjects.map((subject, index) => (
                  <div className="flex-row" key={index}>
                    {index === 0 ? (
                      <label>Topical Subject</label>
                    ) : (
                      <div style={{ width: "120px" }} />
                    )}

                    <span className="catalog_number">(650)</span>
                    <input
                      type="text"
                      value={allBooks[activeTab].topicalSubjects[index] || ""} // Source directly from state
                      onChange={(e) => {
                        const newValue = e.target.value;

                        // Create a shallow copy of the subjects array for the current book
                        const currentSubjects = [
                          ...allBooks[activeTab].topicalSubjects,
                        ];

                        // Update the specific index
                        currentSubjects[index] = newValue;

                        // Send the whole array back to your state handler
                        updateActiveBook("topicalSubjects", currentSubjects);
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  className="add-more"
                  onClick={() => setTopicalSubjects([...topicalSubjects, ""])}
                >
                  Add More
                </button>

                <div className="flex-row">
                  <label>Geographical Subject</label>
                  <span className="catalog_number">(651)</span>
                  <input
                    type="text"
                    value={allBooks[activeTab]?.geographicalSubject || ""}
                    onChange={(e) =>
                      updateActiveBook("geographicalSubject", e.target.value)
                    }
                  />
                </div>
              </div>
            </fieldset>

            <hr />

            {/* Contributors */}
            <fieldset>
              <legend>Contributors</legend>
              <div className="flex-col">
                <div className="flex-row">
                  <label>Author</label>
                  <span className="catalog_number">(100)</span>
                  <input
                    type="text"
                    value={allBooks[activeTab]?.author || ""}
                    onChange={(e) => updateActiveBook("author", e.target.value)}
                  />
                </div>

                <div className="flex-row">
                  <label>Editor</label>
                  <span className="catalog_number">(700)</span>
                  <input
                    type="text"
                    value={allBooks[activeTab]?.editor || ""}
                    onChange={(e) => updateActiveBook("editor", e.target.value)}
                  />
                </div>

                {allBooks[activeTab].otherAuthorsEditors.map(
                  (person, index) => (
                    <div className="flex-row" key={index}>
                      {index === 0 ? (
                        <label>Other Author/Editor</label>
                      ) : (
                        <div style={{ width: "120px" }} />
                      )}
                      <span className="catalog_number">(700)</span>
                      <input
                        type="text"
                        value={person}
                        onChange={(e) =>
                          handleOtherAuthorEditorChange(index, e.target.value)
                        }
                      />
                    </div>
                  ),
                )}

                <button
                  type="button"
                  className="add-more"
                  onClick={() =>
                    handleOtherAuthorEditorChange(
                      allBooks[activeTab].otherAuthorsEditors.length,
                      "",
                    )
                  }
                >
                  + Add More
                </button>
              </div>
            </fieldset>
          </fieldset>

          {/* ===== Accession Record ===== */}
          <fieldset>
            <legend className="record text-white mb-4">ACCESSION RECORD</legend>

            {/* Row 1: Shared Book Info */}
            <div className="flex-container">
              <div className="flex-row flex-grow">
                <label>Section</label>
                <span className="catalog_number">(245)</span>
                <select
                  value={allBooks[activeTab]?.section || ""}
                  onChange={(e) => updateActiveBook("section", e.target.value)}
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-row flex-grow">
                <label>Material Type</label>
                <span className="catalog_number">(245)</span>
                <select
                  value={allBooks[activeTab]?.materialType || ""}
                  onChange={(e) =>
                    updateActiveBook("materialType", e.target.value)
                  }
                >
                  {materialTypes.map((m) => (
                    <option
                      key={typeof m === "object" ? m.id : m}
                      value={typeof m === "object" ? m.id : m}
                    >
                      {typeof m === "object" ? m.name : m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-row flex-grow">
                <label>Price</label>
                <span className="catalog_number">(020)</span>
                <input
                  type="text"
                  placeholder="₱0.00"
                  value={allBooks[activeTab]?.price || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      updateActiveBook("price", val);
                    }
                  }}
                  onBlur={() => {
                    const currentPrice = allBooks[activeTab]?.price || "";

                    const parsed = parseFloat(currentPrice.toString());

                    if (!isNaN(parsed)) {
                      updateActiveBook("price", parsed.toFixed(2));
                    } else {
                      updateActiveBook("price", "");
                    }
                  }}
                />
              </div>
            </div>

            <hr />

            {/* INDIVIDUAL COPY CARDS */}
            {allBooks[activeTab]?.bookCopies?.map((c, index) => (
              <div key={c.copy_number} className="copy-card">
                <div className="flex-row">
                  <div className="flex-row flex-grow">
                    <label>Copy #{c.copy_number}</label>
                    <input
                      type="text"
                      value={c.barcode}
                      readOnly
                      className="text-muted"
                    />
                  </div>

                  <div className="flex-row flex-grow">
                    <label>Condition</label>
                    <select
                      value={c.condition}
                      onChange={(e) => {
                        const updatedCopies = [
                          ...allBooks[activeTab].bookCopies,
                        ];
                        updatedCopies[index].condition = e.target.value;
                        updateActiveBook("bookCopies", updatedCopies);
                      }}
                    >
                      {conditions.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-row">
                  <div className="flex-row flex-grow">
                    <label>Source</label>
                    <select
                      value={c.source || ""}
                      onChange={(e) => {
                        const updatedCopies = [
                          ...allBooks[activeTab].bookCopies,
                        ];
                        updatedCopies[index].source = e.target.value;
                        updateActiveBook("bookCopies", updatedCopies);
                      }}
                    >
                      {sources.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-row flex-grow">
                    <label>Funding Source</label>
                    <input
                      type="text"
                      value={c.source_person || ""}
                      onChange={(e) => {
                        const updatedCopies = [
                          ...allBooks[activeTab].bookCopies,
                        ];
                        updatedCopies[index].source_person = e.target.value;
                        updateActiveBook("bookCopies", updatedCopies);
                      }}
                    />
                  </div>
                </div>

                {/* Internal Note moved here for specific damage/copy notes */}
                <div className="flex-row flex-grow">
                  <label>Internal Note</label>
                  <textarea
                    value={c.internal_note || ""}
                    onChange={(e) => {
                      const updatedCopies = [...allBooks[activeTab].bookCopies];
                      updatedCopies[index].internal_note = e.target.value;
                      updateActiveBook("bookCopies", updatedCopies);
                    }}
                    placeholder="e.g. Torn cover, missing page 5..."
                  />
                </div>
              </div>
            ))}

            {/* Stepper for Copies */}
            <div className="stepper-wrapper">
              <div className="stepper-label">Number of Copies</div>
              <div className="stepper-container">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() =>
                    handleCopyCountChange(
                      Math.max(1, (allBooks[activeTab]?.copies || 1) - 1),
                    )
                  }
                >
                  −
                </button>
                <input
                  type="number"
                  className="stepper-input"
                  value={allBooks[activeTab]?.copies || 1}
                  readOnly
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() =>
                    handleCopyCountChange(
                      (allBooks[activeTab]?.copies || 1) + 1,
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>

            <hr />

            {/* Row 5: Global Cataloging Note */}
            <div className="flex-row flex-grow">
              <label>Cataloging Note</label>
              <span className="catalog_number">(910)</span>
              <textarea
                value={allBooks[activeTab]?.cataloging_note || ""}
                onChange={(e) =>
                  updateActiveBook("cataloging_note", e.target.value)
                }
                placeholder="General notes about the book edition..."
              />
            </div>
          </fieldset>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                const role = localStorage.getItem("role")?.toLowerCase();
                navigate(`/${role}/cataloging`);
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-tiny"></span> Saving...
                </>
              ) : allBooks.length > 1 ? (
                `Save All (${allBooks.length}) Books`
              ) : (
                "Save Book"
              )}
            </button>
          </div>
        </form>

        {showModal && (
          <MessageModal
            type={modalType}
            message={modalMessage}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* ===== Barcode Modal ===== */}
        {showBarcodeModal && (
          <div className="modal-overlay">
            <div className="custom-print-preview-modal">
              {/* LEFT SIDE: Controls Sidebar (Hidden during actual print) */}
              <div className="preview-sidebar no-print">
                <h2 className="text-xl font-semibold mb-4 text-white">
                  Print Barcodes
                </h2>
                <p className="text-white mb-6 text-sm">
                  Review the layout before printing.
                </p>

                <div className="form-actions flex flex-col gap-3">
                  <button
                    onClick={() => window.print()}
                    className="submit-btn w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Print All
                  </button>

                  <button
                    onClick={() => {
                      setShowBarcodeModal(false);
                      const role = localStorage.getItem("role")?.toLowerCase();
                      if (role === "admin") navigate("/admin/cataloging");
                      else if (role === "staff") navigate("/staff/cataloging");
                    }}
                    className="cancel-btn w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* RIGHT SIDE: The "Paper" Preview Area */}
              <div className="preview-paper-wrapper">
                <div className="a4-paper-sheet">
                  <div
                    id="printable-barcodes"
                    className="barcode-grid-container"
                  >
                    {allBooks.flatMap((book) =>
                      book.bookCopies.map((c) => (
                        <div
                          key={`${book.id}-${c.copy_number}`}
                          className="barcode-item"
                        >
                          <div className="barcode-text">
                            {book.title.substring(0, 25) || "Untitled"}
                            {book.title.length > 25 ? "..." : ""} <br />
                            Copy: {c.copy_number}
                          </div>
                          <Barcode
                            value={c.barcode}
                            width={1.5}
                            height={40}
                            fontSize={14}
                            textMargin={8}
                            font="sans-serif"
                            margin={10}
                            marginTop={15}
                            marginBottom={5}
                          />
                        </div>
                      )),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showTopBtn && (
        <button
          className="back-to-top"
          onClick={() => {
            tabsRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          ↑ Add More
        </button>
      )}
    </>
  );
};

export default BookForm;
