import { Link, useLocation } from "react-router-dom";
import elibIcon from "../../../assets/cpl_logo.png";

// Gray Icons
import dashboardIcon from "../../../assets/gray-icons/dashboard.png";
import patronIcon from "../../../assets/gray-icons/patron.png";
import catalogingIcon from "../../../assets/gray-icons/cataloging.png";
import accessionIcon from "../../../assets/gray-icons/accession.png";
import circulationIcon from "../../../assets/gray-icons/circulation.png";
import attendanceIcon from "../../../assets/gray-icons/attendance.png";
import reportsIcon from "../../../assets/gray-icons/reports.png";
import accountsIcon from "../../../assets/gray-icons/accounts.png";
import settingsIcon from "../../../assets/gray-icons/settings.png";

// Active (White) Icons
import dashboardIconActive from "../../../assets/white-icons/dashboard.png";
import patronIconActive from "../../../assets/white-icons/patron.png";
import catalogingIconActive from "../../../assets/white-icons/cataloging.png";
import accessionIconActive from "../../../assets/white-icons/accession.png";
import circulationIconActive from "../../../assets/white-icons/circulation.png";
import attendanceIconActive from "../../../assets/white-icons/attendance.png";
import reportsIconActive from "../../../assets/white-icons/reports.png";
import accountsIconActive from "../../../assets/white-icons/accounts.png";
import settingsIconActive from "../../../assets/white-icons/settings.png";

const Sidebar = () => {
  const location = useLocation();

  // Get the role from localStorage (fallback to 'staff' if null)
  const userRole = localStorage.getItem("role")?.toLowerCase() || "staff";

  // Determine the prefix (admin or staff)
  const prefix = userRole === "admin" ? "admin" : "staff";

  const mainNavItems = [
    {
      name: "Dashboard",
      path: `/${prefix}/${prefix}dashboard`,
      icon: dashboardIcon,
      activeIcon: dashboardIconActive,
    },
    {
      name: "Patron",
      path: `/${prefix}/patrons`,
      icon: patronIcon,
      activeIcon: patronIconActive,
    },
    {
      name: "Cataloging",
      path: `/${prefix}/cataloging`,
      icon: catalogingIcon,
      activeIcon: catalogingIconActive,
    },
    {
      name: "Accession",
      path: `/${prefix}/accession`,
      icon: accessionIcon,
      activeIcon: accessionIconActive,
    },
    {
      name: "Circulation",
      path: `/${prefix}/circulation`,
      icon: circulationIcon,
      activeIcon: circulationIconActive,
    },
    {
      name: "Attendance",
      path: `/${prefix}/attendance`,
      icon: attendanceIcon,
      activeIcon: attendanceIconActive,
    },
    {
      name: "Reports",
      path: `/${prefix}/reports`,
      icon: reportsIcon,
      activeIcon: reportsIconActive,
    },
  ];

  const adminOnlyItems = [
    {
      name: "Accounts",
      path: `/${prefix}/accounts`,
      icon: accountsIcon,
      activeIcon: accountsIconActive,
    },
    {
      name: "Settings",
      path: `/${prefix}/settings`,
      icon: settingsIcon,
      activeIcon: settingsIconActive,
    },
  ];

  // Helper to render links to keep the code clean
  const renderNavLink = (item: any) => (
    <Link
      key={item.name}
      to={item.path}
      className={`nav-link mb-1 ${
        location.pathname === item.path
          ? "active text-white fw-bold"
          : "text-gray-300"
      }`}
      style={{ fontSize: "1.1rem", transition: "all 0.2s ease-in-out" }}
    >
      <img
        src={location.pathname === item.path ? item.activeIcon : item.icon}
        alt={item.name}
        style={{ width: "22px", height: "22px", marginRight: "10px" }}
      />
      <span className="flex-grow-1">{item.name}</span>
    </Link>
  );

  return (
    <div className="p-3 w-64 d-flex flex-column" style={{ height: "100vh" }}>
      <h2 className="fs-4 fw-bold mb-0">
        <img className="mx-2" src={elibIcon} alt="" height={40} width={40} />
        CAPIZ E-LIB
      </h2>

      {/* Main Nav Items (Shown to everyone) */}
      <ul className="nav flex-column fs-5 mx-3 flex-grow-1 mt-4">
        {mainNavItems.map(renderNavLink)}
      </ul>

      {/* Admin-Only Section */}
      {userRole === "admin" && (
        <>
          <hr />
          <ul className="nav flex-column fs-5 mx-3 mt-auto">
            {adminOnlyItems.map(renderNavLink)}
          </ul>
        </>
      )}
    </div>
  );
};

export default Sidebar;
