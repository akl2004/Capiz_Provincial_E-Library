import { Link, useLocation } from "react-router-dom";
import dashboardIcon from "../../../assets/gray-icons/dashboard.png";
import patronIcon from "../../../assets/gray-icons/patron.png";
import catalogingIcon from "../../../assets/gray-icons/cataloging.png";
import accessionIcon from "../../../assets/gray-icons/accession.png";
import circulationIcon from "../../../assets/gray-icons/circulation.png";
import attendanceIcon from "../../../assets/gray-icons/attendance.png";
import reportsIcon from "../../../assets/gray-icons/reports.png";
import accountsIcon from "../../../assets/gray-icons/accounts.png";
import settingsIcon from "../../../assets/gray-icons/settings.png";

import elibIcon from "../../../assets/cpl_logo.png";

import dashboardIconActive from "../../../assets/white-icons/dashboard.png";
import patronIconActive from "../../../assets/white-icons/patron.png";
import catalogingIconActive from "../../../assets/white-icons/cataloging.png";
import accessionIconActive from "../../../assets/white-icons/accession.png";
import circulationIconActive from "../../../assets/white-icons/circulation.png";
import attendanceIconActive from "../../../assets/white-icons/attendance.png";
import reportsIconActive from "../../../assets/white-icons/reports.png";
import accountsIconActive from "../../../assets/white-icons/accounts.png";
import settingsIconActive from "../../../assets/white-icons/settings.png";

const AdminSidebar = () => {
  const location = useLocation();

  const mainNavItems = [
    {
      name: "Dashboard",
      path: "/admin/admindashboard",
      icon: dashboardIcon,
      activeIcon: dashboardIconActive,
    },
    {
      name: "Patron",
      path: "/admin/patrons",
      icon: patronIcon,
      activeIcon: patronIconActive,
    },
    {
      name: "Cataloging",
      path: "/admin/cataloging",
      icon: catalogingIcon,
      activeIcon: catalogingIconActive,
    },
    {
      name: "Accession",
      path: "/admin/accession",
      icon: accessionIcon,
      activeIcon: accessionIconActive,
    },
    {
      name: "Circulation",
      path: "/admin/circulation",
      icon: circulationIcon,
      activeIcon: circulationIconActive,
    },
    {
      name: "Attendance",
      path: "/admin/attendance",
      icon: attendanceIcon,
      activeIcon: attendanceIconActive,
    },
    {
      name: "Reports",
      path: "/admin/reports",
      icon: reportsIcon,
      activeIcon: reportsIconActive,
    },
  ];

  const bottomNavItems = [
    {
      name: "Accounts",
      path: "/admin/accounts",
      icon: accountsIcon,
      activeIcon: accountsIconActive,
    },
    {
      name: "Settings",
      path: "/admin/settings",
      icon: settingsIcon,
      activeIcon: settingsIconActive,
    },
  ];

  return (
    <div className="p-3 w-64 d-flex flex-column" style={{ height: "100vh" }}>
      {/* Logo */}
      <h2 className="fs-4 fw-bold mb-0">
        <img className="mx-2" src={elibIcon} alt="" height={40} width={40} />
        CAPIZ E-LIB
      </h2>

      {/* Main nav */}
      <ul className="nav flex-column fs-5 mx-3 flex-grow-1">
        {mainNavItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-link mb-1 ${
              location.pathname === item.path
                ? "active text-white fw-bold"
                : "text-gray-300"
            }`}
            style={{
              fontSize: "1.1rem",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <img
              src={
                location.pathname === item.path ? item.activeIcon : item.icon
              }
              alt={item.name}
              style={{ width: "22px", height: "22px", marginRight: "10px" }}
            />
            <span className="flex-grow-1">{item.name}</span>
          </Link>
        ))}
      </ul>

      {/* Bottom nav (Settings & Accounts) */}
      <hr />
      <ul className="nav flex-column fs-5 mx-3 mt-auto">
        {bottomNavItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`nav-link mb-1 ${
              location.pathname === item.path
                ? "active text-white fw-bold"
                : "text-gray-300"
            }`}
            style={{
              fontSize: "1.1rem",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <img
              src={
                location.pathname === item.path ? item.activeIcon : item.icon
              }
              alt={item.name}
              style={{ width: "22px", height: "22px", marginRight: "10px" }}
            />
            <span className="flex-grow-1">{item.name}</span>
          </Link>
        ))}
      </ul>
    </div>
  );
};

export default AdminSidebar;
