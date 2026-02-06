import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AxiosInstance from "../../../AxiosInstance";
import LoadingSpinner from "../../LoadingSpinner";
import Alert from "../../Alert";

interface Admin {
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

interface AdminProfileProps {
  user?: Admin;
}

const AdminProfile: React.FC<AdminProfileProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const [admin, setAdmin] = useState<Admin | undefined>(user);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    phone: "",
    email: "",
    password: "",
    role: "admin",
    profile_image: null as File | null,
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

  // Fetch Admin Details
  useEffect(() => {
    document.title = "Admin Profile";
    const fetchAdmin = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No auth token found");

        const res = await AxiosInstance.get(`/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdmin(res.data);
      } catch (err) {
        console.error("Error fetching admin:", err);
      } finally {
        setLoadingAdmin(false);
      }
    };
    fetchAdmin();
  }, [id]);

  // Editing admin info
  useEffect(() => {
    if (showModal && admin) {
      setFormData({
        first_name: admin.first_name,
        middle_name: admin.middle_name || "",
        last_name: admin.last_name,
        suffix: admin.suffix || "",
        phone: admin.phone_number || "",
        email: admin.email,
        password: "",
        role: "admin",
        profile_image: null,
      });
    }
  }, [showModal, admin]);

  // Handle admin update form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const data = new FormData();
      data.append("_method", "PUT");
      data.append("first_name", formData.first_name);
      data.append("middle_name", formData.middle_name || "");
      data.append("last_name", formData.last_name);
      data.append("suffix", formData.suffix || "");
      data.append("phone_number", formData.phone || "");

      if (formData.profile_image) {
        data.append("profile_image", formData.profile_image);
      }

      await AxiosInstance.post(`/users/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setShowModal(false);

      // Refresh admin details
      setLoadingAdmin(true);
      const res = await AxiosInstance.get(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmin(res.data);

      // Success alert
      setAlertMessage("Admin updated successfully!");
      setAlertType("success");
    } catch (err) {
      console.error("Error updating admin:", err);
      setAlertMessage("Failed to update admin. Check console for errors.");
      setAlertType("error");
    } finally {
      setLoadingAdmin(false);
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


  const handleDeactivate = async () => {
    if (!admin) return;
    setDeactivating(true);
    try {
      await AxiosInstance.patch(`/users/${admin.id}/deactivate`);
      setShowDeactivateModal(false);

      const updated = await AxiosInstance.get(`/users/${admin.id}`);
      setAdmin(updated.data);

      setAlertMessage("Admin has been deactivated successfully!");
      setAlertType("success");
    } catch (error) {
      console.error("Error deactivating admin:", error);
      setAlertMessage("Failed to deactivate admin.");
      setAlertType("error");
    } finally {
      setDeactivating(false);
    }
  };

  const handleActivate = async () => {
    if (!admin) return;
    setActivating(true);
    try {
      await AxiosInstance.patch(`/users/${admin.id}/activate`);
      setShowActivateModal(false);

      const updated = await AxiosInstance.get(`/users/${admin.id}`);
      setAdmin(updated.data);

      setAlertMessage("Admin has been reactivated successfully!");
      setAlertType("success");
    } catch (error) {
      console.error("Error activating admin:", error);
      setAlertMessage("Failed to reactivate admin.");
      setAlertType("error");
    } finally {
      setActivating(false);
    }
  };

  // Fetch Activity Logs for this specific admin
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

  const fullName = admin
    ? [admin.first_name, admin.middle_name, admin.last_name, admin.suffix]
        .filter(Boolean)
        .join(" ")
    : "";

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
          ADMIN PROFILE
        </h1>
      </div>

      {/* Basic Info / Actions */}
      <div className="staff-profile d-flex align-items-center border mb-4">
        {/* Profile Image Container */}
        <div className="profile-img-wrapper">
          <div className="profile-img-circle">
            {admin?.profile_image_url ? (
              <img src={admin.profile_image_url} alt="Profile" />
            ) : (
              <i className="bi bi-person-fill text-secondary"></i>
            )}
          </div>
        </div>

        {/* Name and Title Section */}
        <div className="profile-info-content">
          <h4 className="profile-name">
            {loadingAdmin ? (
              <div className="account-skeleton-text"></div>
            ) : (
              fullName
            )}
          </h4>
          <p className="profile-role">Admin</p>
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
            className="action-link deactivate-link"
            onClick={() =>
              admin?.status === "Active"
                ? setShowDeactivateModal(true)
                : setShowActivateModal(true)
            }
          >
            {admin?.status === "Deactivated"
              ? "Reactivate Account"
              : "Deactivate Account"}
          </span>
        </div>
      </div>

      {/* Personal Information */}
      <div className="staff-profile border mb-4 p-3">
        <h2 className="mb-3">Personal Information</h2>
        {loadingAdmin ? (
          <LoadingSpinner message="Loading personal info..." />
        ) : (
          <div className="personal-grid mb-3">
            <div className="grid-item">
              <div className="label">First Name</div>
              <div className="value">{admin?.first_name || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Middle Name</div>
              <div className="value">{admin?.middle_name || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Last Name</div>
              <div className="value">{admin?.last_name || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Suffix</div>
              <div className="value">{admin?.suffix || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Email</div>
              <div className="value">{admin?.email || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Phone Number</div>
              <div className="value">{admin?.phone_number || "N/A"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Account Information */}
      <div className="staff-profile border mb-4 p-3">
        <h2 className="mb-4">Account Information</h2>
        {loadingAdmin ? (
          <LoadingSpinner message="Loading personal info..." />
        ) : (
          <div className="personal-grid">
            <div className="grid-item">
              <div className="label">Date Registered</div>
              <div className="value">
                {admin?.created_at
                  ? new Date(admin.created_at).toISOString().split("T")[0]
                  : "N/A"}
              </div>
            </div>
            <div className="grid-item">
              <div className="label">Registered By</div>
              <div className="value">{admin?.registered_by || "N/A"}</div>
            </div>
            <div className="grid-item">
              <div className="label">Last Login</div>
              <div className="value">
                {admin?.last_login_at
                  ? new Date(admin.last_login_at).toISOString().split("T")[0]
                  : "N/A"}
              </div>
            </div>
            <div className="grid-item">
              <div className="label">Status</div>
              <div className="value">
                <span className={`status-pill status-${admin?.status}`}>
                  {admin?.status || "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Logs */}
      <div className="staff-profile border mt-4 p-3">
        <h2 className="mb-3">Activity Log</h2>
        {loadingLogs ? (
          <LoadingSpinner message="Loading activity logs..." />
        ) : activityLogs.length > 0 ? (
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: "160px" }}>Date & Time</th>
                <th style={{ width: "200px" }}>Activity</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
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
              <i>Update the admin information below.</i>
            </p>
            <hr />

            <form onSubmit={handleSubmit}>
              <div className="modal-flex-container">
                {/* LEFT SIDE: Image Preview & Upload */}
                <div className="profile-upload-section">
                  <div className="image-preview-circle">
                    {formData.profile_image ? (
                      <img
                        src={URL.createObjectURL(formData.profile_image)}
                        alt="Preview"
                      />
                    ) : admin?.profile_image_url ? (
                      <img src={admin.profile_image_url} alt="Current" />
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
                    Change Photo
                  </label>
                  <small className="upload-hint">JPG or PNG, Max 5MB</small>
                </div>

                {/* RIGHT SIDE: Input Fields */}
                <div className="form-fields-section">
                  <div className="name-row mb-3">
                    <label className="row-label">Role</label>
                    <div className="role-selection-container">
                      <button
                        type="button"
                        className="role-btn active"
                        disabled
                      >
                        ADMIN
                      </button>
                      <button type="button" className="role-btn" disabled>
                        STAFF
                      </button>
                    </div>
                  </div>

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

                  <div className="name-row mb-1">
                    <label className="row-label">Contact</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div className="name-row mb-1">
                    <label className="row-label">Email</label>
                    <input
                      type="text"
                      value={formData.email}
                      disabled
                      className="disabled-field"
                    />
                  </div>

                  {/* PASSWORD SECTION WITH CSS STACKING */}
                  <div className="name-row mb-1">
                    <label className="row-label">Password</label>
                    <div className="input-group-stack">
                      <input
                        type="text"
                        value="********"
                        disabled
                        className="disabled-field"
                      />
                      <small className="helper-text">
                        Use 'Reset Password' action to change.
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions mt-4">
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

      {/* Reset Password Modal */}
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
            <h2>Reactivate Admin</h2>
            <p>Are you sure you want to reactivate this admin?</p>
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
    </div>
  );
};

export default AdminProfile;
