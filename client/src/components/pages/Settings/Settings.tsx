import React, { useState, useEffect, useRef } from "react";
import TimezoneSettings from "./TimezoneSettings";
import BorrowingPolicySetting from "./BorrowingPolicySettings";
import RenewalLimitSetting from "./RenewalLimitSetting";
import FineSetting from "./FineSetting";
import ExpirationYearsSetting from "./ExpirationYearsSetting";
import MissingThresholdSetting from "./MissingThresholdSetting";
import ReplacementPolicySetting from "./ReplacementPolicySettings";

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState("system");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sections = [
    { id: "system", label: "System Settings", icon: "bi-gear-fill" },
    { id: "circulation", label: "Circulation Policy", icon: "bi-arrow-repeat" },
    { id: "accounts", label: "Accounts & Roles", icon: "bi-people-fill" },
  ];

  useEffect(() => {
    document.title = "Settings";
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -70% 0px", // Trigger when section is near top
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="settings-master-layout">
      {/* Sidebar Navigation */}
      <aside className="settings-sidebar">
        <div className="sidebar-header-area">
          <span className="sidebar-category-label">SETTINGS</span>
        </div>
        <nav className="nav flex-column mt-3">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`nav-link-chic ${
                activeTab === section.id ? "active" : ""
              }`}
              onClick={() => scrollToSection(section.id)}
            >
              <div className="nav-content-wrapper">
                <i className={`bi ${section.icon} nav-icon`}></i>
                <span className="nav-text">{section.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="settings-content-scroll" ref={scrollContainerRef}>
        {/* SECTION: SYSTEM SETTINGS */}
        <section id="system" className="settings-section">
          <div className="section-header">
            <h3>System Settings</h3>
            <p className="text-muted">
              Manage global library configurations and localization.
            </p>
          </div>
          <TimezoneSettings />
        </section>

        <hr className="section-divider" />

        {/* SECTION: CIRCULATION POLICY */}
        <section id="circulation" className="settings-section">
          <div className="section-header">
            <h3>Circulation Policy</h3>
            <p className="text-muted">
              Define rules for borrowing, renewals, and financial penalties.
            </p>
          </div>
          <BorrowingPolicySetting />
          <RenewalLimitSetting />
          <FineSetting />
          <MissingThresholdSetting />
          <ReplacementPolicySetting />
        </section>

        <hr className="section-divider" />

        {/* SECTION: ACCOUNTS & ROLES */}
        <section id="accounts" className="settings-section">
          <div className="section-header">
            <h3>Accounts & Roles</h3>
            <p className="text-muted">
              Set security policies and patron account expiration terms.
            </p>
          </div>
          <ExpirationYearsSetting />
        </section>

        <div className="bottom-spacer" />
      </main>
    </div>
  );
};

export default Settings;
