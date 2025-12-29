import { useEffect, useState, useRef } from "react";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";

import provinceListData from "../../../data/ph_addresses/province.json";
import cityListData from "../../../data/ph_addresses/city.json";
import barangayListData from "../../../data/ph_addresses/barangay.json";
import LoadingSpinner from "../../LoadingSpinner";

const provinceList = provinceListData as Province[];
const cityList = cityListData as City[];
const barangayList = barangayListData as Barangay[];

// Types
interface Province {
  province_code: string;
  province_name: string;
  region_code: string;
}

interface City {
  city_code: string;
  city_name: string;
  province_code: string;
}

interface Barangay {
  brgy_code: string;
  brgy_name: string;
  city_code: string;
  province_code: string;
}

interface Patron {
  id: number;
  patron_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  full_name?: string;
  status: string;
  registration_date: string;
  address: string;
  age: string;
  number: string;
  email: string;
  notes: string;
  created_at: string;
  expiry_date: string;
}

const AddPatronModal: React.FC<{ onClose: () => void; onSave: () => void }> = ({
  onClose,
  onSave,
}) => {
  // Form fields
  const [patronId, setPatronId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [number, setNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");

  // Address parts
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");

  // Suggestions
  const [provinceSuggestions, setProvinceSuggestions] = useState<Province[]>(
    []
  );
  const [citySuggestions, setCitySuggestions] = useState<City[]>([]);
  const [barangaySuggestions, setBarangaySuggestions] = useState<Barangay[]>(
    []
  );

  const [isAdding, setIsAdding] = useState(false);

  // Fetch a new Patron ID when modal opens
  useEffect(() => {
    const fetchPatronId = async () => {
      try {
        const response = await AxiosInstance.get("/patrons/generate-id");
        setPatronId(response.data.patron_id);
      } catch (error) {
        console.error("Error fetching Patron ID:", error);
      }
    };
    fetchPatronId();
  }, []);

  // Suggestion handlers
  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setProvinceSuggestions(
      provinceList
        .filter((p) =>
          p.province_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    const selectedProvince = provinceList.find(
      (p) => p.province_name.toLowerCase() === province.toLowerCase()
    );
    if (!selectedProvince) return setCitySuggestions([]);
    setCitySuggestions(
      cityList
        .filter(
          (c) =>
            c.province_code === selectedProvince.province_code &&
            c.city_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleBarangayChange = (value: string) => {
    setBarangay(value);
    const selectedCity = cityList.find(
      (c) => c.city_name.toLowerCase() === city.toLowerCase()
    );
    if (!selectedCity) return setBarangaySuggestions([]);
    setBarangaySuggestions(
      barangayList
        .filter(
          (b) =>
            b.city_code === selectedCity.city_code &&
            b.brgy_name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 4)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("No auth token found!");
        return;
      }
      await AxiosInstance.post(
        "/patrons",
        {
          patron_id: patronId,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          suffix,
          email,
          number,
          age,
          gender,
          province,
          city,
          barangay,
          address: `${barangay}, ${city}, ${province}`,
          notes,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      onSave();
      onClose();
    } catch (error) {
      console.error("Error adding patron:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2 className="mb-0">ADD NEW PATRON</h2>
        <p>
          <i>Fill out the details below to register a new library patron.</i>
        </p>
        <hr />
        <form onSubmit={handleSubmit}>
          <div className="name-row mt-2 mb-1">
            <label className="row-label">Patron ID</label>
            <div className="inputs">
              <input type="text" value={patronId} disabled />
            </div>
          </div>
          {/* Name fields in one row */}
          <div className="name-row mb-1">
            <label className="row-label">Full Name</label>
            <div className="inputs">
              <input
                type="text"
                value={firstName}
                placeholder="First Name"
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                value={middleName}
                placeholder="Middle Name"
                onChange={(e) => setMiddleName(e.target.value)}
              />
              <input
                type="text"
                value={lastName}
                placeholder="Last Name"
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <input
                type="text"
                value={suffix}
                placeholder="Suffix"
                onChange={(e) => setSuffix(e.target.value)}
              />
            </div>
          </div>

          {/* Province, City, Barangay */}
          <div className="address-row mb-1">
            <label className="row-label">Address</label>
            <div className="inputs">
              {/* Province */}
              <div className="relative">
                <input
                  type="text"
                  value={province}
                  placeholder="Province"
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  required
                />
                {provinceSuggestions.length > 0 && (
                  <ul className="suggestion-list">
                    {provinceSuggestions.map((p) => (
                      <li
                        key={p.province_code}
                        className="suggestion-item"
                        onClick={() => {
                          setProvince(p.province_name);
                          setProvinceSuggestions([]);
                        }}
                      >
                        {p.province_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* City */}
              <div className="relative">
                <input
                  type="text"
                  value={city}
                  placeholder="City"
                  onChange={(e) => handleCityChange(e.target.value)}
                  required
                />
                {citySuggestions.length > 0 && (
                  <ul className="suggestion-list">
                    {citySuggestions.map((c) => (
                      <li
                        key={c.city_code}
                        className="suggestion-item"
                        onClick={() => {
                          setCity(c.city_name);
                          setCitySuggestions([]);
                        }}
                      >
                        {c.city_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Barangay */}
              <div className="relative">
                <input
                  type="text"
                  value={barangay}
                  placeholder="Barangay"
                  onChange={(e) => handleBarangayChange(e.target.value)}
                  required
                />
                {barangaySuggestions.length > 0 && (
                  <ul className="suggestion-list">
                    {barangaySuggestions.map((b) => (
                      <li
                        key={b.brgy_code}
                        className="suggestion-item"
                        onClick={() => {
                          setBarangay(b.brgy_name);
                          setBarangaySuggestions([]);
                        }}
                      >
                        {b.brgy_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Contact Number + Age */}
          <div className="inline-row mb-1" style={{ gap: "30px" }}>
            <div className="inline-row inline-grow">
              <label className="inline-label">Number</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Enter contact number"
                required
              />
            </div>

            <div className="inline-row inline-grow">
              <label className="inline-label-short">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter age"
                required
              />
            </div>
          </div>

          <div className="inline-row mb-1" style={{ gap: "30px" }}>
            <div className="inline-row inline-grow">
              <label className="inline-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                style={{ width: "240px" }}
                required
              />
            </div>

            <div className="inline-row inline-grow">
              <label className="inline-label-short">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="name-row">
            <label className="row-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
            />
          </div>

          {/* Buttons row */}
          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isAdding}>
              {isAdding && <span className="spinner-tiny"></span>}
              {isAdding ? "Saving..." : "Save Patron"}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// patron table
const Patron = () => {
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Filter / sort
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<string | null>(
    null
  );
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const sortRef = useRef<HTMLDivElement | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const patronsPerPage = 10;

  const filterRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Fetch patrons
  const fetchPatrons = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get("/patrons", {
        params: { search: searchTerm },
      });
      setPatrons(response.data);
    } catch (error) {
      console.error("Error fetching patrons:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Patrons";
    fetchPatrons();
  }, [searchTerm]);

  // Close filter menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setDropdownPosition(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter patrons by search + status
  const filteredPatrons = patrons.filter((patron) => {
    const fullName = `${patron.first_name} ${patron.middle_name ?? ""} ${
      patron.last_name
    } ${patron.suffix ?? ""}`
      .trim()
      .toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      patron.patron_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter ? patron.status === statusFilter : true;

    return matchesSearch && matchesStatus;
  });

  // Sort patrons by selected field + order
  const sortedPatrons = [...filteredPatrons].sort((a, b) => {
    if (!sortField || !sortOrder) return 0;

    if (sortField === "name") {
      const nameA = `${a.first_name} ${a.middle_name ?? ""} ${a.last_name} ${
        a.suffix ?? ""
      }`
        .trim()
        .toLowerCase();
      const nameB = `${b.first_name} ${b.middle_name ?? ""} ${b.last_name} ${
        b.suffix ?? ""
      }`
        .trim()
        .toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }

    if (sortField === "registration_date") {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    }

    return 0;
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sortRef.current &&
        !sortRef.current.contains(e.target as Node) &&
        filterRef.current &&
        !filterRef.current.contains(e.target as Node)
      ) {
        setSortMenuOpen(false);
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // Pagination slice
  const totalPages = Math.ceil(sortedPatrons.length / patronsPerPage);
  const indexOfLastPatron = currentPage * patronsPerPage;
  const indexOfFirstPatron = indexOfLastPatron - patronsPerPage;
  const currentPatrons = sortedPatrons.slice(
    indexOfFirstPatron,
    indexOfLastPatron
  );

  // Get user role (example: from localStorage, adjust as needed)
  const role = localStorage.getItem("role") || "";

  return (
    <div className="copies-info mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="text-xl font-semibold mb-0">Patron List</h1>
          <p className="mb-0">
            <i>
              Manage and view all registered library patrons and their account
              details.
            </i>
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          {/* Controls */}
          <div className="d-flex gap-2 align-items-center">
            {/* Search */}
            <div className="position-relative" style={{ maxWidth: "300px" }}>
              <span
                className="position-absolute top-50 translate-middle-y ps-2"
                style={{ left: "10px", color: "#6c757d" }}
              >
                <i className="bi bi-search"></i>
              </span>
              <input
                className="form-control ps-5 pe-5"
                placeholder="Search"
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
                      { field: "name", label: "Name" },
                      {
                        field: "registration_date",
                        label: "Registration Date",
                      },
                    ].map(({ field, label }) => (
                      <div
                        key={field}
                        className={`sort-field ${
                          sortField === field ? "active" : ""
                        }`}
                        onClick={() =>
                          setSortField(sortField === field ? null : field)
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
                        if (sortOrder === "asc") setSortField(null);
                        else setSortOrder("asc");
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
                        if (sortOrder === "desc") setSortField(null);
                        else setSortOrder("desc");
                      }}
                    >
                      DESC
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter dropdown */}
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
                  {/* STATUS SECTION */}
                  <div
                    className={`filter-section-header ${
                      activeFilterSection === "status" ? "active" : ""
                    }`}
                    onClick={() =>
                      setActiveFilterSection(
                        activeFilterSection === "status" ? null : "status"
                      )
                    }
                  >
                    Status{" "}
                    <i
                      className={`bi ${
                        activeFilterSection === "status"
                          ? "bi-chevron-down"
                          : "bi-chevron-right"
                      } ms-2`}
                    ></i>
                  </div>

                  {activeFilterSection === "status" &&
                    ["Active", "Deactivated", "Expired", "Blocked"].map(
                      (status) => (
                        <div
                          key={status}
                          className={`filter-item ${
                            statusFilter === status ? "active" : ""
                          }`}
                          onClick={() =>
                            setStatusFilter(
                              statusFilter === status ? null : status
                            )
                          }
                        >
                          {status}
                        </div>
                      )
                    )}
                </div>
              )}
            </div>
          </div>

          <button className="patron-btn" onClick={() => setShowModal(true)}>
            Add Patron
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : currentPatrons.length > 0 ? (
        <table className="patron-table">
          <thead>
            <tr>
              <th></th>
              <th>Patron ID</th>
              <th>Patron Name</th>
              <th>Registration Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currentPatrons.map((patron, index) => (
              <tr
                key={patron.id}
                onClick={() => {
                  if (role === "admin") {
                    navigate(`/admin/patrons/${patron.id}`);
                  } else if (role === "staff") {
                    navigate(`/staff/patrons/${patron.id}`);
                  }
                }}
              >
                <td>{indexOfFirstPatron + index + 1}</td>
                <td>{patron.patron_id || "N/A"}</td>
                <td>
                  {`${patron.first_name} ${patron.middle_name ?? ""} ${
                    patron.last_name
                  } ${patron.suffix ?? ""}`.trim()}
                </td>
                <td>
                  {patron.created_at
                    ? new Date(patron.created_at).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  {patron.expiry_date
                    ? new Date(patron.expiry_date).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>
                  <span
                    className={`status-pill status-${
                      patron.status?.toLowerCase() || ""
                    }`}
                  >
                    {patron.status || "N/A"}
                  </span>
                </td>
                <td>
                  <button
                    className="dots-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (
                        e.target as HTMLElement
                      ).getBoundingClientRect();
                      setDropdownPosition(
                        openMenu === patron.id
                          ? null
                          : {
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                            }
                      );
                      setOpenMenu(openMenu === patron.id ? null : patron.id);
                    }}
                  >
                    <i className="bi bi-three-dots-vertical"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No patrons found.</p>
      )}

      {/* Pagination info */}
      {sortedPatrons.length > 0 && (
        <div className="pagination-info text-center mb-2 mt-3">
          Showing {indexOfFirstPatron + 1} -{" "}
          {Math.min(indexOfLastPatron, sortedPatrons.length)} of{" "}
          {sortedPatrons.length} patrons
        </div>
      )}

      {/* Pagination */}
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

      {dropdownPosition && (
        <div
          className="dropdown-content"
          style={{
            position: "absolute",
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => {
              if (openMenu) {
                if (role === "admin") {
                  navigate(`/admin/patrons/${openMenu}`);
                } else if (role === "staff") {
                  navigate(`/staff/patrons/${openMenu}`);
                }
              }
            }}
          >
            <i className="bi bi-eye"></i> View
          </button>
          <button>
            <i className="bi bi-pencil-square"></i> Edit
          </button>
          <button
            onClick={async () => {
              if (openMenu) {
                try {
                  await AxiosInstance.patch(`/patrons/${openMenu}/deactivate`);
                  fetchPatrons();
                } catch (error) {
                  console.error(error);
                }
              }
            }}
          >
            Deactivate
          </button>
        </div>
      )}

      {showModal && (
        <AddPatronModal
          onClose={() => setShowModal(false)}
          onSave={fetchPatrons}
        />
      )}
    </div>
  );
};

export default Patron;