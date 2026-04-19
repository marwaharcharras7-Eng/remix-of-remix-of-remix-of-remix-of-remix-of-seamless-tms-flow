import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/lib/tms-types";
import { Loader2 } from "lucide-react";

export function RoleGuard({ children, allow, module }: { children: ReactNode; allow?: AppRole[]; module?: string }) {
  const { user, roles, loading, canAccess } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  if (allow && !roles.some((r) => allow.includes(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  if (module && !canAccess(module)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
