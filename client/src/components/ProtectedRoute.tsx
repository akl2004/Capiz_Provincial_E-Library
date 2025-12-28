// ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // optional
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();

  // normalize role to lowercase (or null if not set)
  const rawRole = localStorage.getItem("role");
  const role = rawRole ? rawRole.toLowerCase() : null;

  const pathname = location.pathname;

  // allow the root ("/") to render so RoleSelection can be shown without a role
  if (pathname === "/") {
    return <>{children}</>;
  }

  // allow all /guest routes without checking role
  if (pathname.startsWith("/guest")) {
    return <>{children}</>;
  }

  // If no role and not on root, send user to role selection ("/")
  if (!role) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // If allowedRoles provided, ensure normalized match
  if (allowedRoles && allowedRoles.length > 0) {
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (!allowed.includes(role)) {
      // user has a role but is not allowed here -> redirect to root (or you can
      // redirect to a 403 page or their dashboard)
      return <Navigate to="/" replace />;
    }
  }

  // allowed: render children
  return <>{children}</>;
};

export default ProtectedRoute;
