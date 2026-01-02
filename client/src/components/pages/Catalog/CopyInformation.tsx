import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";

interface MaterialType {
  id: number;
  name: string;
}

interface BookCopy {
  id: number;
  accession_number: string;
  date_added: string;
  material_type: MaterialType | string;
  source: string;
  price: number;
  source_person: string;
  cataloging_note: string;
}

interface Book {
  id: number;
  title: string;
  call_number: string;
  copies: BookCopy[];
}

interface CirculationRecord {
  id: number;
  borrower: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  fine: number;
  status: string;
}

const CopyInformation: React.FC = () => {
  const { id, copyId } = useParams<{ id: string; copyId: string }>();
  const [copy, setCopy] = useState<BookCopy | null>(null);
  const [callNumber, setCallNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CirculationRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Copy Information";
    const fetchBookAndCopy = async () => {
      try {
        const response = await AxiosInstance.get(`/books/${id}`);
        const book: Book = response.data;

        setCallNumber(book.call_number);

        // find the copy inside book.copies
        const foundCopy = book.copies.find((c) => c.id === Number(copyId));
        setCopy(foundCopy || null);
      } catch (error) {
        console.error("Error fetching book or copy:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookAndCopy();
  }, [id, copyId]);

  // fetch circulation history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await AxiosInstance.get(`/copies/${copyId}/history`);
        setHistory(res.data);
      } catch (err) {
        console.error("Error fetching history", err);
      }
    };

    if (copyId) {
      fetchHistory();
    }
  }, [copyId]);

  if (loading)
    return (
      <div className="center-page">
        <LoadingSpinner message="Loading copy details..." />
      </div>
    );

  if (!copy)
    return (
      <div className="center-page">
        <p className="text-gray-600 text-lg">Copy not found</p>
      </div>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Accession Record */}
      <div className="copies-info mt-4">
        <h1 className="text-xl font-semibold mb-4">
          <span
            className="me-2"
            style={{ cursor: "pointer" }}
            onClick={() => {
              const role = localStorage.getItem("role")?.toLowerCase();
              navigate(
                role === "admin"
                  ? `/admin/cataloging/${id}`
                  : `/staff/cataloging/${id}`
              );
            }}
          >
            <i className="bi bi-arrow-left"></i>
          </span>
          Accession Record
        </h1>
        <table className="custom-table">
          <tbody>
            <tr>
              <th className="text-left font-semibold">Accession No.</th>
              <td className="border-l">{copy.accession_number || "-"}</td>
            </tr>
            <tr>
              <th className="text-left font-semibold">Date Acquired</th>
              <td className="border-l">
                {copy.date_added ? copy.date_added.split("T")[0] : "-"}
              </td>
            </tr>
            <tr>
              <th className="text-left font-semibold">Material Type</th>
              <td className="border-l">
                {typeof copy.material_type === "object"
                  ? copy.material_type.name
                  : copy.material_type || "-"}
              </td>
            </tr>
            <tr>
              <th className="text-left font-semibold">Price</th>
              <td className="border-l">
                {copy.price ? `₱${copy.price}` : "-"}
              </td>
            </tr>
            <tr>
              <th className="text-left font-semibold">Source of Acquisition</th>
              <td className="border-l">{copy.source || "-"}</td>
            </tr>
            <tr>
              <th className="text-left font-semibold">Funding Source</th>
              <td className="border-l">{copy.source_person || "-"}</td>
            </tr>
            <tr>
              <th className="text-left font-semibold">Catalog Note</th>
              <td className="border-l">{copy.cataloging_note || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Circulation History */}
      <div className="copies-info">
        <h1 className="text-lg font-semibold mb-3">Circulation History</h1>
        {history.length === 0 ? (
          <p className="text-gray-600">No circulation history found.</p>
        ) : (
          <table className="custom-table w-100 mt-3">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Date Issued</th>
                <th>Due Date</th>
                <th>Date Returned</th>
                <th>Fine</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((rec) => (
                <tr key={rec.id} className="border-t">
                  <td>{rec.borrower}</td>
                  <td>{rec.issue_date?.split("T")[0]}</td>
                  <td>{rec.due_date?.split("T")[0]}</td>
                  <td>
                    {rec.return_date ? rec.return_date.split("T")[0] : "—"}
                  </td>
                  <td>₱{rec.fine.toFixed(2)}</td>
                  <td>{rec.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CopyInformation;
