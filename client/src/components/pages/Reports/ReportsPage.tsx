import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";
import ReportGeneratorModal from "./ReportGeneratorModal";

// Import your standalone tab components
import CollectionTab from "./CollectionTab";
import CirculationTab from "./CirculationTab";
import AttendanceTab from "./AttendanceTab";
import AccountsTab from "./AccountsTab";

type TabType = "collection" | "circulation" | "attendance" | "accounts";

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("collection");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printRequest, setPrintRequest] = useState<{
    type: string;
    id: number;
    preparedBy?: string;
    notedBy?: string;
  } | null>(null);

  const [filters, setFilters] = useState({
    timeRange: "this-month",
    startDate: "",
    endDate: "",
  });
  const [userRole, setUserRole] = useState<"admin" | "staff" | null>(null);

  const [staffList, setStaffList] = useState<string[]>([]);
  const [adminList, setAdminList] = useState<string[]>([]);

  const DDC_CATEGORIES = [
    "General Works",
    "Philosophy",
    "Religion",
    "Social Sciences",
    "Language",
    "Science",
    "Technology",
    "Arts",
    "Literature",
    "History & Geography",
  ];

  useEffect(() => {
    setPrintRequest(null);
  }, [activeTab]);

  const clearPrintRequest = () => {
    setPrintRequest(null);
  };

  useEffect(() => {
    const fetchSignatories = async () => {
      try {
        const res = await AxiosInstance.get("/users");
        const users = res.data;

        const staff = users
          .filter((u: any) => u.role === "staff")
          .map((u: any) => u.name);
        const admins = users
          .filter((u: any) => u.role === "admin")
          .map((u: any) => u.name);

        setStaffList(staff);
        setAdminList(admins);
      } catch (error) {
        console.error("Error fetching signatories:", error);
      }
    };
    fetchSignatories();
  }, []);

  const REPORT_CONFIG = {
    collection: [
      {
        group: "Standard Reports",
        items: [
          {
            label: "Full Inventory Report (All Data)",
            value: "Full Inventory",
          },
          { label: "Material Summary Only", value: "Summary Only" },
          { label: "DDC Distribution Only", value: "DDC Only" },
        ],
      },
      {
        group: "Special Reports",
        items: [{ label: "Lost Books Listing", value: "Lost Books" }],
      },
      {
        group: "By DDC Category",
        items: DDC_CATEGORIES.map((cat) => ({ label: cat, value: cat })),
      },
    ],
    circulation: [
      {
        group: "General Analytics",
        items: [
          { label: "Monthly Circulation Summary", value: "Monthly Summary" },
          { label: "Most Borrowed Titles (All-Time)", value: "Most Borrowed" },
        ],
      },
    ],
    attendance: [
      {
        group: "Attendance Reports",
        items: [
          { label: "Visitor Log", value: "Visitor Log" },
          { label: "Daily Attendance Summary", value: "Patron vs Guest" },
          { label: "Volume Trends", value: "Volume Trends" },
          {
            label: "Demographics (Affiliation, Type, Gender)",
            value: "Demographics",
          },
        ],
      },
    ],
    accounts: [
      {
        group: "Administrative Reports",
        items: [
          {
            label: "Account Summary (Tally & Growth)",
            value: "Account Summary",
          },
          {
            label: "Flagged Accounts (Blocked/Deactivated)",
            value: "Flagged Accounts",
          },
          { label: "Expired Patron Accounts", value: "Expired Accounts" },
        ],
      },
    ],
  };

  const handleFinalSubmit = (reportType: string, selectedTimeRange: string, preparedBy: string, notedBy: string) => {
    setFilters((prev) => ({ ...prev, timeRange: selectedTimeRange }));
    setPrintRequest({
      type: reportType,
      id: Date.now(),
      preparedBy,
      notedBy,
    });

    setIsModalOpen(false);
  };

  useEffect(() => {
    document.title = "Reports";
    const fetchUserRole = async () => {
      try {
        const res = await AxiosInstance.get("/user");
        setUserRole(res.data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };
    fetchUserRole();
  }, []);

  // Helper to render the correct component based on activeTab
  const renderTabContent = () => {
    const commonProps = {
      activeTab,
      filters,
      printRequest,
      onPrintComplete: clearPrintRequest,
    };

    switch (activeTab) {
      case "collection": // Make sure this matches your state string
        return <CollectionTab {...commonProps} />;
      case "circulation":
        return <CirculationTab {...commonProps} />;
      case "attendance":
        return <AttendanceTab {...commonProps} />;
      case "accounts":
        return userRole === "admin" ? (
          <AccountsTab {...commonProps} userRole={userRole} />
        ) : null;
      default:
        return <CollectionTab {...commonProps} />;
    }
  };

  return (
    <div className="reports-container">
      {/* Tab Navigation Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="tabs">
          <button
            className={`tab-button ${
              activeTab === "collection" ? "active" : ""
            }`}
            onClick={() => setActiveTab("collection")}
          >
            Collection Reports
          </button>

          <button
            className={`tab-button ${
              activeTab === "circulation" ? "active" : ""
            }`}
            onClick={() => setActiveTab("circulation")}
          >
            Circulation Reports
          </button>

          <button
            className={`tab-button ${
              activeTab === "attendance" ? "active" : ""
            }`}
            onClick={() => setActiveTab("attendance")}
          >
            Attendance Reports
          </button>

          {/* Admin Only Tab */}
          {userRole === "admin" && (
            <button
              className={`tab-button ${
                activeTab === "accounts" ? "active" : ""
              }`}
              onClick={() => setActiveTab("accounts")}
            >
              Accounts Reports
            </button>
          )}
        </div>
        <button
          className="btn btn-primary"
          style={{ backgroundColor: "#c05b42", border: "none" }}
          onClick={() => setIsModalOpen(true)}
        >
          <i className="bi bi-printer me-2"></i> Generate Report
        </button>
      </div>

      <ReportGeneratorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={REPORT_CONFIG[activeTab]}
        onSubmit={handleFinalSubmit}
        staffList={staffList} 
        adminList={adminList}
      />

      {/* Main Content Area */}
      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
};

export default ReportsPage;
