import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import Barcode from "react-barcode";
import MessageModal from "../../MessageModal";

interface BookCopy {
  id: number;
  accession_number: string;
  barcode: string;
  status: string;
  condition: string;
  copy_number: number;
  price?: number;
  source: string;
  source_person: string;
  material_type?: string | { id: number; name: string };
  cataloging_note: string;
  internal_note: string;
}

interface Book {
  id: number;
  title: string;
  author?: string;
  editor?: string;
  other_author_editor?: string;
  edition?: string;
  series_name?: string;
  isbn_paperback: string;
  isbn_hardcover: string;
  issn: string;
  volume?: string;
  cover_image?: string;
  topical_subject?: string[] | string;
  publisher?: string;
  place_of_publication?: string;
  copyright?: string;
  call_number: string;
  number_of_pages?: number;
  includes_index?: boolean;
  includes_appendix?: boolean;
  includes_glossary?: boolean;
  includes_bibliographical_references?: boolean;
  copies: BookCopy[];
}

const BookDetails: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [materialTypes, setMaterialTypes] = useState<
    { id: number; name: string }[]
  >([]);
  const [sources, setSources] = useState<string[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [conditions, setCondition] = useState<string[]>([]);
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMaterialTypeId, setSelectedMaterialTypeId] = useState<
    number | string
  >("");

  const navigate = useNavigate();

  const [isbnPaperback, setIsbnPaperback] = useState("");
  const [isbnHardcover, setIsbnHardcover] = useState("");
  const [issn, setIssn] = useState("");

  const [selectedBinding, setSelectedBinding] = useState<string>("Paperback");

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [newlyAddedCopies, setNewlyAddedCopies] = useState<BookCopy[]>([]);

  const [showEditCopyModal, setShowEditCopyModal] = useState(false);
  const [editingCopy, setEditingCopy] = useState<BookCopy | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [messageModal, setMessageModal] = useState({
    show: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const [copies, setCopies] = useState(1);

  const generateBarcode = () => {
    const randomNumbers = Math.floor(1000000000 + Math.random() * 9000000000);
    return `BC${randomNumbers}`;
  };

  const handlePrintAllExistingBarcodes = () => {
    if (book && book.copies.length > 0) {
      setNewlyAddedCopies(book.copies);
      setShowBarcodeModal(true);
    } else {
      setMessageModal({
        show: true,
        message: "No copies available to print.",
        type: "error",
      });
    }
  };

  const getCoverImageUrl = (cover_image?: string) => {
    if (!cover_image) return "/src/assets/cover_placeholder.jpg";
    return `${
      import.meta.env.VITE_API_URL || "http://localhost:8000"
    }/storage/${cover_image}`;
  };

  useEffect(() => {
    document.title = "Book Details";

    const fetchBook = async () => {
      try {
        const response = await AxiosInstance.get(`/books/${id}`);
        const bookData: Book = response.data;

        // Normalize topical_subject to array
        let subjects: string[] = [];
        if (bookData.topical_subject) {
          if (Array.isArray(bookData.topical_subject)) {
            subjects = bookData.topical_subject;
          } else if (typeof bookData.topical_subject === "string") {
            try {
              subjects = JSON.parse(bookData.topical_subject);
              if (!Array.isArray(subjects))
                subjects = [bookData.topical_subject];
            } catch {
              subjects = [bookData.topical_subject];
            }
          }
        }

        setBook({ ...bookData, topical_subject: subjects });
      } catch (error) {
        console.error("Error fetching book:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  useEffect(() => {
    if ((showModal || showEditCopyModal) && book) {
      AxiosInstance.get("/dropdown-options")
        .then((res) => {
          const mTypes = res.data.materialTypes || [];
          setMaterialTypes(mTypes);
          setSources(res.data.sources || []);
          setCondition(res.data.conditions || []);

          setIsbnPaperback(book.isbn_paperback || "");
          setIsbnHardcover(book.isbn_hardcover || "");
          setIssn(book.issn || "");

          if (book && book.copies && book.copies.length > 0) {
            const firstCopy = book.copies[0];

            // Set Price
            setPrice(parseFloat(firstCopy.price?.toString() || "0"));

            const mTypeId =
              typeof firstCopy.material_type === "object"
                ? firstCopy.material_type.id
                : firstCopy.material_type;

            setSelectedMaterialTypeId(mTypeId || mTypes[0]?.id || "");
          } else if (mTypes.length > 0) {
            setSelectedMaterialTypeId(mTypes[0].id);
          }
        })
        .catch((err) => console.error("Error fetching dropdowns:", err));
    }
  }, [showModal, showEditCopyModal, book]);

  if (loading)
    return (
      <div className="center-page">
        <LoadingSpinner message="Loading book details..." />
      </div>
    );

  if (!book)
    return (
      <div className="center-page">
        <p className="text-gray-600 text-lg">Book not found</p>
      </div>
    );

  const displayContributor = [
    { label: "Author", value: book.author },
    { label: "Editor", value: book.editor },
    { label: "Other", value: book.other_author_editor },
  ].filter((contributor) => contributor.value?.trim());

  const seriesDisplay =
    [book.series_name, book.volume].filter(Boolean).join("; ") || "-";

  const topicalSubjects: string[] = Array.isArray(book.topical_subject)
    ? book.topical_subject
    : [];

  const notesArray = [
    book.includes_index && "index",
    book.includes_appendix && "appendix",
    book.includes_glossary && "glossary",
    book.includes_bibliographical_references && "bibliographical references",
  ].filter(Boolean);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Bibliographical Record */}
      <div className="bibliographical-record">
        {/* Bibliographical Info */}
        <div className="bibliographical-info">
          <h1 className="text-xl font-semibold mb-4">
            <span
              className="me-2"
              style={{ cursor: "pointer" }}
              onClick={() => {
                const role = localStorage.getItem("role")?.toLowerCase();
                navigate(
                  role === "admin" ? "/admin/cataloging" : "/staff/cataloging",
                );
              }}
            >
              <i className="bi bi-arrow-left"></i>
            </span>
            Bibliographical Record
          </h1>
          <p>
            <strong>Title:</strong> {book.title || "-"}
          </p>
          <p className="contributor">
            <strong>Contributor:</strong>
            <span>
              {displayContributor.length > 0
                ? displayContributor.map((c, idx) => (
                    <span key={idx}>
                      {c.label}: {c.value?.trim()}
                    </span>
                  ))
                : "-"}
            </span>
          </p>
          <p>
            <strong>Edition:</strong> {book.edition || "-"}
          </p>
          <p>
            <strong>Published:</strong>{" "}
            {[book.place_of_publication, book.publisher, book.copyright]
              .filter(Boolean)
              .join(", ") || "-"}
          </p>
          <p>
            <strong>Pages:</strong> {book.number_of_pages || "-"}
          </p>
          <p>
            <strong>Series:</strong> {seriesDisplay}
          </p>
          <p>
            <strong>Notes:</strong>{" "}
            {notesArray.length ? `Includes ${notesArray.join(", ")}` : "-"}
          </p>
          <p className="subjects mb-4">
            <strong>Subjects:</strong>
            <div className="d-flex flex-wrap gap-2">
              {topicalSubjects.length > 0
                ? topicalSubjects.map((subject, idx) => (
                    <span
                      key={idx}
                      className="badge bg-secondary-subtle text-secondary border px-2 py-1"
                      style={{ fontWeight: "500" }}
                    >
                      {subject}
                    </span>
                  ))
                : "-"}
            </div>
          </p>

          <p>
            <strong>Call Number:</strong> {book.call_number || "-"}
          </p>
        </div>

        {/* Image */}
        <div className="bibliographical-image">
          <img
            src={getCoverImageUrl(book.cover_image)}
            alt={book.title}
            className="book-cover"
          />
        </div>
      </div>

      {/* Copies Info */}
      <div className="copies-info mt-6">
        <div className="copies-header-container">
          <h1 className="copies-title">Copies Information</h1>

          <div className="copies-utility-bar">
            <span className="copies-count">
              Total Copies:{" "}
              <span className="count-highlight">{book.copies.length}</span>
            </span>
            <div className="utility-separator"></div>
            <div className="utility-actions">
              <button
                type="button"
                onClick={handlePrintAllExistingBarcodes}
                className="utility-btn secondary"
              >
                <i className="bi bi-printer"></i> Print Barcode
              </button>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="utility-btn primary"
              >
                <i className="bi bi-plus-circle"></i> New Copy
              </button>
            </div>
          </div>
        </div>
        {book.copies.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Barcode</th>
                <th>Accession Number</th>
                <th>Status</th>
                <th>Book Condition</th>
                <th>Circulation Restriction</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {book.copies.map((copy) => {
                const getRestriction = () => {
                  const status = copy.status?.toLowerCase();
                  const condition = copy.condition?.toLowerCase();

                  const isOnlyCopy = book.copies.length <= 1;

                  if (status === "lost") return "-";

                  if (
                    condition === "damaged" ||
                    condition === "poor" ||
                    isOnlyCopy
                  )
                    return "Library-use-only";

                  if (
                    (condition === "new" || condition === "fine") &&
                    (status === "available" || status === "on loan")
                  ) {
                    return "Circulating";
                  }
                  return "Circulating";
                };

                const restrictionLabel = getRestriction();

                let badgeClass = "text-secondary";
                if (restrictionLabel === "Circulating")
                  badgeClass = "bg-success-subtle text-success";
                if (restrictionLabel === "Library-use-only")
                  badgeClass = "bg-danger-subtle text-danger";

                return (
                  <tr
                    key={copy.id}
                    onClick={() =>
                      navigate(
                        `${
                          localStorage.getItem("role")?.toLowerCase() ===
                          "staff"
                            ? `/staff/cataloging/${book.id}/${copy.id}`
                            : `/admin/cataloging/${book.id}/${copy.id}`
                        }`,
                      )
                    }
                    className="book-row"
                    style={{ cursor: "pointer" }}
                  >
                    <td>{copy.copy_number}</td>
                    <td>{copy.barcode}</td>
                    <td>{copy.accession_number}</td>
                    <td>{copy.status}</td>
                    <td>{copy.condition || "-"}</td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {restrictionLabel}
                      </span>
                    </td>
                    <td>{copy.internal_note || "-"}</td>
                    {/* NEW ACTION CELL */}
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents navigation
                          setEditingCopy(copy);
                          setShowEditCopyModal(true);
                        }}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No copies available</p>
        )}

        {/* Quick Edit Copy Modal */}
        {showEditCopyModal && editingCopy && (
          <div className="modal-overlay">
            <div
              className="modal-box"
              style={{ maxWidth: "500px", width: "90%" }}
            >
              <h2 className="mb-3">
                Quick Edit Copy #{editingCopy.copy_number}
              </h2>
              <p className="text-muted small mb-4">
                Update condition and internal notes for this specific copy.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsUpdating(true);
                  const formData = new FormData(e.currentTarget);

                  try {
                    await AxiosInstance.put(
                      `/books/${book.id}/copies/${editingCopy.id}`,
                      {
                        condition: formData.get("condition"),
                        internal_note: formData.get("internal_note"),
                      },
                    );

                    setMessageModal({
                      show: true,
                      message: "Copy updated successfully!",
                      type: "success",
                    });

                    // Refresh data
                    const refreshResponse = await AxiosInstance.get(
                      `/books/${id}`,
                    );
                    setBook(refreshResponse.data);
                    setShowEditCopyModal(false);
                  } catch (error: any) {
                    setMessageModal({
                      show: true,
                      message: error.response?.data?.message || "Update Failed",
                      type: "error",
                    });
                  } finally {
                    setIsUpdating(false);
                  }
                }}
              >
                <div className="mb-3">
                  <label className="fw-bold mb-1">Condition</label>
                  <select
                    name="condition"
                    className="form-control"
                    defaultValue={editingCopy.condition}
                  >
                    {conditions.length === 0 && (
                      <option>Loading options...</option>
                    )}
                    {conditions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="fw-bold mb-1">Internal Note</label>
                  <textarea
                    name="internal_note"
                    className="form-control"
                    rows={3}
                    defaultValue={editingCopy.internal_note}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowEditCopyModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Copy Modal */}
        {showModal && book && (
          <div className="modal-overlay">
            <div
              className="modal-box"
              style={{ maxWidth: "800px", width: "95%" }}
            >
              <h2 className="mb-3">Add New Copy</h2>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsAdding(true);
                  const formData = new FormData(e.currentTarget);
                  const priceValue = formData.get("price");
                  const numCopies = Number(formData.get("copies") || 1);
                  const barcodeList = Array.from({ length: numCopies }, () =>
                    generateBarcode(),
                  );

                  try {
                    setNewlyAddedCopies([]);
                    const postResponse = await AxiosInstance.post(
                      `/books/${book.id}/add-copy`,
                      {
                        source: formData.get("source"),
                        material_type_id: formData.get("material_type_id"),
                        isbn_paperback:
                          isbnPaperback.trim() || book.isbn_paperback,
                        isbn_hardcover:
                          isbnHardcover.trim() || book.isbn_hardcover,
                        binding: selectedBinding,
                        issn: issn,
                        source_person: formData.get("source_person"),
                        condition: formData.get("condition"),
                        cataloging_note: formData.get("cataloging_note"),
                        internal_note: formData.get("internal_note"),
                        copies: numCopies,
                        barcodes: barcodeList,
                        price: priceValue
                          ? parseFloat(priceValue.toString())
                          : 0,
                      },
                    );

                    if (postResponse.data && postResponse.data.copies) {
                      setNewlyAddedCopies(postResponse.data.copies);
                    }

                    setMessageModal({
                      show: true,
                      message: "New copy added successfully!",
                      type: "success",
                    });
                    const refreshResponse = await AxiosInstance.get(
                      `/books/${id}`,
                    );
                    setBook(refreshResponse.data);
                    setShowModal(false);
                    setShowBarcodeModal(true);
                  } catch (error: any) {
                    setMessageModal({
                      show: true,
                      message: error.response?.data?.message || "Action Failed",
                      type: "error",
                    });
                  } finally {
                    setIsAdding(false);
                  }
                }}
              >
                <fieldset className="p-3">
                  {/* Row: Conditional ISBN or ISSN */}
                  <div className="accession-grid-row">
                    {selectedMaterialTypeId != 2 ? (
                      <div className="accession-field mb-3">
                        <label className="fw-bold mb-2">
                          Copy Binding Format{" "}
                          <span className="text-danger">*</span>
                        </label>

                        <div className="format-selection-container">
                          {/* PAPERBACK CARD */}
                          <div
                            className={`format-card ${
                              selectedBinding === "Paperback" ? "selected" : ""
                            }`}
                            onClick={() => setSelectedBinding("Paperback")}
                          >
                            <div className="format-header">
                              <span className="format-label">Paperback</span>
                              <div className="selection-indicator">
                                {selectedBinding === "Paperback" && "✓"}
                              </div>
                            </div>

                            {book.isbn_paperback ? (
                              <span className="isbn-display">
                                {book.isbn_paperback}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter ISBN..."
                                className="form-control form-control-sm"
                                value={isbnPaperback}
                                onChange={(e) =>
                                  setIsbnPaperback(e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()} // Stop click from triggering card select
                              />
                            )}
                          </div>

                          {/* HARDCOVER CARD */}
                          <div
                            className={`format-card ${
                              selectedBinding === "Hardcover" ? "selected" : ""
                            }`}
                            onClick={() => setSelectedBinding("Hardcover")}
                          >
                            <div className="format-header">
                              <span className="format-label">Hardcover</span>
                              <div className="selection-indicator">
                                {selectedBinding === "Hardcover" && "✓"}
                              </div>
                            </div>

                            {book.isbn_hardcover ? (
                              <span className="isbn-display">
                                {book.isbn_hardcover}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter ISBN..."
                                className="form-control form-control-sm"
                                value={isbnHardcover}
                                onChange={(e) =>
                                  setIsbnHardcover(e.target.value)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="accession-field">
                        <label>
                          ISSN <span className="catalog_number">(022)</span>
                        </label>
                        <input
                          type="text"
                          className="form-control mb-0"
                          value={issn}
                          onChange={(e) => setIssn(e.target.value)}
                          onFocus={() => setSelectedBinding("Serial")}
                        />
                      </div>
                    )}
                  </div>
                  {/* Row 1 */}
                  <div className="accession-grid-row">
                    <div className="accession-field">
                      <label>
                        Material Type{" "}
                        <span className="catalog_number">(245)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={
                          materialTypes.find(
                            (m) => m.id === selectedMaterialTypeId,
                          )?.name || "Loading..."
                        }
                        readOnly
                        disabled
                      />
                      <input
                        type="hidden"
                        name="material_type_id"
                        value={selectedMaterialTypeId}
                      />
                    </div>
                    <div className="accession-field">
                      <label>
                        Price <span className="catalog_number">(020)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="0.00"
                        value={price ? `₱${Number(price).toFixed(2)}` : "-"}
                        readOnly
                        disabled
                      />
                      <input type="hidden" name="price" value={price} />
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="accession-grid-row">
                    <div className="accession-field">
                      <label>
                        Condition <span className="catalog_number">(245)</span>
                      </label>
                      <select
                        name="condition"
                        className="form-control"
                        defaultValue={conditions[0]}
                      >
                        {conditions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="accession-field">
                      <label>
                        Source <span className="catalog_number">(245)</span>
                      </label>
                      <select
                        name="source"
                        className="form-control"
                        defaultValue={sources[0]}
                      >
                        {sources.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3 - Full Width or Shared */}
                  <div className="accession-grid-row">
                    <div className="accession-field">
                      <label>
                        No. of Copies{" "}
                        <span className="catalog_number">(245)</span>
                      </label>
                      <input
                        type="number"
                        name="copies"
                        className="form-control"
                        min={1}
                        value={copies || 1}
                        onChange={(e) =>
                          setCopies(Math.max(1, Number(e.target.value)))
                        }
                      />
                    </div>
                    <div className="accession-field">
                      <label>
                        Funding Source{" "}
                        <span className="catalog_number">(245)</span>
                      </label>
                      <input
                        type="text"
                        name="source_person"
                        className="form-control"
                        placeholder="Donor name"
                      />
                    </div>
                  </div>

                  {/* Row 4 - Notes */}
                  <div className="accession-notes-row">
                    <div className="accession-note-group">
                      <label>
                        Cataloging Note{" "}
                        <span className="catalog_number">(910)</span>
                      </label>
                      <textarea
                        name="cataloging_note"
                        className="form-control"
                        rows={2}
                      />
                    </div>
                    <div className="accession-note-group">
                      <label>
                        Internal Note{" "}
                        <span className="catalog_number">(245)</span>
                      </label>
                      <textarea
                        name="internal_note"
                        className="form-control"
                        rows={2}
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={isAdding}
                  >
                    {isAdding ? "Adding..." : "Add Copy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {messageModal.show && (
          <MessageModal
            message={messageModal.message}
            type={messageModal.type}
            onClose={() => setMessageModal({ ...messageModal, show: false })}
          />
        )}

        {/* ===== Barcode Modal for New Copies ===== */}
        {showBarcodeModal && newlyAddedCopies.length > 0 && (
          <div className="modal-overlay">
            <div className="modal-box">
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="modal-close-btn"
              >
                &times;
              </button>

              <h2 className="text-xl font-semibold mb-4">Print Barcodes</h2>

              <div id="printable-barcodes">
                {newlyAddedCopies.map((c) => (
                  <div key={c.id} className="barcode-item">
                    <div className="barcode-text">
                      {book.title.substring(0, 25)}
                      {book.title.length > 25 ? "..." : ""} <br />
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
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="cancel-btn"
                >
                  Close
                </button>
                <button onClick={() => window.print()} className="submit-btn">
                  <i className="bi bi-printer me-2"></i> Print All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDetails;
