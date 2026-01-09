import { useState, useEffect } from "react";
import AxiosInstance from "../../../AxiosInstance";

// Import your standalone tab components
import CollectionTab from "./CollectionTab";
import CirculationTab from "./CirculationTab";
import AttendanceTab from "./AttendanceTab";
import AccountsTab from "./AccountsTab";

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState("collection");
  const [userRole, setUserRole] = useState<"admin" | "staff" | null>(null);

  // Fetch role once at the parent level to handle tab visibility
  useEffect(() => {
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
    switch (activeTab) {
      case "collection":
        // Pass activeTab if the component still checks "if (activeTab !== 'collection') return null"
        return <CollectionTab activeTab={activeTab} />;

      case "circulation":
        return <CirculationTab activeTab={activeTab} />;

      case "attendance":
        return <AttendanceTab activeTab={activeTab} />;

      case "accounts":
        return userRole === "admin" ? (
          <AccountsTab activeTab={activeTab} userRole={userRole} />
        ) : null;

      default:
        return <CollectionTab activeTab={activeTab} />;
    }
  };

  return (
    <div className="reports-container">
      {/* Tab Navigation Bar */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "collection" ? "active" : ""}`}
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
          className={`tab-button ${activeTab === "attendance" ? "active" : ""}`}
          onClick={() => setActiveTab("attendance")}
        >
          Attendance Reports
        </button>

        {/* Admin Only Tab */}
        {userRole === "admin" && (
          <button
            className={`tab-button ${activeTab === "accounts" ? "active" : ""}`}
            onClick={() => setActiveTab("accounts")}
          >
            Accounts Reports
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
};

export default ReportsPage;
