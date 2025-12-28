import { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import AxiosInstance from "../../../AxiosInstance";
import attendance from "../../../assets/icons/g-green.png";
import borrow from "../../../assets/icons/g-blue.png";
import returned from "../../../assets/icons/g-orange.png";
import overdue from "../../../assets/icons/g-red.png";
import placeholder from "../../../assets/cover_placeholder.jpg";

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface AdminDashboardProps {
  user?: {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    suffix?: string | null;
    avatar?: string;
    role?: string;
    name?: string | null;
  };
}

interface PatronVisit {
  name: string;
  visits: number;
}

interface BorrowedBook {
  title: string;
  borrowed_count: number;
}

interface TallyWithPercentage {
  count: number;
  percent: number;
}

interface CirculationTally {
  borrowed: TallyWithPercentage;
  returned: TallyWithPercentage;
  overdue: TallyWithPercentage;
}

interface Book {
  id: number;
  title: string;
  cover_image?: string | null;
  copyright?: string | null;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [attendanceToday, setAttendanceToday] = useState<TallyWithPercentage>({
    count: 0,
    percent: 0,
  });
  const [circulationToday, setCirculationToday] = useState<CirculationTally>({
    borrowed: { count: 0, percent: 0 },
    returned: { count: 0, percent: 0 },
    overdue: { count: 0, percent: 0 },
  });
  const [topPatrons, setTopPatrons] = useState<PatronVisit[]>([]);
  const [topBooks, setTopBooks] = useState<BorrowedBook[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userName, setUserName] = useState("Guest");
  const [loadingUser, setLoadingUser] = useState(true);
  const [latestBooks, setLatestBooks] = useState<Book[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // loading components
  const [loadingTally, setLoadingTally] = useState(false);
  const [loadingTopPatrons, setLoadingTopPatrons] = useState(false);
  const [loadingTopBooks, setLoadingTopBooks] = useState(false);
  const [loadingLatestBooks, setLoadingLatestBooks] = useState(false);

  //for tally loading look
  const TallySkeleton = () => (
    <div>
      <div className="skeleton-tally icon"></div>
      <div className="skeleton-tally title"></div>
      <div className="skeleton-tally subtitle"></div>
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

  // -------------------------------
  // Fetch current user info
  // -------------------------------
  useEffect(() => {
    document.title = "Admin Dashboard";
    const token = localStorage.getItem("authToken");
    if (!token) return;

    AxiosInstance.get("/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        const u = res.data;
        const name = [u.first_name, u.middle_name, u.last_name, u.suffix]
          .filter(Boolean)
          .join(" ");
        setUserName(name || "Guest");
      })
      .catch((err) => console.error("Failed to fetch user:", err))
      .finally(() => setLoadingUser(false));
  }, []);

  // -------------------------------
  // Update dashboard data
  // -------------------------------
  const fetchDashboardData = async (isInitial = false) => {
    // Show skeleton only on first load
    if (isInitial) {
      setLoadingTally(true);
      setLoadingTopPatrons(true);
      setLoadingTopBooks(true);
      setLoadingLatestBooks(true);
    }

    try {
      // Attendance today
      const attendanceRes = await AxiosInstance.get("/attendances/today-tally");
      setAttendanceToday({
        count: attendanceRes.data.attendanceToday ?? 0,
        percent: attendanceRes.data.percent ?? 0,
      });

      // Top patrons
      const patronsRes = await AxiosInstance.get(
        "/attendances/patrons-this-week"
      );
      // process patronsRes same as before
      const startOfWeek = dayjs().startOf("isoWeek");
      const endOfWeek = dayjs().endOf("isoWeek");
      const weekly = patronsRes.data.filter((a: any) => {
        const date = dayjs(a.time_in);
        return (
          date.isSameOrAfter(startOfWeek) && date.isSameOrBefore(endOfWeek)
        );
      });
      const patronMap: Record<string, number> = {};
      weekly.forEach((att: any) => {
        const name = [
          att.first_name,
          att.middle_name,
          att.last_name,
          att.suffix,
        ]
          .filter(Boolean)
          .join(" ");
        patronMap[name] = (patronMap[name] || 0) + 1;
      });
      const top = Object.entries(patronMap)
        .map(([name, visits]) => ({ name, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);
      setTopPatrons(top);

      // Circulation today
      const circulationRes = await AxiosInstance.get(
        "/circulations/today-tally"
      );
      setCirculationToday({
        borrowed: {
          count: circulationRes.data.Borrowed?.count ?? 0,
          percent: circulationRes.data.Borrowed?.percent ?? 0,
        },
        returned: {
          count: circulationRes.data.Returned?.count ?? 0,
          percent: circulationRes.data.Returned?.percent ?? 0,
        },
        overdue: {
          count: circulationRes.data.Overdue?.count ?? 0,
          percent: circulationRes.data.Overdue?.percent ?? 0,
        },
      });

      // Top borrowed books
      const topBooksRes = await AxiosInstance.get(
        "/circulation/top-books-week"
      );
      setTopBooks(topBooksRes.data);

      // Latest books
      const latestBooksRes = await AxiosInstance.get("/books/latest");
      setLatestBooks(latestBooksRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      // Turn off skeletons only after first load
      if (isInitial) {
        setLoadingTally(false);
        setLoadingTopPatrons(false);
        setLoadingTopBooks(false);
        setLoadingLatestBooks(false);
        setInitialLoading(false);
      }
    }
  };

  // On mount, show skeleton
  useEffect(() => {
    fetchDashboardData(true);

    const interval = setInterval(() => {
      setCurrentDate(dayjs());
      fetchDashboardData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);


  // Fetch latest 7 books from backend
  useEffect(() => {
    setLoadingLatestBooks(true);
    AxiosInstance.get("/books/latest")
      .then((res) => setLatestBooks(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingLatestBooks(false));
  }, []);

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
        {/* Search Bar */}
        <div className="position-relative" style={{ maxWidth: "900px" }}>
          <span
            className="position-absolute top-50 translate-middle-y ps-2"
            style={{ left: "10px", color: "#6c757d" }}
          >
            <i className="bi bi-search"></i>
          </span>
          <input
            className="form-control ps-5 pe-5"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
          {loadingTopPatrons ? (
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
          {loadingTopBooks ? (
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
        <h1>Circulation</h1>
        <div className="book-cards">
          {loadingLatestBooks
            ? Array.from({ length: 7 }).map((_, i) => (
                <BookCardSkeleton key={i} />
              ))
            : latestBooks.map((book) => (
                <div className="book-card" key={book.id}>
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

export default AdminDashboard;
