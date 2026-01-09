import "./App.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Unified Layout
import AppLayout from "./components/Layout/Admin/AppLayout";
import GuestLayout from "./components/Layout/Guest/GuestLayout";

// Shared Pages
import Patron from "./components/pages/Patron/Patron";
import PatronInfo from "./components/pages/Patron/PatronInfo";
import EditPatron from "./components/pages/Patron/EditPatron";
import PatronTransactions from "./components/pages/Patron/PatronTransaction";
import Cataloging from "./components/pages/Catalog/Cataloging";
import BookForm from "./components/pages/Catalog/BookForm";
import BookDetails from "./components/pages/Catalog/BookDetails";
import CopyInformation from "./components/pages/Catalog/CopyInformation";
import Accession from "./components/pages/Accession/Accession";
import Circulation from "./components/pages/Circulation/CirculationPage";
import IssueForm from "./components/pages/Circulation/IssueForm";
import Attendance from "./components/pages/Attendance/Attendance";
import ReportsPage from "./components/pages/Reports/ReportsPage";
import DailyAttendancePage from "./components/pages/Attendance/DailyAttendancePage";

// Role-Specific Pages
import Dashboard from "./components/pages/Dashboard/Dashboard";
import GuestDasboard from "./components/pages/Dashboard/GuestDasboard";
import RoleSelection from "./components/pages/Authentication/RoleSelection";
import SearchResults from "./components/pages/Catalog/SearchResults";
import AboutUs from "./components/pages/Dashboard/AboutUs";

// Admin Only Pages
import Settings from "./components/pages/Settings/Settings";
import Accounts from "./components/pages/Accounts/Accounts";
import PatronProfile from "./components/pages/Accounts/PatronProfile";
import StaffProfile from "./components/pages/Accounts/StaffProfile";
import AdminProfile from "./components/pages/Accounts/AdminProfile";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Public Landing / Role Selection */}
        <Route path="/" element={<RoleSelection />} />

        {/* Guest Routes */}
        <Route
          path="/guest"
          element={
            <ProtectedRoute allowedRoles={["guest"]}>
              <GuestLayout />
            </ProtectedRoute>
          }
        >
          <Route path="guestdashboard" element={<GuestDasboard />} />
          <Route path="cataloging" element={<Cataloging />} />
          <Route path="dailyattendance" element={<DailyAttendancePage />} />
          <Route path="guestdashboard/search" element={<SearchResults />} />
          <Route path="about" element={<AboutUs />} />
        </Route>

        {/* Merged Admin & Staff Routes */}
        {/* We use the same AppLayout for both! */}

        {/* ADMIN SECTION */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="admindashboard" element={<Dashboard />} />
          {/* Shared Library Modules */}
          <Route path="patrons" element={<Patron />} />
          <Route path="patrons/:id" element={<PatronInfo />} />
          <Route path="patrons/:id/edit" element={<EditPatron />} />
          <Route
            path="patrons/:id/transactions"
            element={<PatronTransactions />}
          />
          <Route path="cataloging" element={<Cataloging />} />
          <Route path="cataloging/addbook" element={<BookForm />} />
          <Route path="cataloging/:id" element={<BookDetails />} />
          <Route path="cataloging/:id/:copyId" element={<CopyInformation />} />
          <Route path="accession" element={<Accession />} />
          <Route path="circulation" element={<Circulation />} />
          <Route path="circulation/issue" element={<IssueForm />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="reports" element={<ReportsPage />} />
          {/* Admin Only Modules */}
          <Route path="settings" element={<Settings />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/patron/:id" element={<PatronProfile />} />
          <Route path="accounts/staff/:id" element={<StaffProfile />} />
          <Route path="accounts/admin/:id" element={<AdminProfile />} />
        </Route>

        {/* STAFF SECTION */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["staff"]}>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="staffdashboard" element={<Dashboard />} />
          <Route path="patrons" element={<Patron />} />
          <Route path="patrons/:id" element={<PatronInfo />} />
          <Route
            path="patrons/:id/transactions"
            element={<PatronTransactions />}
          />
          <Route path="cataloging" element={<Cataloging />} />
          <Route path="cataloging/addbook" element={<BookForm />} />
          <Route path="cataloging/:id" element={<BookDetails />} />
          <Route path="cataloging/:id/:copyId" element={<CopyInformation />} />
          <Route path="accession" element={<Accession />} />
          <Route path="circulation" element={<Circulation />} />
          <Route path="circulation/issue" element={<IssueForm />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="reports" element={<ReportsPage />} />
          {/* Staff can't see Settings or Accounts because they aren't listed here and are hidden in the Sidebar */}
        </Route>
      </Routes>
    </HashRouter>
  );
}
