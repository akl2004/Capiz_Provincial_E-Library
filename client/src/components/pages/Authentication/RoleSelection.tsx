import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./LoginModal";

const roles = [
  { name: "Guest", image: "./src/assets/orange-icons/guest.png" },
  { name: "User", image: "./src/assets/orange-icons/staff.png" },
];

const RoleSelection: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login";
  }, []);

  const handleLoginSuccess = (user: {
    name: string;
    avatar: string;
    role: string;
  }) => {
    localStorage.setItem("role", user.role.toLowerCase());
    localStorage.setItem("userName", user.name);

    const role = user.role.toLowerCase();

    if (role === "admin") {
      navigate("/admin/admindashboard"); 
    } else if (role === "staff") {
      navigate("/staff/staffdashboard"); 
    } else {
      navigate("/");
    }
  };

  const handleRoleClick = (roleName: string) => {
    if (roleName === "Guest") {
      navigate("/guest/guestdashboard");
    } else {
      setIsLoginModalOpen(true);
    }
  };

  return (
    <div className="background">
      <div className="login-container">
        <div className="branding">
          <h1 className="brand-title">CAPIZ PROVINCIAL E-LIBRARY SYSTEM</h1>
        </div>

        <div className="role-selection">
          {roles.map((role) => (
            <div
              key={role.name}
              className="role-card"
              onClick={() => handleRoleClick(role.name)}
            >
              <img src={role.image} alt={role.name} className="role-image" />
              <div className="role-divider"></div>
              <h5 className="role-name">{role.name}</h5>
            </div>
          ))}
        </div>

        {isLoginModalOpen && (
          <LoginModal
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default RoleSelection;
