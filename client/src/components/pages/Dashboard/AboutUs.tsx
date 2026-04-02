import { useEffect } from "react";

const AboutUs = () => {
  useEffect(() => {
    document.title = "About Us - Capiz Provincial Library";
  }, []);
  
  return (
    <div className="about-container">
      <h1 className="about-title">ABOUT US</h1>

      <div className="about-text">
        <p className="fancy-para">
          Already existing in the <span className="text-highlight">1950s</span>,
          the earliest record of its existence is July 1, 1952, as seen in the
          service record of Felino Solis. During Mr. Solis’ service, the Capiz
          Provincial Library was known as the Provincial Library.
        </p>

        <p className="fancy-para">
          In the <span className="text-highlight">1960s</span>, it was known as
          the Roxas Memorial Library, and was located at the annex building of
          the Roxas City Hall. With the reconstruction of the annex building,
          the library’s location was transferred. Since then, the library had
          been constantly moved, never having a permanent location.
        </p>

        <p className="fancy-para">
          With the enactment of{" "}
          <span className="text-highlight">Republic Act No. 7743</span> also
          known as An Act Providing for the Establishment of Congressional, City
          And Municipal Libraries And Barangay Reading Centers Throughout The
          Philippines, Appropriating The Necessary Funds Therefore And For Other
          Purposes in June 17, 1994. As the inventory of books increased because
          of private donations and donations from the Asia Foundation, the
          library also has been receiving book allocations from the National
          Library.
        </p>

        <p className="fancy-para location-box">
          However, in <strong>2013</strong>, Typhoon Yolanda ravaged Visayas,
          including Capiz. The Capiz Provincial Capitol building was badly
          affected, resulting in the damage of a large amount of book
          collections. Reopened by the Provincial Government of Capiz on{" "}
          <strong>September 30, 2020</strong>, the Capiz Provincial Library is
          now in its new location in the{" "}
          <span className="emphasized-location">
            3rd Floor of Capiz Government and Business Center.
          </span>
        </p>
      </div>

      <div className="about-footer-mark">ESTABLISHED 1952</div>
    </div>
  );
};

export default AboutUs;
