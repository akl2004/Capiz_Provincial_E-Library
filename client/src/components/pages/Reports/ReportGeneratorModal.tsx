import React, { useEffect, useState } from "react";

interface ReportOption {
  label: string;
  value: string;
}

interface ReportGroup {
  group: string;
  items: ReportOption[];
}

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReportGroup[];
  onSubmit: (
    selectedOption: string,
    timeRange: string,
    preparedBy: string,
    notedBy: string,
  ) => void;
  staffList: string[];
  adminList: string[];
}

const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({
  isOpen,
  onClose,
  config,
  onSubmit,
  staffList,
  adminList,
}) => {
  const [selectedReport, setSelectedReport] = useState("");

  const [timeRange, setTimeRange] = useState("this-month");

  const [preparedBy, setPreparedBy] = useState("");
  const [notedBy, setNotedBy] = useState("");

  useEffect(() => {
    if (staffList?.length > 0) setPreparedBy(staffList[0]);
    if (adminList?.length > 0) setNotedBy(adminList[0]);
  }, [staffList, adminList]);

  useEffect(() => {
    if (config && config.length > 0 && config[0].items.length > 0) {
      setSelectedReport(config[0].items[0].value);
    }
  }, [config]);

  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div
          className="modal-content border-0 shadow-lg"
          style={{ borderRadius: "12px" }}
        >
          {/* Header */}
          <div className="modal-header border-bottom-0 pt-4 px-4">
            <h5 className="modal-title fw-bold text-primary">
              Report Generator
            </h5>
            <button
              type="button"
              className="btn-close shadow-none"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body p-0">
            <div className="row g-0">
              <div className="col-md-6 p-4 border-end">
                <h6 className="fw-bold mb-4 text-secondary text-uppercase small">
                  Report Setup
                </h6>

                <div className="mb-4">
                  <label className="form-label small fw-semibold text-muted">
                    Select Report
                  </label>
                  <select
                    className="form-select bg-light border-0 py-2 shadow-none"
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                  >
                    {/* Check if config is the new array format */}
                    {Array.isArray(config) ? (
                      config.map((groupObj) => (
                        <optgroup key={groupObj.group} label={groupObj.group}>
                          {groupObj.items.map((item: any) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    ) : (
                      // Fallback for simple arrays if any exist
                      <option value="">Select a report</option>
                    )}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Reporting Period (Scope)
                  </label>
                  <select
                    className="form-select bg-light border-0 py-2 shadow-none"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                    <option value="this-year">This Year</option>
                    <option value="all-time">All Time</option>
                  </select>
                  <div
                    className="mt-2 p-2 rounded"
                    style={{ backgroundColor: "#eef2f7", fontSize: "0.8rem" }}
                  >
                    <i className="bi bi-info-circle me-2 text-primary"></i>
                    This will filter the <strong>{selectedReport}</strong> data
                    for <strong>{timeRange.replace("-", " ")}</strong>.
                  </div>
                </div>
              </div>

              {/* Right Column: Custom Options */}
              <div className="col-md-6 p-4 bg-white">
                <h6 className="fw-bold mb-4 text-secondary text-uppercase small">
                  Signatories
                </h6>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Prepared By:
                  </label>
                  <select
                    className="form-select form-select-sm bg-light border-0"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                  >
                    {staffList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">
                    Noted By (Admin):
                  </label>
                  <select
                    className="form-select form-select-sm bg-light border-0"
                    value={notedBy}
                    onChange={(e) => setNotedBy(e.target.value)}
                  >
                    {adminList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <hr className="my-2 opacity-25" />

                {/* Toggles */}
                <div className="form-check form-switch mt-4 mb-3">
                  <input
                    className="form-check-input shadow-none"
                    type="checkbox"
                    id="collate"
                    defaultChecked
                  />
                  <label className="form-check-label small" htmlFor="collate">
                    Collate Data Sections
                  </label>
                  <i className="bi bi-question-circle text-primary small ms-2"></i>
                </div>

                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input shadow-none"
                    type="checkbox"
                    id="savePrefs"
                  />
                  <label className="form-check-label small" htmlFor="savePrefs">
                    Save Custom Options
                  </label>
                  <i className="bi bi-question-circle text-primary small ms-2"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div
            className="modal-footer border-0 p-4 bg-light d-flex justify-content-between"
            style={{ borderRadius: "0 0 12px 12px" }}
          >
            <button
              className="btn btn-primary px-4 py-2"
              style={{ backgroundColor: "#255a91", border: "none" }}
              onClick={() =>
                onSubmit(selectedReport, timeRange, preparedBy, notedBy)
              }
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGeneratorModal;
