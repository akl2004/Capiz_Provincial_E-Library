import React, { useState, useEffect, useRef } from "react";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import { useNavigate } from "react-router-dom";
import patron from "../../../assets/orange-icons/guest.png";
import staff from "../../../assets/orange-icons/staff.png";
import admin from "../../../assets/orange-icons/admin.png";
import count from "../../../assets/icons/g-red.png";
import moment from "moment-timezone";
import Alert from "../../Alert";

interface Staff {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  profile_image_url: string | null;
}

interface Patron {
  id: number;
  patron_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [patronList, setPatronList] = useState<Patron[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Filter / sort
  const [activeFilterSection, setActiveFilterSection] = useState<string | null>(
    null
  );
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const sortRef = useRef<HTMLDivElement | null>(null);

  // Alert state
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  const filterRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [defaultTimezone, setDefaultTimezone] = useState<string>("Asia/Manila");

  // Initialize all fields
  const [formData, setFormData] = useState({
    role: "staff",
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone: "",
    email: "",
    password: "",
    status: "Active",
    profile_image: null as File | null,
  });

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await AxiosInstance.get("/settings/timezone", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDefaultTimezone(res.data.timezone || "Asia/Manila");
    } catch (err) {
      console.error("Error fetching timezone setting:", err);
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true); // start loading
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const res = await AxiosInstance.get("/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setStaffList(res.data);
    } catch (err) {
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatrons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const res = await AxiosInstance.get("/patrons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatronList(res.data);
    } catch (err) {
      console.error("Error fetching patrons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchStaff();
    fetchPatrons();
    document.title = "Accounts";
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // adding new user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("role", formData.role);
      data.append("first_name", formData.first_name);
      data.append("middle_name", formData.middle_name);
      data.append("last_name", formData.last_name);
      data.append("suffix", formData.suffix);
      data.append("phone_number", formData.phone);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("status", formData.status);

      if (formData.profile_image) {
        data.append("profile_image", formData.profile_image);
      }

      await AxiosInstance.post("/users", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAlertMessage("User added successfully!");
      setAlertType("success");
      setShowModal(false);

      setFormData({
        role: "staff",
        first_name: "",
        middle_name: "",
        last_name: "",
        suffix: "",
        phone: "",
        email: "",
        password: "",
        status: "Active",
        profile_image: null,
      });
      fetchStaff();
      fetchUserCounts();
    } catch (err: any) {
      setAlertMessage(err.response?.data?.message || "Failed to add user.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterMenuOpen(false);
        setActiveFilter(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter & Sort logic
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Combine all users for searching, filtering, and sorting
  const allUsers = [...staffList, ...patronList];

  const filteredUsers = allUsers.filter((u) => {
    const fullName = `${u.first_name} ${u.middle_name ?? ""} ${u.last_name} ${
      u.suffix ?? ""
    }`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      ("role" in u
        ? u.email.toLowerCase().includes(searchTerm.toLowerCase())
        : u.patron_id.toLowerCase().includes(searchTerm.toLowerCase()));

    // Role filter
    const matchesRole = roleFilter
      ? "role" in u
        ? u.role === roleFilter
        : roleFilter === "patron"
      : true;

    // Status filter
    const matchesStatus = statusFilter
      ? u.status.toLowerCase() === statusFilter.toLowerCase()
      : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort patrons by selected field + order
  const sortedUsers = [...filteredUsers].sort((a, b) => {
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

    if (sortField === "created_at") {
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

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Display last_login_at in the system timezone
  const formatLastLogin = (dateStr: string | null) => {
    if (!dateStr) return "Never";

    const m = moment(dateStr);
    if (!m.isValid()) return "Invalid Date";

    try {
      return m
        .tz(defaultTimezone || "Asia/Manila")
        .format("MMMM D, YYYY h:mm A");
    } catch (err) {
      console.error("Timezone error:", err);
      return m.format("MMMM D, YYYY h:mm A");
    }
  };

  // User counts for tally summary
  const [userCounts, setUserCounts] = useState({
    total_patrons: 0,
    total_staff: 0,
    total_admins: 0,
    new_accounts_this_week: 0,
  });

  const fetchUserCounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const res = await AxiosInstance.get("/user-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserCounts(res.data);
    } catch (err) {
      console.error("Error fetching user counts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCounts();
  }, []);

  return (
    <>
      <div className="account-tally-cards-container">
        <div className="account-tally-card">
          <img src={patron} alt="Patrons" />
          <div className="account-tally-info">
            <div className="account-tally-count">
              {loading ? <LoadingSpinner /> : userCounts.total_patrons}
            </div>
            <div className="account-tally-label">Total Patrons</div>
          </div>
        </div>

        <div className="account-tally-card">
          <img src={staff} alt="Staff" />
          <div className="account-tally-info">
            <div className="account-tally-count">
              {loading ? <LoadingSpinner /> : userCounts.total_staff}
            </div>
            <div className="account-tally-label">Total Staff</div>
          </div>
        </div>

        <div className="account-tally-card">
          <img src={admin} alt="Admins" />
          <div className="account-tally-info">
            <div className="account-tally-count">
              {loading ? <LoadingSpinner /> : userCounts.total_admins}
            </div>
            <div className="account-tally-label">Total Admins</div>
          </div>
        </div>

        <div className="account-tally-card">
          <img src={count} alt="New" />
          <div className="account-tally-info">
            <div className="account-tally-count">
              {loading ? <LoadingSpinner /> : userCounts.new_accounts_this_week}
            </div>
            <div className="account-tally-label">New Accounts This Week</div>
          </div>
        </div>
      </div>

      <div className="user-page mt-4">
        {/* Alert component */}
        {alertMessage && (
          <Alert
            message={alertMessage}
            type={alertType}
            onClose={() => setAlertMessage("")}
          />
        )}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="text-xl font-semibold mb-0">Registered Accounts</h1>
            <p className="mb-0">
              <i>Manage and view all registered accounts.</i>
            </p>
          </div>

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
                      { field: "date", label: "Date Created" },
                    ].map(({ field, label }) => (
                      <div
                        key={field}
                        className="sort-field"
                        onClick={() =>
                          setSortField(
                            sortField === field ? null : (field as any)
                          )
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

            {/* Filter Controls */}
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
                  {/* Role SECTION */}
                  <div
                    className={`filter-section-header ${
                      activeFilterSection === "role" ? null : "role"
                    }`}
                    onClick={() =>
                      setActiveFilterSection(
                        activeFilterSection === "role" ? null : "role"
                      )
                    }
                  >
                    Role{" "}
                    <i
                      className={`bi ${
                        activeFilterSection === "role"
                          ? "bi-chevron-down"
                          : "bi-chevron-right"
                      } ms-2`}
                    ></i>
                  </div>
                  {activeFilterSection === "role" &&
                    ["staff", "patron", "admin"].map((role) => (
                      <div
                        key={role}
                        className={`filter-item ${
                          roleFilter === role ? "active" : ""
                        }`}
                        onClick={() =>
                          setRoleFilter(roleFilter === role ? null : role)
                        }
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </div>
                    ))}
                  {/* Status Filter */}
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

            <button className="user-btn" onClick={() => setShowModal(true)}>
              Add User
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : sortedUsers.length > 0 ? (
          <table className="user-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Date Created</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user, index) => (
                <tr
                  key={`${user.id}-${index}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if ("role" in user) {
                      if (user.role === "admin") {
                        navigate(`/admin/accounts/admin/${user.id}`);
                      } else {
                        navigate(`/admin/accounts/staff/${user.id}`);
                      }
                    } else {
                      navigate(`/admin/accounts/patron/${user.id}`);
                    }
                  }}
                >
                  <td>{"role" in user ? user.email : user.patron_id}</td>
                  <td>
                    {[
                      user.first_name,
                      user.middle_name,
                      user.last_name,
                      user.suffix,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </td>
                  <td>
                    {"role" in user && typeof user.role === "string"
                      ? user.role
                      : "patron"}
                  </td>
                  <td>
                    <span
                      className={`status-pill status-${
                        user.status?.toLowerCase() ?? ""
                      }`}
                    >
                      {user.status ?? "N/A"}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>{formatLastLogin(user.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No users found.</p>
        )}

        {/* Pagination info */}
        {sortedUsers.length > 0 && (
          <div className="pagination-info text-center mb-2 mt-3">
            Showing {indexOfFirstItem + 1} -{" "}
            {Math.min(indexOfLastItem, sortedUsers.length)} of{" "}
            {sortedUsers.length} user
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

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h2 className="mb-0">ADD NEW USER</h2>
              <p>
                <i>Fill out the details below to create a new user.</i>
              </p>
              <hr />

              <form onSubmit={handleSubmit}>
                <div className="modal-flex-container">
                  {/* LEFT SIDE: Image Preview */}
                  <div className="profile-upload-section">
                    <div className="image-preview-circle">
                      {formData.profile_image ? (
                        <img
                          src={URL.createObjectURL(formData.profile_image)}
                          alt="Preview"
                        />
                      ) : (
                        <i className="bi bi-person-bounding-box"></i>
                      )}
                    </div>

                    <label className="custom-file-upload">
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setFormData({
                              ...formData,
                              profile_image: e.target.files[0],
                            });
                          }
                        }}
                      />
                      Choose Photo
                    </label>
                    <small
                      style={{
                        marginTop: "8px",
                        color: "#888",
                        fontSize: "0.75rem",
                      }}
                    >
                      JPG or PNG, Max 5MB
                    </small>
                  </div>

                  {/* RIGHT SIDE: Input Fields */}
                  <div className="form-fields-section">
                    <div className="name-row mb-3">
                      <label className="row-label">Role</label>
                      <div className="role-selection-container">
                        <button
                          type="button"
                          className={`role-btn ${
                            formData.role === "staff" ? "active" : ""
                          }`}
                          onClick={() =>
                            setFormData({ ...formData, role: "staff" })
                          }
                        >
                          {" "}
                          STAFF{" "}
                        </button>
                        <button
                          type="button"
                          className={`role-btn ${
                            formData.role === "admin" ? "active" : ""
                          }`}
                          onClick={() =>
                            setFormData({ ...formData, role: "admin" })
                          }
                        >
                          {" "}
                          ADMIN{" "}
                        </button>
                      </div>
                    </div>

                    <div className="name-row mb-1">
                      <label className="row-label">Full Name</label>
                      <div className="inputs">
                        <input
                          type="text"
                          placeholder="First Name"
                          required
                          value={formData.first_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              first_name: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Middle Name"
                          value={formData.middle_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              middle_name: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          required
                          value={formData.last_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              last_name: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          placeholder="Suffix"
                          value={formData.suffix}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              suffix: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="name-row mb-1">
                      <label className="row-label">Contact</label>
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="name-row mb-1">
                      <label className="row-label">Email</label>
                      <input
                        type="text"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="name-row mb-1">
                      <label className="row-label">Password</label>
                      <input
                        type="text"
                        placeholder="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    {loading ? "Saving..." : "Save User"}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Accounts;
