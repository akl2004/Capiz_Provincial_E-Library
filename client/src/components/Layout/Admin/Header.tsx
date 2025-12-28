import { useState } from "react";
import LogoutModal from "../../pages/Authentication/LogoutModal";
import { useNavigate, useLocation, Link } from "react-router-dom";

interface HeaderProps {
  user: {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    avatar: string;
    role: string;
    name?: string | null;
  };
  onLogout: () => void;
  isUserLoading?: boolean;
}

const Header = ({ user, onLogout, isUserLoading = false }: HeaderProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark", !darkMode);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setDropdownOpen(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
    navigate("/");
  };

  const pathnames = location.pathname.split("/").filter((x) => x);

  // Breadcrumb labels: remove 'admin' and 'guest' only for display
  const breadcrumbPathnames = pathnames.filter(
    (x) => x !== "admin" && x !== "guest" && x !== "staff"
  );

  const breadcrumbNameMap: Record<string, string> = {
    admindashboard: "Dashboard",
    staffdashboard: "Dashboard",
    patrons: "Patrons",
    cataloging: "Cataloging",
    accession: "Accession",
    circulation: "Circulation",
    attendance: "Attendance",
    dailyattendance: "Daily Attendance",
    reports: "Reports",
    settings: "Settings",
    transactions: "Transactions",
    addbook: "Add Book",
    copies: "Copy Information",
    issue: "Issue Form",
    "loan-days": "Loan Days",
    "expiration-years": "Expiration Years",
    "fine-per-day": "Fine per Day",
    "renewal-limit": "Renewal Limit",
  };

  const getDynamicLabel = (parent: string) => {
    switch (parent) {
      case "patrons":
        return "Patron Record";
      case "cataloging":
        return "Book Details";
      default:
        return "Details";
    }
  };

  return (
    <header className="admin-header d-flex justify-content-between align-items-center">
      {/* LEFT: Breadcrumbs */}
      <div>
        <style>
          {`
            .breadcrumb-item + .breadcrumb-item::before {
              content: ">";
            }
          `}
        </style>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb m-0">
            {breadcrumbPathnames.map((value, index) => {
              // Find original index in pathnames
              const originalIndex = pathnames.indexOf(value);
              const to = "/" + pathnames.slice(0, originalIndex + 1).join("/");

              const isLast = index === breadcrumbPathnames.length - 1;
              const isId = !isNaN(Number(value));

              let label = "";
              if (isId) {
                const parent = breadcrumbPathnames[index - 1];
                label = getDynamicLabel(parent);
              } else {
                label =
                  breadcrumbNameMap[value] ||
                  value.charAt(0).toUpperCase() + value.slice(1);
              }

              return (
                <li
                  key={to}
                  className={`breadcrumb-item ${
                    isLast ? "active fw-bold" : ""
                  }`}
                >
                  {isLast ? (
                    label
                  ) : (
                    <Link to={to} className="breadcrumb-link">
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* RIGHT: User Controls */}
      <div className="d-flex align-items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="btn btn-sm btn-outline-secondary"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        <div className="dropdown">
          <button
            className="btn d-flex align-items-center"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <img
              src={user.avatar || "./src/assets/lib-logo.png"}
              alt="avatar"
              className="rounded-circle me-2"
              style={{ width: "32px", height: "32px" }}
            />
            {isUserLoading ? (
              <span
                style={{
                  width: "150px",
                  height: "24px",
                  background: "#e0e0e0",
                  borderRadius: "4px",
                  animation: "pulse 1.5s infinite",
                }}
              >
              </span>
            ) : (
              <span>{user.name || "Guest"}</span>
            )}
          </button>

          {dropdownOpen && (
            <div
              className="dropdown-menu dropdown-menu-end show"
              style={{ position: "absolute" }}
            >
              <button className="dropdown-item" onClick={handleLogoutClick}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {showLogoutModal && (
        <LogoutModal
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </header>
  );
};

export default Header;
