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
  material_type?: string;
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
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [price, setPrice] = useState<number>(0);
  const [conditions, setCondition] = useState<string[]>([]);
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const navigate = useNavigate();

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [newlyAddedCopies, setNewlyAddedCopies] = useState<BookCopy[]>([]);

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
    if (showModal) {
      AxiosInstance.get("/dropdown-options")
        .then((res) => {
          setMaterialTypes(res.data.materialTypes || []);
          setSources(res.data.sources || []);
          setCondition(res.data.conditions || []);
          if (book && book.copies && book.copies.length > 0) {
            setPrice(book.copies[0].price || 0);
          }
        })
        .catch((err) => console.error("Error fetching dropdowns:", err));
    }
  }, [showModal, book]);

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
    [book.series_name, book.volume].filter(Boolean).join("; ") || "N/A";

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
                  role === "admin" ? "/admin/cataloging" : "/staff/cataloging"
                );
              }}
            >
              <i className="bi bi-arrow-left"></i>
            </span>
            Bibliographical Record
          </h1>
          <p>
            <strong>Title:</strong> {book.title || "N/A"}
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
                : "N/A"}
            </span>
          </p>
          <p>
            <strong>Edition:</strong> {book.edition || "N/A"}
          </p>
          <p>
            <strong>Published:</strong>{" "}
            {[book.publisher, book.place_of_publication, book.copyright]
              .filter(Boolean)
              .join(", ") || "N/A"}
          </p>
          <p>
            <strong>Pages:</strong> {book.number_of_pages || "N/A"}
          </p>
          <p>
            <strong>Series:</strong> {seriesDisplay}
          </p>
          <p>
            <strong>Notes:</strong>{" "}
            {notesArray.length ? `Includes ${notesArray.join(", ")}` : "N/A"}
          </p>
          <p className="subjects mb-4">
            <strong>Subjects:</strong>
            <span>
              {topicalSubjects.length > 0
                ? topicalSubjects.map((subject, idx) => (
                    <span key={idx}>{subject}</span>
                  ))
                : "N/A"}
            </span>
          </p>

          <p>
            <strong>Call Number:</strong> {book.call_number || "N/A"}
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
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {book.copies.map((copy) => (
                <tr
                  key={copy.id}
                  onClick={() =>
                    navigate(
                      `${
                        localStorage.getItem("role")?.toLowerCase() === "staff"
                          ? `/staff/cataloging/${book.id}/${copy.id}`
                          : `/admin/cataloging/${book.id}/${copy.id}`
                      }`
                    )
                  }
                  className="book-row"
                  style={{ cursor: "pointer" }}
                >
                  <td>{copy.copy_number}</td>
                  <td>{copy.barcode}</td>
                  <td>{copy.accession_number || "N/A"}</td>
                  <td>
                    {copy.status?.toLowerCase() === "on loan"
                      ? "On Loan"
                      : "Available"}
                  </td>
                  <td>{copy.condition || "N/A"}</td>
                  <td>{copy.internal_note || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No copies available</p>
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
                    generateBarcode()
                  );

                  try {
                    setNewlyAddedCopies([]);
                    const postResponse = await AxiosInstance.post(
                      `/books/${book.id}/add-copy`,
                      {
                        source: formData.get("source"),
                        material_type: formData.get("material_type"),
                        source_person: formData.get("source_person"),
                        condition: formData.get("condition"),
                        cataloging_note: formData.get("cataloging_note"),
                        internal_note: formData.get("internal_note"),
                        copies: numCopies,
                        barcodes: barcodeList,
                        price: priceValue
                          ? parseFloat(priceValue.toString())
                          : 0,
                      }
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
                      `/books/${id}`
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
                  {/* Row 1 */}
                  <div className="accession-grid-row">
                    <div className="accession-field">
                      <label>
                        Material Type{" "}
                        <span className="catalog_number">(245)</span>
                      </label>
                      <select
                        name="material_type"
                        className="form-control"
                        defaultValue={materialTypes[0]}
                      >
                        {materialTypes.map((m) => (
                          <option key={m} value={m}>
                            {m}
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
                        Price <span className="catalog_number">(020)</span>
                      </label>
                      <input
                        type="text"
                        name="price"
                        className="form-control"
                        placeholder="0.00"
                        defaultValue={price}
                      />
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

                <div
                  className="form-actions mt-4"
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
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
                <button onClick={() => window.print()} className="submit-btn">
                  <i className="bi bi-printer me-2"></i> Print All
                </button>
                <button
                  onClick={() => setShowBarcodeModal(false)}
                  className="cancel-btn"
                >
                  Close
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
