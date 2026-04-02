import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import AxiosInstance from "../../../AxiosInstance";
import icon from "../../../assets/lib-logo.png";

interface AppLayoutProps {
  content?: React.ReactNode;
}

const AppLayout = ({ content }: AppLayoutProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    first_name: "Guest",
    middle_name: null,
    last_name: "",
    suffix: null,
    avatar: icon,
    role: "guest",
    name: "Guest",
  });

  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    // If no token, redirect to login (Security Guard)
    if (!token) {
      navigate("/");
      return;
    }

    AxiosInstance.get("/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setUser({
          first_name: res.data.first_name || "Guest",
          middle_name: res.data.middle_name || null,
          last_name: res.data.last_name || "",
          suffix: res.data.suffix || null,
          avatar: res.data.avatar || icon,
          role: res.data.role || "guest",
          name: res.data.name || `${res.data.first_name} ${res.data.last_name}`,
        });

        localStorage.setItem("role", res.data.role.toLowerCase());
      })
      .catch((err) => {
        console.error("Failed to fetch user info", err);
        localStorage.removeItem("authToken");
        navigate("/");
      })
      .finally(() => setIsUserLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <Sidebar />
      </div>

      <div className="admin-main">
        <Header
          isUserLoading={isUserLoading}
          user={user}
          onLogout={handleLogout}
        />

        <main className="admin-content">{content ? content : <Outlet />}</main>
      </div>
    </div>
  );
};

export default AppLayout;
