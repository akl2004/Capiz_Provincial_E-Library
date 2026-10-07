import React, { useState, useEffect } from "react";
import {
  FaAddressBook,
  FaUniversity,
  FaUsers,
  FaFacebook,
  FaEnvelope,
  FaLinkedin,
} from "react-icons/fa";
import ledesma from "../../../assets/about-us/ledesma.jpg";
import bacarro from "../../../assets/about-us/bacarro.jpg";
import villaruel from "../../../assets/about-us/villaruel.jpg";
import developers from "../../../assets/about-us/us.png";

const AboutUs = () => {
  const [activeTab, setActiveTab] = useState("developers");
  const [clickedLinks, setClickedLinks] = useState<Record<string, boolean>>({});
  const [clickingId, setClickingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "About Us - Capiz Provincial Library";
  }, []);

  const handleLinkClick = (linkId: string) => {
    setClickedLinks((prev) => ({ ...prev, [linkId]: true }));
  };

  const getLinkStyle = (linkId: string) => ({
    color: clickedLinks[linkId] ? "#C05B42" : "inherit",
    opacity: 1,
    transform: clickingId === linkId ? "scale(0.85)" : "scale(1)", 
    transition: "all 0.15s ease-in-out",
    display: "flex",
  });

  return (
    <div className="about-page-wrapper">
      <div
        className="about-container"
        style={{
          border: "4px solid #C05B42",
          borderRadius: "16px",
          padding: "2rem",
          maxWidth: "1000px",
          margin: "0 auto",
          backgroundColor: "#FFF",
        }}
      >
        {/* Header and Tabs */}
        <div
          className="about-header"
          style={{
            display: "flex",
            alignItems: "flex-end",
            marginBottom: "3rem",
          }}
        >
          <h1
            className="about-title"
            style={{
              color: "#C05B42",
              display: "flex",
              alignItems: "center",
              margin: 0,
              marginRight: "2rem",
              letterSpacing: "1px",
              paddingBottom: "5px", 
            }}
          >
            <FaAddressBook style={{ marginRight: "10px" }} size={32} /> ABOUT
          </h1>

          {/* The line wrapper */}
          <div
            style={{
              flexGrow: 1,
              display: "flex",
              alignItems: "flex-end",
              borderBottom: "2px solid #C05B42", 
            }}
          >
            <div
              className="tab-buttons"
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "-2px", 
              }}
            >
              <button
                onClick={() => setActiveTab("library")}
                style={{
                  position: "relative",
                  padding: "0.6rem 1.5rem",
                  borderRadius: "12px 12px 0 0", 
                  border: "2px solid #C05B42",
                  backgroundColor: activeTab === "library" ? "#C05B42" : "#FFF",
                  color: activeTab === "library" ? "#FFF" : "#C05B42",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  zIndex: activeTab === "library" ? 2 : 1, 
                }}
              >
                About the Library
                {/* Active Tab Bubble Triangle */}
                {activeTab === "library" && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "10px solid transparent",
                      borderRight: "10px solid transparent",
                      borderTop: "12px solid #C05B42",
                    }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab("developers")}
                style={{
                  position: "relative",
                  padding: "0.6rem 1.5rem",
                  borderRadius: "12px 12px 0 0",
                  border: "2px solid #C05B42",
                  backgroundColor:
                    activeTab === "developers" ? "#C05B42" : "#FFF",
                  color: activeTab === "developers" ? "#FFF" : "#C05B42",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  zIndex: activeTab === "developers" ? 2 : 1,
                }}
              >
                About the Developers
                {activeTab === "developers" && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "10px solid transparent",
                      borderRight: "10px solid transparent",
                      borderTop: "12px solid #C05B42",
                    }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "library" ? (
          <>
            <div className="about-text">
              <p className="fancy-para">
                Already existing in the{" "}
                <span className="text-highlight">1950s</span>, the earliest
                record of its existence is July 1, 1952, as seen in the service
                record of Felino Solis. During Mr. Solis’ service, the Capiz
                Provincial Library was known as the Provincial Library.
              </p>

              <p className="fancy-para">
                In the <span className="text-highlight">1960s</span>, it was
                known as the Roxas Memorial Library, and was located at the
                annex building of the Roxas City Hall. With the reconstruction
                of the annex building, the library’s location was transferred.
                Since then, the library had been constantly moved, never having
                a permanent location.
              </p>

              <p className="fancy-para">
                With the enactment of{" "}
                <span className="text-highlight">Republic Act No. 7743</span>{" "}
                also known as An Act Providing for the Establishment of
                Congressional, City And Municipal Libraries And Barangay Reading
                Centers Throughout The Philippines, Appropriating The Necessary
                Funds Therefore And For Other Purposes in June 17, 1994. As the
                inventory of books increased because of private donations and
                donations from the Asia Foundation, the library also has been
                receiving book allocations from the National Library.
              </p>

              <p className="fancy-para location-box">
                However, in <strong>2013</strong>, Typhoon Yolanda ravaged
                Visayas, including Capiz. The Capiz Provincial Capitol building
                was badly affected, resulting in the damage of a large amount of
                book collections. Reopened by the Provincial Government of Capiz
                on <strong>September 30, 2020</strong>, the Capiz Provincial
                Library is now in its new location in the{" "}
                <span className="emphasized-location">
                  3rd Floor of Capiz Government and Business Center.
                </span>
              </p>
            </div>
            <div className="about-footer-mark" style={{ marginTop: "2rem" }}>
              ESTABLISHED 1952
            </div>
          </>
        ) : (
          <div className="developers-text">
            {/* THE SYSTEM Section */}
            <div
              style={{
                display: "flex",
                gap: "2rem",
                marginBottom: "3rem",
                backgroundColor: "#FDF8F5",
                padding: "1.5rem",
                borderRadius: "16px",
                border: "1px solid #F0D9D1",
              }}
            >
              <img
                src={developers}
                alt="The System Developers"
                style={{
                  width: "350px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  border: "3px solid #C05B42",
                }}
              />
              <div>
                <h2
                  style={{
                    color: "#C05B42",
                    borderBottom: "1px solid #C05B42",
                    paddingBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "1.25rem",
                    letterSpacing: "1px",
                  }}
                >
                  <FaUniversity style={{ marginRight: "10px" }} /> THE SYSTEM
                </h2>
                <p
                  style={{
                    lineHeight: "1.6",
                    color: "#444",
                    fontSize: "0.95rem",
                    marginTop: "1rem",
                    textAlign: "justify",
                  }}
                >
                  <strong style={{ color: "#C05B42" }}>
                    Capiz E-Lib: A Web-Based Provincial Library System
                  </strong>{" "}
                  was originally developed as a capstone/thesis project by{" "}
                  <strong>
                    Althea Kim L. Ledesma, Nivanel Jane B. Villaruel,
                  </strong>{" "}
                  and <strong>Hanna Stephanie A. Bacarro</strong>, graduates of
                  the{" "}
                  <strong>
                    Bachelor of Science in Information Technology (BSIT)
                  </strong>{" "}
                  program at Filamer Christian University. Based on their
                  firsthand experience with the Capiz Provincial Library during
                  their third-year summer training and fourth-year On-the-Job
                  Training, and developed under the guidance of their Research
                  Adviser and Dean Jonah Gafate, the system was designed to
                  enhance library services and support digital transformation,
                  and was later endorsed to FCU-CEESO as part of the
                  university's continuing collaboration with the Capiz
                  Provincial Library.
                </p>
              </div>
            </div>

            {/* MEET OUR TEAM Section */}
            <div style={{ textAlign: "center" }}>
              <h2
                style={{
                  color: "#C05B42",
                  borderBottom: "1px solid #C05B42",
                  paddingBottom: "0.5rem",
                  display: "inline-flex",
                  alignItems: "center",
                  marginBottom: "2rem",
                  fontSize: "1.5rem",
                  letterSpacing: "1px",
                }}
              >
                <FaUsers style={{ marginRight: "10px" }} /> MEET OUR TEAM
              </h2>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1.5rem",
                  alignItems: "stretch",
                }}
              >
                {/* Team Card 1 */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "#FFF",
                    border: "1px solid #F0D9D1",
                    borderRadius: "20px",
                    padding: "1.5rem",
                    boxShadow: "0 4px 10px rgba(192, 91, 66, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={ledesma}
                    alt="Althea Kim L. Ledesma"
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "5px solid #E6F3F0",
                      marginBottom: "1rem",
                    }}
                  />
                  <h3
                    style={{
                      color: "#C05B42",
                      margin: "0.5rem 0",
                      fontSize: "1rem",
                    }}
                  >
                    ALTHEA KIM L. LEDESMA
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontStyle: "italic",
                      color: "#C05B42",
                      fontSize: "0.9rem",
                      lineHeight: "1.4",
                    }}
                  >
                    Full Stack Developer
                    <br />
                    Project Manager
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "0.75rem",
                      marginTop: "auto",
                      paddingTop: "1.5rem",
                      color: "#C05B42",
                    }}
                  >
                    {/* Facebook Link */}
                    <a
                      href="https://web.facebook.com/thea.kim.353"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("ledesma-fb")}
                      onMouseDown={() => setClickingId("ledesma-fb")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("ledesma-fb")}
                    >
                      <FaFacebook size={20} style={{ cursor: "pointer" }} />
                    </a>

                    {/* Email Link */}
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=aledesma.kim@gmail.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("ledesma-email")}
                      onMouseDown={() => setClickingId("ledesma-email")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("ledesma-email")}
                    >
                      <FaEnvelope size={20} style={{ cursor: "pointer" }} />
                    </a>

                    {/* LinkedIn Link */}
                    <a
                      href="https://www.linkedin.com/in/altheakimledesma"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("ledesma-in")}
                      onMouseDown={() => setClickingId("ledesma-in")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("ledesma-in")}
                    >
                      <FaLinkedin size={20} style={{ cursor: "pointer" }} />
                    </a>
                  </div>
                </div>

                {/* Team Card 2 */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "#FFF",
                    border: "1px solid #F0D9D1",
                    borderRadius: "20px",
                    padding: "1.5rem",
                    boxShadow: "0 4px 10px rgba(192, 91, 66, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={villaruel}
                    alt="Nivanel Jane B. Villaruel"
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "5px solid #E6F3F0",
                      marginBottom: "1rem",
                    }}
                  />
                  <h3
                    style={{
                      color: "#C05B42",
                      margin: "0.5rem 0",
                      fontSize: "1rem",
                    }}
                  >
                    NIVANEL JANE B. VILLARUEL
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontStyle: "italic",
                      color: "#C05B42",
                      fontSize: "0.9rem",
                      lineHeight: "1.4",
                    }}
                  >
                    System Analyst
                    <br />
                    UI/UX Designer
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "0.75rem",
                      marginTop: "auto",
                      paddingTop: "1.5rem",
                      color: "#C05B42",
                    }}
                  >
                    {/* Facebook Link */}
                    <a
                      href="https://web.facebook.com/nivaneljane"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("villaruel-fb")}
                      onMouseDown={() => setClickingId("villaruel-fb")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("villaruel-fb")}
                    >
                      <FaFacebook size={20} style={{ cursor: "pointer" }} />
                    </a>

                    {/* Email Link */}
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=nivaneljanevil@gmail.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("villaruel-email")}
                      onMouseDown={() => setClickingId("villaruel-email")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("villaruel-email")}
                    >
                      <FaEnvelope size={20} style={{ cursor: "pointer" }} />
                    </a>

                    {/* LinkedIn Link */}
                    <a
                      href="https://www.linkedin.com/in/nivanel-villaruel-258047434"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("villaruel-in")}
                      onMouseDown={() => setClickingId("villaruel-in")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("villaruel-in")}
                    >
                      <FaLinkedin size={20} style={{ cursor: "pointer" }} />
                    </a>
                  </div>
                </div>

                {/* Team Card 3 */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "#FFF",
                    border: "1px solid #F0D9D1",
                    borderRadius: "20px",
                    padding: "1.5rem",
                    boxShadow: "0 4px 10px rgba(192, 91, 66, 0.05)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={bacarro}
                    alt="Hanna Stephanie A. Bacarro"
                    style={{
                      width: "130px",
                      height: "130px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "5px solid #E6F3F0",
                      marginBottom: "1rem",
                    }}
                  />
                  <h3
                    style={{
                      color: "#C05B42",
                      margin: "0.5rem 0",
                      fontSize: "1rem",
                    }}
                  >
                    HANNA STEPHANIE A. BACARRO
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontStyle: "italic",
                      color: "#C05B42",
                      fontSize: "0.9rem",
                      lineHeight: "1.4",
                    }}
                  >
                    Quality Assurance Officer
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "0.75rem",
                      marginTop: "auto",
                      paddingTop: "1.5rem",
                      color: "#C05B42",
                    }}
                  >
                    {/* Facebook Link */}
                    <a
                      href="https://web.facebook.com/stephanie.bacarro.3"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("bacarro-fb")}
                      onMouseDown={() => setClickingId("bacarro-fb")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("bacarro-fb")}
                    >
                      <FaFacebook size={20} style={{ cursor: "pointer" }} />
                    </a>

                    {/* Email Link */}
                    <a
                      href="https://mail.google.com/mail/?view=cm&fs=1&to=bacarrohanna8@gmail.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("bacarro-email")}
                      onMouseDown={() => setClickingId("bacarro-email")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("bacarro-email")}
                    >
                      <FaEnvelope size={20} style={{ cursor: "pointer" }} />
                    </a>

                    {/* LinkedIn Link */}
                    <a
                      href="https://www.linkedin.com/in/hannabacarro"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick("bacarro-in")}
                      onMouseDown={() => setClickingId("bacarro-in")}
                      onMouseUp={() => setClickingId(null)}
                      onMouseLeave={() => setClickingId(null)}
                      style={getLinkStyle("bacarro-in")}
                    >
                      <FaLinkedin size={20} style={{ cursor: "pointer" }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};;;

export default AboutUs;
