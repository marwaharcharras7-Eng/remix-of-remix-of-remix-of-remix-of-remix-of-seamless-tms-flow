import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppLayout } from "@/components/layout/AppLayout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Flottes from "./pages/Flottes";
import Vehicules from "./pages/Vehicules";
import Chauffeurs from "./pages/Chauffeurs";
import Prestataires from "./pages/Prestataires";
import Plannings from "./pages/Plannings";
import MisesADisposition from "./pages/MisesADisposition";
import Missions from "./pages/Missions";
import SuiviGPS from "./pages/SuiviGPS";
import PontBascule from "./pages/PontBascule";
import Factures from "./pages/Factures";
import Incidents from "./pages/Incidents";
import Reporting from "./pages/Reporting";
import Utilisateurs from "./pages/Utilisateurs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            <Route element={<RoleGuard><AppLayout /></RoleGuard>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/flottes" element={<RoleGuard module="flotte"><Flottes /></RoleGuard>} />
              <Route path="/vehicules" element={<RoleGuard module="vehicules"><Vehicules /></RoleGuard>} />
              <Route path="/chauffeurs" element={<RoleGuard module="chauffeurs"><Chauffeurs /></RoleGuard>} />
              <Route path="/prestataires" element={<RoleGuard module="prestataires"><Prestataires /></RoleGuard>} />
              <Route path="/plannings" element={<RoleGuard module="planning"><Plannings /></RoleGuard>} />
              <Route path="/mises-a-disposition" element={<RoleGuard module="mises-a-disposition"><MisesADisposition /></RoleGuard>} />
              <Route path="/missions" element={<RoleGuard module="missions"><Missions /></RoleGuard>} />
              <Route path="/mes-missions" element={<RoleGuard module="mes-missions"><Missions mineOnly /></RoleGuard>} />
              <Route path="/suivi-gps" element={<RoleGuard module="suivi-gps"><SuiviGPS /></RoleGuard>} />
              <Route path="/pont-bascule" element={<RoleGuard module="pont-bascule"><PontBascule /></RoleGuard>} />
              <Route path="/factures" element={<RoleGuard module="factures"><Factures /></RoleGuard>} />
              <Route path="/incidents" element={<RoleGuard module="incidents"><Incidents /></RoleGuard>} />
              <Route path="/reporting" element={<RoleGuard module="reporting"><Reporting /></RoleGuard>} />
              <Route path="/utilisateurs" element={<RoleGuard allow={["plant_manager"]}><Utilisateurs /></RoleGuard>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
