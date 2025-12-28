import { Link, useLocation } from "react-router-dom";
import dashboardIcon from "../../../assets/gray-icons/dashboard.png";
import patronIcon from "../../../assets/gray-icons/patron.png";
import catalogingIcon from "../../../assets/gray-icons/cataloging.png";
import accessionIcon from "../../../assets/gray-icons/accession.png";
import circulationIcon from "../../../assets/gray-icons/circulation.png";
import attendanceIcon from "../../../assets/gray-icons/attendance.png";
import reportsIcon from "../../../assets/gray-icons/reports.png";
import elibIcon from "../../../assets/cpl_logo.png";
import dashboardIconActive from "../../../assets/white-icons/dashboard.png";
import patronIconActive from "../../../assets/white-icons/patron.png";
import catalogingIconActive from "../../../assets/white-icons/cataloging.png";
import accessionIconActive from "../../../assets/white-icons/accession.png";
import circulationIconActive from "../../../assets/white-icons/circulation.png";
import attendanceIconActive from "../../../assets/white-icons/attendance.png";
import reportsIconActive from "../../../assets/white-icons/reports.png";

const StaffSidebar = () => {
  const location = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/staff/staffdashboard",
      icon: dashboardIcon,
      activeIcon: dashboardIconActive,
    },
    {
      name: "Patron",
      path: "/staff/patrons",
      icon: patronIcon,
      activeIcon: patronIconActive,
    },
    {
      name: "Cataloging",
      path: "/staff/cataloging",
      icon: catalogingIcon,
      activeIcon: catalogingIconActive,
    },
    {
      name: "Accession",
      path: "/staff/accession",
      icon: accessionIcon,
      activeIcon: accessionIconActive,
    },
    {
      name: "Circulation",
      path: "/staff/circulation",
      icon: circulationIcon,
      activeIcon: circulationIconActive,
    },
    {
      name: "Attendance",
      path: "/staff/attendance",
      icon: attendanceIcon,
      activeIcon: attendanceIconActive,
    },
    {
      name: "Reports",
      path: "/staff/reports",
      icon: reportsIcon,
      activeIcon: reportsIconActive,
    },
  ];

  return (
    <div className="p-3 w-64">
      <h2 className="fs-4 fw-bold mb-4">
        <img className="mx-2" src={elibIcon} alt="" height={40} width={40} />
        CAPIZ E-LIB
      </h2>
      <ul className="nav flex-column fs-5 mx-3">
        {navItems.map((item) => (
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

export default StaffSidebar;
