import { useEffect, useState } from "react";

// Import all your setting components
import FineSetting from "./FineSetting";
import BorrowingPolicy from "./BorrowingPolicySettings";
import RenewalLimitSetting from "./RenewalLimitSetting";
import ExpirationYearsSetting from "./ExpirationYearsSetting";
import TimezoneSettings from "./TimezoneSettings";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("System Settings");

  useEffect(() => {
    document.title = "Settings";
  }, []);

  const settingsTabs = [
    {
      tab: "System Settings",
      label: "System Settings",
      sublabel:
        "Configure system-wide formats such as date, time, and timezone to keep all modules consistent.",
      components: [<TimezoneSettings key="timezone" />],
    },
    {
      tab: "Circulation Policy",
      label: "Circulation Policy",
      sublabel:
        "Set rules for borrowing, renewals, and fines to manage how materials are issued and returned.",
      components: [
        <BorrowingPolicy key="borrow" />,
        <RenewalLimitSetting key="renewal" />,
        <FineSetting key="fine" />,
      ],
    },
    {
      tab: "Account & Roles Settings",
      label: "Account & Roles Settings",
      sublabel:
        "Manage user roles, permissions, and account lifecycles to secure the system and assign responsibilities.",
      components: [<ExpirationYearsSetting key="expiration" />],
    },
  ];

  return (
    <div className="settings-container p-4">
      <h1 className="text-xl font-semibold mb-0">Settings</h1>
      <p className="mb-4">
        <i>
          Configure and manage all core rules and preferences of the e-library
          system to ensure smooth operation and consistent policies.
        </i>
      </p>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {settingsTabs.map((tab) => (
          <li className="nav-item" key={tab.tab}>
            <button
              className={`nav-link ${activeTab === tab.tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab.tab)}
            >
              {tab.tab}
            </button>
          </li>
        ))}
      </ul>

      <div>
        {settingsTabs.map(
          (tab) =>
            activeTab === tab.tab && (
              <div key={tab.tab} className="tab-pane fade show active">
                {/* Tab label + sublabel */}
                <div className="settings-container">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">{tab.label}</h2>
                    <p className="text-muted">{tab.sublabel}</p>
                    <hr />
                  </div>
                  {tab.components.map((Component, i) => (
                    <div key={i}>{Component}</div>
                  ))}
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default Settings;
