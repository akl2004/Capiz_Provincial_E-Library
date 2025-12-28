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
      });
    }
  }, [showModal, admin]);

  // Handle admin update form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No auth token found");

      const payload: { [key: string]: any } = {
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        suffix: formData.suffix || null,
        phone_number: formData.phone || null,
        role: formData.role,
      };

      await AxiosInstance.put(`/users/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
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
    if (!admin) return;
    setDeactivating(true);
    try {
      await AxiosInstance.patch(`/users/${admin.id}/deactivate`);
      setShowDeactivateModal(false);

      // Refresh admin data
      const updated = await AxiosInstance.get(`/users/${admin.id}`);
      setAdmin(updated.data);

      // Success alert
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

  // reactivate admin
  const handleActivate = async () => {
    if (!admin) return;
    setActivating(true);
    try {
      await AxiosInstance.patch(`/users/${admin.id}/activate`);
      setShowActivateModal(false);

      // Refresh admin data
      const updated = await AxiosInstance.get(`/users/${admin.id}`);
      setAdmin(updated.data);

      // Success alert
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
      <div className="staff-profile d-flex justify-content-between align-items-center border p-3 mb-4">
        <div>
          <h4 className="mb-0">
            {loadingAdmin ? (
              <div
                style={{
                  width: "250px",
                  height: "34px",
                  background: "#e0e0e0",
                  borderRadius: "4px",
                  animation: "pulse 1.5s infinite",
                }}
              ></div>
            ) : (
              <u>{fullName}</u>
            )}
          </h4>
          <small className="text-muted">Admin</small>
        </div>
        <div className="patron-actions">
          <span
            className="action-link"
            style={{ cursor: "pointer" }}
            onClick={() => setShowModal(true)}
          >
            Edit Account
          </span>
          {" | "}
          <span
            className="action-link"
            style={{ cursor: "pointer" }}
            onClick={() => setShowResetModal(true)}
          >
            Reset Password
          </span>
          {" | "}
          <span
            className="action-link"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (admin?.status === "Active") {
                setShowDeactivateModal(true);
              } else {
                setShowActivateModal(true);
              }
            }}
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
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Role</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.role}</td>
                  <td>{log.module}</td>
                  <td>{log.action}</td>
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
              <div className="modal-body">
                {/* Role (buttons disabled) */}
                <div className="name-row">
                  <label className="row-label">Role</label>
                  <div className="role-selection-container text-center">
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

                {/* Full Name */}
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
                      value={formData.last_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          last_name: e.target.value,
                        })
                      }
                      required
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

                {/* Phone Number */}
                <div className="name-row mb-1">
                  <label className="row-label">Number</label>
                  <input
                    type="text"
                    placeholder="Number"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Email (read-only) */}
                <div className="inline-row mb-1" style={{ gap: "30px" }}>
                  <div className="inline-row inline-grow">
                    <label className="inline-label">Email</label>
                    <input
                      type="email"
                      placeholder="email"
                      style={{ width: "240px" }}
                      value={formData.email}
                      disabled
                    />
                  </div>

                  {/* Password (masked / read-only) */}
                  <div className="inline-row inline-grow">
                    <label className="inline-label">Password</label>
                    <input
                      type="text"
                      placeholder="password"
                      style={{ width: "240px" }}
                      value="********"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading && <span className="spinner-tiny"></span>}
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
