import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import Alert from "../../Alert";
import AdminProfile from "./AdminProfile";

interface Staff {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string;
  phone_number: string | null;
  status: string;
  created_at: string;
  registered_by: string;
  last_login_at: string | null;
  role: string;
  profile_image_url?: string;
}

interface ActivityLog {
  id: number;
  role: string;
  module: string;
  action: string;
  description: string;
  created_at: string;
}

const StaffProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone: "",
    email: "",
    password: "",
    role: "staff",
    profile_image: undefined as File | undefined,
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState<
    boolean | null
  >(null);

  // Alert state
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activating, setActivating] = useState(false);

  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  // Fetch Staff Details
  useEffect(() => {
    document.title = "Staff Profile";
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No auth token found");

        const res = await AxiosInstance.get(`/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStaff(res.data);
      } catch (err) {
        console.error("Error fetching staff:", err);
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, [id]);

  // Editing staff info
  useEffect(() => {
    if (showModal && staff) {
      setFormData({
        first_name: staff.first_name,
        middle_name: staff.middle_name || "",
        last_name: staff.last_name,
        suffix: staff.suffix || "",
        phone: staff.phone_number || "",
        email: staff.email,
        password: "", 
        role: "staff", 
        profile_image: undefined,
      });
    }
  }, [showModal, staff]);

  // Handle staff update form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const data = new FormData();
      data.append("first_name", formData.first_name);
      data.append("middle_name", formData.middle_name || "");
      data.append("last_name", formData.last_name);
      data.append("suffix", formData.suffix || "");
      data.append("phone_number", formData.phone || "");
      data.append("role", formData.role);
      data.append("_method", "PUT");

      if (formData.profile_image instanceof File) {
        data.append("profile_image", formData.profile_image);
      }
      const res = await AxiosInstance.post(`/users/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setShowModal(false);
      setStaff(res.data.user || res.data);

      setAlertMessage("Staff updated successfully!");
      setAlertType("success");
    } catch (err: any) {
      console.error("Error updating staff:", err);
      setAlertMessage(err.response?.data?.message || "Failed to update staff.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  // Resetting password
  useEffect(() => {
    if (!showResetModal) {
      // Reset all fields when modal closes
      setCurrentPassword("");
      setNewPassword("");
      setResetError("");
      setIsCurrentPasswordValid(null);
    }
  }, [showResetModal]);

  // Validate current password
  const checkCurrentPassword = async (password: string) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      await AxiosInstance.post(
        `/users/${id}/validate-password`,
        { current_password: password.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsCurrentPasswordValid(true); // password correct
    } catch (err: any) {
      if (err.response?.status === 422) {
        setIsCurrentPasswordValid(false); // incorrect
      } else {
        setIsCurrentPasswordValid(null); // unknown error
      }
    }
  };

  useEffect(() => {
    if (!currentPassword) {
      setIsCurrentPasswordValid(null);
      return;
    }

    const timeout = setTimeout(() => {
      checkCurrentPassword(currentPassword);
    }, 500); // wait 500ms after typing

    return () => clearTimeout(timeout);
  }, [currentPassword]);

  // Handle reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setLoading(true);

    if (!currentPassword.trim()) {
      setResetError("Please enter your current password");
      setLoading(false);
      return;
    }

    if (!isCurrentPasswordValid) {
      setResetError("Current password is incorrect");
      setLoading(false);
      return;
    }

    if (newPassword.trim().length < 6) {
      setResetError("New password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      await AxiosInstance.post(
        `/users/${id}/reset-password`,
        {
          current_password: currentPassword,
          password: newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset everything
      setShowResetModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setResetError("");
      setIsCurrentPasswordValid(null);

      setAlertMessage("Password reset successfully!");
      setAlertType("success");
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.message) {
        setResetError(err.response.data.message);
      } else {
        setResetError("Failed to reset password. Please try again.");
      }
      setAlertMessage("Password reset failed. Please try again.");
      setAlertType("error");
    } finally {
      setLoading(false);
    }
  };

  // Confirming deactivation
  const handleDeactivate = async () => {
    if (!staff) return;
    setDeactivating(true);
    try {
      await AxiosInstance.patch(`/users/${staff.id}/deactivate`);
      setShowDeactivateModal(false);

      // Refresh staff data
      const updated = await AxiosInstance.get(`/users/${staff.id}`);
      setStaff(updated.data);

      // Success alert
      setAlertMessage("Staff has been deactivated successfully!");
      setAlertType("success");
    } catch (error) {
      console.error("Error deactivating staff:", error);
      setAlertMessage("Failed to deactivate staff.");
      setAlertType("error");
    } finally {
      setDeactivating(false);
    }
  };

  // Reactivate staff
  const handleActivate = async () => {
    if (!staff) return;
    setActivating(true);
    try {
      await AxiosInstance.patch(`/users/${staff.id}/activate`);
      setShowActivateModal(false);

      // Refresh staff data
      const updated = await AxiosInstance.get(`/users/${staff.id}`);
      setStaff(updated.data);

      // Success alert
      setAlertMessage("Staff has been reactivated successfully!");
      setAlertType("success");
    } catch (error) {
      console.error("Error activating staff:", error);
      setAlertMessage("Failed to reactivate staff.");
      setAlertType("error");
    } finally {
      setActivating(false);
    }
  };

  // Promoting staff to admin
  const promoteStaff = async (staffId: number) => {
    setLoading(true);
    try {
      await AxiosInstance.put(`/users/${staffId}/promote`);

      // Fetch updated user
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const res = await AxiosInstance.get(`/users/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStaff(res.data); // update staff state

      // Success alert
      setAlertMessage("Staff has been successfully promoted to Admin!");
      setAlertType("success");
    } catch (error: any) {
      console.error(error);
      setAlertMessage(
        error.response?.data?.message || "Failed to promote staff."
      );
      setAlertType("error");
      setLoading(false);
    }
  };

  // Fetch Activity Logs for this specific staff
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No auth token found");

        const res = await AxiosInstance.get(`/users/${id}/activity-logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setActivityLogs(res.data);
      } catch (err) {
        console.error("Error fetching activity logs:", err);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchLogs();
  }, [id]);

  // Close filter menu if clicked outside
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

  // Filter & Sort Activity Logs
  const filteredLogs = activityLogs.filter((log) =>
    searchTerm
      ? log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortOption === "name_asc") return a.role.localeCompare(b.role);
    if (sortOption === "name_desc") return b.role.localeCompare(a.role);
    if (sortOption === "date_asc")
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    if (sortOption === "date_desc")
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    return 0;
  });

  const fullName = staff
    ? [staff.first_name, staff.middle_name, staff.last_name, staff.suffix]
        .filter(Boolean)
        .join(" ")
    : "";

  if (staff?.role === "admin") return <AdminProfile user={staff} />;

  return (
    <div className="staff-profile mt-4 mb-5">
      {/* Alert component */}
      {alertMessage && (
        <Alert
          message={alertMessage}
          type={alertType}
          onClose={() => setAlertMessage("")}
        />
      )}

      <div className="mb-4">
        <h1 className="text-xl font-semibold">
          <span
            className="me-2"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/admin/accounts")}
          >
            <i className="bi bi-arrow-left"></i>
          </span>
          STAFF PROFILE
        </h1>
      </div>

      {/* Basic Info / Actions */}
      <div className="staff-profile d-flex align-items-center border mb-4">
        {/* Profile Image Container */}
        <div className="profile-img-wrapper">
          <div className="profile-img-circle">
            {staff?.profile_image_url ? (
              <img src={staff.profile_image_url} alt="Profile" />
            ) : (
              <i className="bi bi-person-fill text-secondary"></i>
            )}
          </div>
        </div>

        {/* Name and Title Section */}
        <div className="profile-info-content">
          <h4 className="profile-name">
            {loadingStaff ? (
              <div className="account-skeleton-text"></div>
            ) : (
              fullName
            )}
          </h4>
          <p className="profile-role">Staff</p>
        </div>

        {/* Action Links aligned to the right-bottom */}
        <div className="profile-actions ms-auto align-self-end pb-2">
          <span className="action-link" onClick={() => setShowModal(true)}>
            Edit Account
          </span>
          <span className="action-divider">|</span>
          <span className="action-link" onClick={() => setShowResetModal(true)}>
            Reset Password
          </span>
          <span className="action-divider">|</span>
          <span
            className="action-link"
            onClick={() =>
              staff?.status === "Active"
                ? setShowDeactivateModal(true)
                : setShowActivateModal(true)
            }
          >
            {staff?.status === "Deactivated"
              ? "Reactivate Account"
              : "Deactivate Account"}
          </span>
          <span className="action-divider">|</span>
          <span
            className="action-link"
            onClick={() => setShowPromoteModal(true)}
          >
            Promote
          </span>
        </div>
      </div>

      {/* Personal Information */}
      <div className="staff-profile border mb-4 p-3">
        <h2 className="mb-3">Personal Information</h2>
        {loadingStaff ? (
          <LoadingSpinner message="Loading personal info..." />
        ) : (
          <div className="personal-grid mb-3">
            <div className="grid-item">
              <div className="label">First Name</div>
              <div className="value">{staff?.first_name || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Middle Name</div>
              <div className="value">{staff?.middle_name || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Last Name</div>
              <div className="value">{staff?.last_name || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Suffix</div>
              <div className="value">{staff?.suffix || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Email</div>
              <div className="value">{staff?.email || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Phone Number</div>
              <div className="value">{staff?.phone_number || "N/A"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Account Information */}
      <div className="staff-profile border mb-4 p-3">
        <h2 className="mb-4">Account Information</h2>
        {loadingStaff ? (
          <LoadingSpinner message="Loading personal info..." />
        ) : (
          <div className="personal-grid">
            <div className="grid-item">
              <div className="label">Date Registered</div>
              <div className="value">
                {staff?.created_at
                  ? new Date(staff.created_at).toISOString().split("T")[0]
                  : "N/A"}
              </div>
            </div>
            <div className="grid-item">
              <div className="label">Registered By</div>
              <div className="value">{staff?.registered_by || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Last Login</div>
              <div className="value">
                {staff?.last_login_at
                  ? new Date(staff.last_login_at).toISOString().split("T")[0]
                  : "N/A"}
              </div>
            </div>
            <div className="grid-item">
              <div className="label">Status</div>
              <div className="value">
                <span className={`status-pill status-${staff?.status}`}>
                  {staff?.status || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Logs */}
      <div className="staff-profile border mt-4 p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="mb-0">Activity Log</h2>
            <p className="mb-3">
              <i>Chronological list of tasks and changes made by the user.</i>
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

            {/* Filter */}
            <div className="position-relative" ref={filterRef}>
              <button
                className="btn btn-outline-secondary d-flex align-items-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterMenuOpen(!filterMenuOpen);
                  setActiveFilter(null);
                }}
              >
                <i className="bi bi-sliders me-2"></i> Filter
              </button>

              {filterMenuOpen && (
                <div
                  className="dropdown-menu show"
                  style={{ position: "absolute", zIndex: 9999 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="dropdown-item"
                    onClick={() =>
                      setActiveFilter(activeFilter === "name" ? null : "name")
                    }
                  >
                    Name
                  </button>
                  {activeFilter === "name" && (
                    <div className="ms-3">
                      <button
                        className="dropdown-item"
                        onClick={() => setSortOption("name_asc")}
                      >
                        <i className="bi bi-sort-alpha-down"></i> Asc
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => setSortOption("name_desc")}
                      >
                        <i className="bi bi-sort-alpha-up"></i> Desc
                      </button>
                    </div>
                  )}
                  <button
                    className="dropdown-item"
                    onClick={() =>
                      setActiveFilter(activeFilter === "date" ? null : "date")
                    }
                  >
                    Date
                  </button>
                  {activeFilter === "date" && (
                    <div className="ms-3">
                      <button
                        className="dropdown-item"
                        onClick={() => setSortOption("date_asc")}
                      >
                        <i className="bi bi-sort-numeric-down"></i> Asc
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => setSortOption("date_desc")}
                      >
                        <i className="bi bi-sort-numeric-down"></i> Desc
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {loadingLogs ? (
          <LoadingSpinner message="Loading activity logs..." />
        ) : activityLogs.length > 0 ? (
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Date & Time</th>
                <th style={{ width: "30%" }}>Activity</th>
                <th style={{ width: "50%" }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="fw-semibold text-dark">
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <small className="text-muted">
                      <i
                        className="bi bi-clock me-1"
                        style={{ fontSize: "0.75rem" }}
                      ></i>
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </td>
                  <td>
                    <div className="fw-semibold text-dark">{log.action}</div>
                    <small
                      className="text-muted text-uppercase"
                      style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}
                    >
                      <i className="bi bi-layers me-1"></i>
                      {log.module}
                    </small>
                  </td>
                  <td>{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No activities yet.</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="mb-0">EDIT ACCOUNT</h2>
            <p>
              <i>Update the staff information below.</i>
            </p>
            <hr />

            <form onSubmit={handleSubmit}>
              <div
                className="modal-flex-container"
                style={{ display: "flex", gap: "30px" }}
              >
                {/* LEFT SIDE: Image Preview & Upload */}
                <div
                  className="profile-upload-section"
                  style={{ flex: "0 0 150px", textAlign: "center" }}
                >
                  <div className="image-preview-circle">
                    {formData.profile_image instanceof File ? (
                      <img
                        src={URL.createObjectURL(formData.profile_image)}
                        alt="New Preview"
                      />
                    ) : staff?.profile_image_url ? (
                      <img
                        src={staff.profile_image_url}
                        alt="Current Profile"
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
                    {staff?.profile_image_url ? "Change Photo" : "Choose Photo"}
                  </label>
                  <small
                    style={{
                      marginTop: "8px",
                      color: "#888",
                      display: "block",
                      fontSize: "0.75rem",
                    }}
                  >
                    JPG or PNG, Max 5MB
                  </small>
                </div>

                {/* RIGHT SIDE: Input Fields */}
                <div className="form-fields-section" style={{ flex: 1 }}>
                  {/* Role (Read-only for Edit) */}
                  <div className="name-row mb-3">
                    <label className="row-label">Role</label>
                    <div className="role-selection-container">
                      <button
                        type="button"
                        className={`role-btn ${
                          formData.role === "staff" ? "active" : ""
                        }`}
                        disabled
                      >
                        STAFF
                      </button>
                      <button
                        type="button"
                        className={`role-btn ${
                          formData.role === "admin" ? "active" : ""
                        }`}
                        disabled
                      >
                        ADMIN
                      </button>
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="name-row mb-1">
                    <label className="row-label">Full Name</label>
                    <div className="inputs grid-inputs">
                      <input
                        type="text"
                        placeholder="First"
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
                        placeholder="Middle"
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
                        placeholder="Last"
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
                          setFormData({ ...formData, suffix: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Contact */}
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

                  {/* Email (Usually disabled on Edit) */}
                  <div className="name-row mb-1">
                    <label className="row-label">Email</label>
                    <input
                      type="text"
                      value={formData.email}
                      disabled
                      style={{
                        backgroundColor: "#f0f0f0",
                        cursor: "not-allowed",
                      }}
                    />
                  </div>

                  {/* Password (Placeholder for Edit) */}
                  <div className="name-row mb-1">
                    <label className="row-label">Password</label>
                    <div className="input-group-stack">
                      <input
                        type="text"
                        value="********"
                        disabled
                        className="disabled-input mb-0"
                      />
                      <small className="helper-text mx-2">
                        Use 'Reset Password' action to change.
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
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

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Reset Password</h2>
            <p>
              <i>
                Enter your current password first, then type a new password
                below.
              </i>
            </p>
            <hr />
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                {/* Current Password */}
                <div className="password-input-wrapper">
                  <label className="password-label">Current Password</label>
                  <input
                    type="text"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="off"
                  />
                  {isCurrentPasswordValid !== null && (
                    <i
                      className={`validation-icon bi ${
                        isCurrentPasswordValid
                          ? "bi-check-circle text-success"
                          : "bi-x-circle text-danger"
                      }`}
                    ></i>
                  )}
                </div>

                {/* New Password */}
                <div className="password-input-wrapper">
                  <label className="password-label">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  {loading && <span className="spinner-tiny"></span>}
                  {loading ? "Saving..." : "Save New Password"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATION MODAL */}
      {showDeactivateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Confirm Deactivation</h2>
            <p>
              Are you sure you want to deactivate <strong>{fullName}</strong>?
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-danger"
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating && <span className="spinner-tiny"></span>}
                {deactivating ? "Deactivating..." : "Deactivate"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {showActivateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Reactivate Staff</h2>
            <p>Are you sure you want to reactivate this staff?</p>
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                onClick={handleActivate}
                disabled={activating}
              >
                {activating && <span className="spinner-tiny"></span>}
                {activating ? "Reactivating..." : "Yes, Reactivate"}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowActivateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Confirmation Modal */}
      {showPromoteModal && staff && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Confirm Promotion</h2>
            <p>
              Are you sure you want to promote{" "}
              <strong>
                {staff.first_name} {staff.last_name}
              </strong>{" "}
              to admin?
            </p>
            <div className="form-actions">
              <button
                type="submit"
                className="submit-btn"
                onClick={async () => {
                  await promoteStaff(staff.id);
                  setShowPromoteModal(false);
                }}
              >
                {loading && <span className="spinner-tiny"></span>}
                {loading ? "Promoting..." : "Promote"}
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowPromoteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;
