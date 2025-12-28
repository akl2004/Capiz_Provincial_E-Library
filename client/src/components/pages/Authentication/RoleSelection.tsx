import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginModal from "./LoginModal";

const roles = [
  { name: "Guest", image: "./src/assets/orange-icons/guest.png" },
  { name: "Staff", image: "./src/assets/orange-icons/staff.png" },
  { name: "Admin", image: "./src/assets/orange-icons/admin.png" },
];

const RoleSelection: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login";
  }, []);

  const [loggedInUser, setLoggedInUser] = useState<{
    name: string;
    avatar: string;
    role: string;
  } | null>(null);

  const handleLoginSuccess = (user: {
    name: string;
    avatar: string;
    role: string;
  }) => {
    // store role in localStorage
    localStorage.setItem("role", user.role.toLowerCase());

    setLoggedInUser(user);

    if (user.role.toLowerCase() === "staff") {
      navigate("/staff/staffdashboard");
    } else if (user.role.toLowerCase() === "admin") {
      navigate("/admin/admindashboard");
    } else if (user.role.toLowerCase() === "guest") {
      navigate("/guest/guestdashboard");
    }
  };

  const handleRoleClick = (role: string) => {
    if (role === "Guest") {
      navigate("/guest/guestdashboard");
    } else {
      setSelectedRole(role);
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

        {selectedRole && (
          <LoginModal
            role={selectedRole} // lowercase role
            onClose={() => setSelectedRole(null)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default RoleSelection;
