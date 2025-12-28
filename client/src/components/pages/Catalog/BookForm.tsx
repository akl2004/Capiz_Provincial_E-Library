import React, { useEffect, useState } from "react";
import AxiosInstance from "../../../AxiosInstance";
import Barcode from "react-barcode";
import { useNavigate } from "react-router-dom";
import MessageModal from "../../MessageModal";

interface Copy {
  copy_number: number;
  barcode: string;
  cataloging_note: string;
  internal_note: string;
  source_person: string;
  source: string;
  condition: string;
  price: string | number;
  material_type: string;
}

const BookForm: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [showModal, setShowModal] = useState(false);

  const [personSubject, setPersonSubject] = useState("");
  const [geographicalSubject, setGeographicalSubject] = useState("");
  const [author, setAuthor] = useState("");
  const [editor, setEditor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [deweyDecimal, setDeweyDecimal] = useState("");
  const [authorNumber, setAuthorNumber] = useState("");
  const [title, setTitle] = useState("");
  const [edition, setEdition] = useState("");
  const [placeOfPublication, setPlaceOfPublication] = useState("");
  const [publisher, setPublisher] = useState("");
  const [yearCopyright, setYearCopyright] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [volume, setVolume] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [numberOfPages, setNumberOfPages] = useState<number | "">("");

  // Checklist
  const [includesIndex, setIncludesIndex] = useState(false);
  const [includesAppendix, setIncludesAppendix] = useState(false);
  const [includesGlossary, setIncludesGlossary] = useState(false);
  const [
    includesBibliographicalReferences,
    setIncludesBibliographicalReferences,
  ] = useState(false);

  // ===== Accession Record =====
  const [sourcePerson, setSourcePerson] = useState("");
  const [catalogingNote, setCatalogingNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [copies, setCopies] = useState(1);
  const [section, setSection] = useState("");
  const [source, setSource] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const [defaultCondition, setDefaultCondition] = useState<string[]>([]);
  const [defaultPrice, setDefaultPrice] = useState<string | number>("");

  // Barcode modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [bookCopies, setBookCopies] = useState<Copy[]>([]);

  // Topical subjects
  const [topicalSubjects, setTopicalSubjects] = useState<string[]>([
    "",
    "",
    "",
  ]);
  const handleTopicalChange = (index: number, value: string) => {
    const updated = [...topicalSubjects];
    updated[index] = value;
    setTopicalSubjects(updated);
  };

  // Other Authors/Editors
  const [otherAuthorsEditors, setOtherAuthorsEditors] = useState<string[]>([
    "",
  ]);
  const handleOtherAuthorEditorChange = (index: number, value: string) => {
    const updated = [...otherAuthorsEditors];
    updated[index] = value;
    setOtherAuthorsEditors(updated);
  };

  const navigate = useNavigate();

  // Fetch dropdown options
  useEffect(() => {
    document.title = "Add Book";
    AxiosInstance.get("/dropdown-options").then((res) => {
      setSections(res.data.sections || []);
      setSources(res.data.sources || []);
      setMaterialTypes(res.data.materialTypes || []);
      const fetchedConditions = res.data.conditions || [];
      setDefaultCondition(fetchedConditions);
      if (res.data.sections?.length) setSection(res.data.sections[0]);
      if (res.data.sources?.length) setSource(res.data.sources[0]);
      if (res.data.materialTypes?.length)
        setMaterialType(res.data.materialTypes[0]);
    });
  }, []);

  const generateBarcode = () => {
    const randomNumbers = Math.floor(1000000000 + Math.random() * 9000000000);
    return `BC${randomNumbers}`;
  };

  useEffect(() => {
    const generatedCopies: Copy[] = Array.from({ length: copies }, (_, i) => ({
      copy_number: i + 1,
      barcode: generateBarcode(),
      condition: "Fine",
      price: defaultPrice || "",
      cataloging_note: "",
      internal_note: "",
      source_person: "",
      source: "",
      material_type: "",
    }));
    setBookCopies(generatedCopies);
  }, [copies, defaultCondition, defaultPrice]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowModal(false);

    const formData = new FormData();
    formData.append("person_as_subject", personSubject);

    // Only non-empty topical subjects
    const filteredSubjects = topicalSubjects.filter((s) => s.trim() !== "");
    filteredSubjects.forEach((subject) => {
      formData.append("topical_subject[]", subject);
    });

    formData.append("geographical_subject", geographicalSubject);
    formData.append("author", author);
    formData.append("editor", editor);
    formData.append(
      "other_author_editor",
      otherAuthorsEditors.filter((oae) => oae.trim() !== "").join(", ")
    );
    formData.append("isbn", isbn);
    formData.append("dewey_decimal", deweyDecimal);
    formData.append("author_number", authorNumber);
    formData.append("title", title);
    formData.append("edition", edition);
    formData.append("place_of_publication", placeOfPublication);
    formData.append("publisher", publisher);
    formData.append("copyright", yearCopyright);
    formData.append("series_name", seriesName);
    formData.append("volume", volume);
    formData.append("book_language", languageCode);
    formData.append("number_of_pages", numberOfPages.toString());
    formData.append("includes_index", includesIndex ? "1" : "0");
    formData.append("includes_appendix", includesAppendix ? "1" : "0");
    formData.append("includes_glossary", includesGlossary ? "1" : "0");
    formData.append(
      "includes_bibliographical_references",
      includesBibliographicalReferences ? "1" : "0"
    );
    formData.append("source_person", sourcePerson);
    formData.append("cataloging_note", catalogingNote);
    formData.append("internal_note", internalNote);
    formData.append("copies", copies.toString());
    formData.append("section", section);
    formData.append("source", source.trim());
    formData.append("material_type", materialType);
    formData.append("condition", defaultCondition[0] || "Fine");
    if (coverImage) formData.append("cover_image", coverImage);

    // Append each copy (optional)
    bookCopies.forEach((c, i) => {
      formData.append(
        `copies_data[${i}][copy_number]`,
        c.copy_number.toString()
      );
      formData.append(`copies_data[${i}][barcode]`, c.barcode);
      formData.append(`copies_data[${i}][condition]`, c.condition);

      const priceToSubmit = c.price || defaultPrice || "0.00";
      formData.append(`copies_data[${i}][price]`, priceToSubmit.toString());
    });

    try {
      const res = await AxiosInstance.post("/books", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setModalType("success");
      setModalMessage("Book saved successfully! Generating barcodes...");
      setShowModal(true);

      if (res.data.book && res.data.book.copies) {
        setBookCopies(res.data.book.copies);
      }

      setTimeout(() => {
        setShowModal(false);
        setShowBarcodeModal(true);
      }, 2000);
    } catch (error: any) {
      setModalType("error");
      setModalMessage(
        "Failed to save book. Please check the fields and try again."
      );
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="book-form">
        {/* ===== Catalog Record ===== */}
        <fieldset>
          <legend className="record text-white">CATALOG RECORD</legend>
          {/* Identifiers */}
          <fieldset>
            <legend>Identifiers</legend>
            <div className="flex-row" style={{ gap: "40px" }}>
              {/* Left Column: existing input fields */}
              <div className="flex-col" style={{ flex: 1, gap: "10px" }}>
                <div className="flex-row">
                  <label>ISBN</label>
                  <span className="catalog_number">(020)</span>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                  />
                </div>
                <div className="flex-row">
                  <label>Dewey Decimal</label>
                  <span className="catalog_number">(082)</span>
                  <input
                    type="text"
                    value={deweyDecimal}
                    onChange={(e) => setDeweyDecimal(e.target.value)}
                  />
                </div>
                <div className="flex-row">
                  <label>Author Number</label>
                  <span className="catalog_number">(949)</span>
                  <input
                    type="text"
                    value={authorNumber}
                    onChange={(e) => setAuthorNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: cover image input */}
              <div className="cover-image-container">
                <label className="cover-image-label">Cover Image</label>
                <div
                  className="cover-image-box"
                  onClick={() => document.getElementById("coverInput")?.click()}
                >
                  {coverImage ? (
                    <img
                      src={URL.createObjectURL(coverImage)}
                      alt="Cover Preview"
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
                      if (e.target.files && e.target.files[0]) {
                        setCoverImage(e.target.files[0]);
                      }
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex-row">
                <label>Edition</label>
                <span className="catalog_number">(250)</span>
                <input
                  type="text"
                  className="small"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                />
              </div>

              {/* Publication Row */}
              <div className="flex-row">
                <label>Publication</label>
                <span className="catalog_number">(264)</span>
                <div className="flex-col flex-grow">
                  <input
                    type="text"
                    value={placeOfPublication}
                    onChange={(e) => setPlaceOfPublication(e.target.value)}
                  />
                  <span className="sub-label">
                    <i>Place</i>
                  </span>
                </div>
                <div className="flex-col flex-grow">
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                  />
                  <span className="sub-label">
                    <i>Publisher</i>
                  </span>
                </div>
                <div className="flex-col" style={{ width: "100px" }}>
                  <input
                    type="text"
                    className="small"
                    value={yearCopyright}
                    onChange={(e) => setYearCopyright(e.target.value)}
                  />
                  <span className="sub-label">
                    <i>Year</i>
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Two-Column Layout: Left = Series, Language Code, Pages; Right = Checklist */}
            <div className="flex-row" style={{ gap: "40px" }}>
              {/* Left Column */}
              <div className="flex-col flex-grow" style={{ gap: "10px" }}>
                <div
                  className="flex-row"
                  style={{ gap: "10px", marginTop: "10px" }}
                >
                  <label>Series</label> {/* single main label for the row */}
                  <span className="catalog_number">(400)</span>
                  <div className="flex-col flex-grow">
                    <input
                      type="text"
                      value={seriesName}
                      onChange={(e) => setSeriesName(e.target.value)}
                    />
                    <span className="sub-label">
                      <i>Series Name</i>
                    </span>
                  </div>
                  <div className="flex-col" style={{ width: "100px" }}>
                    <input
                      type="text"
                      className="small"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                    />
                    <span className="sub-label">
                      <i>Volume</i>
                    </span>
                  </div>
                </div>

                <div className="flex-row">
                  <label>Language Code</label>
                  <span className="catalog_number">(041)</span>
                  <input
                    type="text"
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                  />
                </div>

                <div className="flex-row">
                  <label>Number of Pages</label>
                  <span className="catalog_number">(300)</span>
                  <input
                    type="text"
                    className="small"
                    value={numberOfPages}
                    onChange={(e) => setNumberOfPages(Number(e.target.value))}
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
                      checked={includesIndex}
                      onChange={() => setIncludesIndex(!includesIndex)}
                    />
                    Includes Index
                  </p>
                  <p>
                    <input
                      type="checkbox"
                      className="book-checkbox"
                      checked={includesAppendix}
                      onChange={() => setIncludesAppendix(!includesAppendix)}
                    />
                    Includes Appendix
                  </p>
                  <p>
                    <input
                      type="checkbox"
                      className="book-checkbox"
                      checked={includesGlossary}
                      onChange={() => setIncludesGlossary(!includesGlossary)}
                    />
                    Includes Glossary
                  </p>
                  <p>
                    <input
                      type="checkbox"
                      className="book-checkbox"
                      checked={includesBibliographicalReferences}
                      onChange={() =>
                        setIncludesBibliographicalReferences(
                          !includesBibliographicalReferences
                        )
                      }
                    />
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
                  value={personSubject}
                  onChange={(e) => setPersonSubject(e.target.value)}
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
                    value={subject}
                    onChange={(e) => handleTopicalChange(index, e.target.value)}
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
                  value={geographicalSubject}
                  onChange={(e) => setGeographicalSubject(e.target.value)}
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
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>

              <div className="flex-row">
                <label>Editor</label>
                <span className="catalog_number">(700)</span>
                <input
                  type="text"
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                />
              </div>

              {otherAuthorsEditors.map((person, index) => (
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
              ))}

              <button
                type="button"
                className="add-more"
                onClick={() =>
                  setOtherAuthorsEditors([...otherAuthorsEditors, ""])
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

          {/* Row 1: Section and Material Type */}
          <div className="flex-row" style={{ gap: "20px" }}>
            <div className="flex-row flex-grow">
              <label>Section</label>
              <span className="catalog_number">(245)</span>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
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
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
              >
                {materialTypes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Source and Copies */}
          <div className="flex-row" style={{ gap: "20px" }}>
            <div className="flex-row flex-grow">
              <label>Source of Acquisition</label>
              <span className="catalog_number">(245)</span>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
                value={defaultPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setDefaultPrice(val);
                  }
                }}
                onBlur={() => {
                  const parsed = parseFloat(defaultPrice.toString());
                  if (!isNaN(parsed)) {
                    setDefaultPrice(parsed.toFixed(2));
                  } else {
                    setDefaultPrice("");
                  }
                }}
              />
            </div>
          </div>

          <hr className="mt-0" />

          {/* Row 3: Funding Source and Copy Number */}
          {bookCopies.map((c, index) => (
            <div
              key={c.copy_number}
              className="flex-row"
              style={{ gap: "20px", marginTop: "10px" }}
            >
              <div className="flex-row flex-grow">
                <label>Copy Number</label>
                <span className="catalog_number">(245)</span>
                <input
                  type="text"
                  value={c.copy_number}
                  readOnly
                  className="text-muted"
                />
              </div>

              <div className="flex-row flex-grow">
                <label>Barcode</label>
                <span className="catalog_number">(245)</span>
                <input
                  type="text"
                  value={c.barcode}
                  readOnly
                  className="text-muted"
                />
              </div>
              <div className="flex-row flex-grow">
                <label>Condition</label>
                <span className="catalog_number">(245)</span>
                <select
                  value={c.condition}
                  onChange={(e) => {
                    const updated = [...bookCopies];
                    updated[index].condition = e.target.value;
                    setBookCopies(updated);
                  }}
                >
                  {defaultCondition.length > 0 ? (
                    defaultCondition.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))
                  ) : (
                    <option>Loading...</option>
                  )}
                </select>
              </div>
            </div>
          ))}

          {/* Place this right after the bookCopies.map() closing bracket */}
          <div className="stepper-wrapper">
            <div className="stepper-label">
              Number of Copies <span className="catalog_number">(245)</span>
            </div>
            <div className="stepper-container">
              <button
                type="button"
                className="stepper-btn minus"
                onClick={() => setCopies(Math.max(1, copies - 1))}
              >
                −
              </button>

              <input
                type="number"
                className="stepper-input"
                value={copies}
                min={1}
                onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
              />

              <button
                type="button"
                className="stepper-btn plus"
                onClick={() => setCopies(copies + 1)}
              >
                +
              </button>
            </div>
          </div>

          <hr className="mt-0" />

          {/* Row 4: Funding Source */}
          <div className="flex-row flex-grow">
            <label>Funding Source</label>
            <span className="catalog_number">(245)</span>
            <input
              type="text"
              value={sourcePerson}
              onChange={(e) => setSourcePerson(e.target.value)}
            />
          </div>

          {/* Row 5: Cataloging Note */}
          <div className="flex-row flex-grow">
            <label>Cataloging Note</label>
            <span className="catalog_number">(910)</span>
            <textarea
              value={catalogingNote}
              onChange={(e) => setCatalogingNote(e.target.value)}
            />
          </div>

          {/* Row 6: Internal Note */}
          <div className="flex-row flex-grow">
            <label>Internal Note</label>
            <span className="catalog_number">(245)</span>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
            />
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            {loading && <span className="spinner-tiny"></span>}
            {loading ? "Saving..." : "Save Book"}
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => {
              const role = localStorage.getItem("role")?.toLowerCase();
              if (role === "admin") {
                navigate("/admin/cataloging");
              } else if (role === "staff") {
                navigate("/staff/cataloging");
              }
            }}
          >
            Cancel
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
          <div className="modal-box">
            {/* Close button */}
            <button
              onClick={() => setShowBarcodeModal(false)}
              className="modal-close-btn"
            >
              &times;
            </button>

            <h2 className="text-xl font-semibold mb-4">Generated Barcodes</h2>

            <div id="printable-barcodes">
              {bookCopies.map((c) => (
                <div key={c.copy_number} className="barcode-item">
                  <div className="barcode-text">
                    {title.substring(0, 25)}
                    {title.length > 25 ? "..." : ""} <br />
                    Copy: {c.copy_number}
                  </div>
                  <Barcode
                    value={c.barcode}
                    width={2}
                    height={50}
                    renderer="img"
                    displayValue={true}
                    fontSize={12}
                    margin={10}
                  />
                </div>
              ))}
            </div>

            <div className="form-actions no-print">
              <button onClick={() => window.print()} className="submit-btn">
                Print All
              </button>
              <button
                onClick={() => {
                  setShowBarcodeModal(false);

                  // Role-based redirect
                  const role = localStorage.getItem("role")?.toLowerCase();
                  if (role === "admin") {
                    navigate("/admin/cataloging");
                  } else if (role === "staff") {
                    navigate("/staff/cataloging");
                  }
                }}
                className="cancel-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookForm;
