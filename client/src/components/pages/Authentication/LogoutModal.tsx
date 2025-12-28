import React from "react";
import { useNavigate } from "react-router-dom";

interface LogoutModalProps {
  onClose: () => void;
  onConfirm?: () => void; 
}

const LogoutModal: React.FC<LogoutModalProps> = ({ onClose }) => {
  const navigate = useNavigate();

  const handleConfirmLogout = () => {
    // Clear auth token
    localStorage.removeItem("authToken");

    // Close modal
    onClose();

    // Redirect to RoleSelection
    navigate("/");
  };

  return (
    <div
      className="logout-overlay"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        zIndex: 1050,
      }}
    >
      <div
        className="logout-modal text-center"
        style={{
          maxWidth: "90vw",
          width: "320px",
          margin: "auto",
          padding: "1rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          borderRadius: "8px",
          backgroundColor: "white",
          position: "relative",
        }}
      >
        <h5 className="mb-3 mt-4">Are you sure you want to log out?</h5>
        <button
          className="logout-button btn btn-danger w-100 mb-2"
          onClick={handleConfirmLogout}
          style={{ fontSize: "1rem", padding: "0.5rem" }}
        >
          <i className="bi bi-box-arrow-right me-2 mr-2"></i>Log Out
        </button>
        <button
          className="btn btn-secondary w-100"
          onClick={onClose}
          style={{ fontSize: "1rem", padding: "0.5rem" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default LogoutModal;
