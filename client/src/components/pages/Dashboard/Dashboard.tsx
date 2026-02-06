import { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import AxiosInstance from "../../../AxiosInstance";
import { useNavigate } from "react-router-dom";

// Assets
import attendance from "../../../assets/icons/g-green.png";
import borrow from "../../../assets/icons/g-blue.png";
import returned from "../../../assets/icons/g-orange.png";
import overdue from "../../../assets/icons/g-red.png";
import placeholder from "../../../assets/cover_placeholder.jpg";

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Types
interface TallyWithPercentage {
  count: number;
  percent: number;
}
interface PatronVisit {
  name: string;
  visits: number;
}
interface BorrowedBook {
  title: string;
  borrowed_count: number;
}
interface Book {
  id: number;
  title: string;
  cover_image?: string | null;
  copyright?: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("role")?.toLowerCase() || "guest";

  // State
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [userName, setUserName] = useState("User");
  const [loadingUser, setLoadingUser] = useState(true);

  const [attendanceToday, setAttendanceToday] = useState<TallyWithPercentage>({
    count: 0,
    percent: 0,
  });
  const [circulationToday, setCirculationToday] = useState({
    borrowed: { count: 0, percent: 0 },
    returned: { count: 0, percent: 0 },
    overdue: { count: 0, percent: 0 },
  });

  const [topPatrons, setTopPatrons] = useState<PatronVisit[]>([]);
  const [topBooks, setTopBooks] = useState<BorrowedBook[]>([]);
  const [latestBooks, setLatestBooks] = useState<Book[]>([]);

  // Skeletons State
  const [loadingTally, setLoadingTally] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);

  // 1. Set Page Title and Fetch User
  useEffect(() => {
    document.title = `${
      userRole.charAt(0).toUpperCase() + userRole.slice(1)
    } Dashboard`;

    const token = localStorage.getItem("authToken");
    if (!token) return;

    AxiosInstance.get("/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        const u = res.data;
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
        setUserName(name || "User");
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingUser(false));
  }, [userRole]);

  // 2. Fetch Dashboard Statistics
  const fetchDashboardData = async (isInitial = false) => {
    if (isInitial) {
      setLoadingTally(true);
      setLoadingLists(true);
    }
    try {
      const [attRes, circRes, topBooksRes, latestRes, patronsRes] =
        await Promise.all([
          AxiosInstance.get("/attendances/today-tally"),
          AxiosInstance.get("/circulations/today-tally"),
          AxiosInstance.get("/circulation/top-books-week"),
          AxiosInstance.get("/books/latest"),
          AxiosInstance.get("/attendances/patrons-this-week"),
        ]);

      setAttendanceToday({
        count: attRes.data.attendanceToday,
        percent: attRes.data.percent,
      });
      setLatestBooks(latestRes.data);
      setTopBooks(topBooksRes.data);

      setCirculationToday({
        borrowed: {
          count:
            circRes.data.Issued?.count || circRes.data.Borrowed?.count || 0,
          percent:
            circRes.data.Issued?.percent ||
            circRes.data.Borrowed?.percent ||
            0,
        },
        returned: {
          count: circRes.data.Returned?.count || 0,
          percent: circRes.data.Returned?.percent || 0,
        },
        overdue: {
          count: circRes.data.Overdue?.count || 0,
          percent: circRes.data.Overdue?.percent || 0,
        },
      });

      // Process Weekly Patrons
      const startOfWeek = dayjs().startOf("isoWeek");
      const endOfWeek = dayjs().endOf("isoWeek");
      const patronMap: Record<string, number> = {};
      patronsRes.data.forEach((att: any) => {
        const visitDate = dayjs(att.time_in);
        if (
          visitDate.isSameOrAfter(startOfWeek) &&
          visitDate.isSameOrBefore(endOfWeek)
        ) {
          const name = `${att.first_name} ${att.last_name}`;
          patronMap[name] = (patronMap[name] || 0) + 1;
        }
      });
      setTopPatrons(
        Object.entries(patronMap)
          .map(([name, visits]) => ({ name, visits }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 5)
      );
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoadingTally(false);
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => {
      setCurrentDate(dayjs());
      fetchDashboardData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Skeleton Components (Local)
  const TallySkeleton = () => (
    <div className="skeleton-tally-wrapper">
      <div className="skeleton-tally icon"></div>
      <div className="skeleton-tally title"></div>
    </div>
  );

  // for table loading look
  const TableSkeleton = () => {
    return (
      <div>
        <h2 style={{ width: "180px" }} className="skeleton-table"></h2>
        <ul>
          {/* Header skeleton */}
          <li>
            <span className="skeleton-table" style={{ width: "120px" }}></span>
            <span className="skeleton-table" style={{ width: "80px" }}></span>
          </li>

          {/* Rows skeleton */}
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i}>
              <span
                className="skeleton-table"
                style={{ width: "150px" }}
              ></span>
              <span className="skeleton-table" style={{ width: "60px" }}></span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // for latest books loading look
  const BookCardSkeleton = () => (
    <div className="book-card">
      <div className="skeleton-book book-img"></div>
      <div className="skeleton-book book-title-line"></div>
      <div className="skeleton-book book-subtitle-line"></div>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Top Row */}
      <div className="top-row">
        <div className="welcome-section">
          <h2>
            Welcome Back,{" "}
            {loadingUser ? (
              <span
                style={{
                  display: "inline-block",
                  width: "150px",
                  height: "30px",
                  background: "#e0e0e0",
                  borderRadius: "4px",
                  animation: "pulse 1.5s infinite",
                }}
              ></span>
            ) : (
              userName
            )}
            !
          </h2>
          {/* Current Date/Time */}
          <p>{currentDate.format("MMMM D, YYYY | dddd, h:mm a")}</p>
        </div>
      </div>

      {/* Tally Row */}
      <div className="tally-rows">
        <div className="tally-cards blue">
          {loadingTally ? (
            <TallySkeleton />
          ) : (
            <>
              <div className="top mb-0">
                <img src={attendance} />
                <span className="value mb-0">{attendanceToday.count}</span>
              </div>
              <div className="label mb-0">Visitors Today</div>
              <div className="percent">
                {attendanceToday.percent}%<span> from yesterday</span>
              </div>
            </>
          )}
        </div>

        <div className="tally-cards green">
          {loadingTally ? (
            <TallySkeleton />
          ) : (
            <>
              <div className="top mb-0">
                <img src={borrow} />
                <span className="value mb-0">
                  {circulationToday.borrowed.count}
                </span>
              </div>
              <div className="label mb-0">Materials Borrowed Today</div>
              <div className="percent">
                {circulationToday.borrowed.percent}%<span> from yesterday</span>
              </div>
            </>
          )}
        </div>

        <div className="tally-cards yellow">
          {loadingTally ? (
            <TallySkeleton />
          ) : (
            <>
              <div className="top mb-0">
                <img src={returned} />
                <span className="value mb-0">
                  {circulationToday.returned.count}
                </span>
              </div>
              <div className="label mb-0">Materials Returned Today</div>
              <div className="percent">
                {circulationToday.returned.percent}%<span> from yesterday</span>
              </div>
            </>
          )}
        </div>

        <div className="tally-cards red">
          {loadingTally ? (
            <TallySkeleton />
          ) : (
            <>
              <div className="top mb-0">
                <img src={overdue} />
                <span className="value mb-0">
                  {circulationToday.overdue.count}
                </span>
              </div>
              <div className="label mb-0">Materials Overdue Today</div>
              <div className="percent">
                {circulationToday.overdue.percent}%<span> from yesterday</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top 5 Row */}
      <div className="top5-row">
        <div className="top5-card">
          {loadingLists ? (
            <TableSkeleton />
          ) : (
            <>
              <h2>Top 5 Patrons This Week</h2>
              <ul>
                <li>
                  <span className="text-muted">Name</span>
                  <span className="text-muted">Visits</span>
                </li>
                {topPatrons.map((patron, idx) => (
                  <li key={idx}>
                    <span>{patron.name}</span>
                    <span>{patron.visits}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="top5-card">
          {loadingLists ? (
            <TableSkeleton />
          ) : (
            <>
              <h2>Top 5 Borrowed Books</h2>
              <ul>
                <li>
                  <span className="text-muted">Title</span>
                  <span className="text-muted">Borrow Count</span>
                </li>
                {topBooks.map((book, idx) => (
                  <li key={idx}>
                    <span>{book.title}</span>
                    <span>{book.borrowed_count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Latest Books */}
      <div className="guestdashboard">
        <h1>Newly Added</h1>
        <div className="book-cards">
          {loadingLists
            ? Array.from({ length: 7 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))
            : latestBooks.map((book) => (
                <div
                  className="book-card"
                  key={book.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (!book.id) return;
                    const role = localStorage.getItem("role")?.toLowerCase();
                    const path =
                      role === "admin"
                        ? `/admin/cataloging/${book.id}`
                        : role === "staff"
                        ? `/staff/cataloging/${book.id}`
                        : null;
                    if (path) navigate(path);
                  }}
                >
                  <img
                    src={
                      book.cover_image
                        ? `http://127.0.0.1:8000/storage/${book.cover_image}`
                        : placeholder
                    }
                    alt={book.title}
                    className="book-image"
                  />
                  <p className="book-title">{book.title}</p>
                  <small className="book-copyright">
                    {book.copyright || "Unknown"}
                  </small>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
