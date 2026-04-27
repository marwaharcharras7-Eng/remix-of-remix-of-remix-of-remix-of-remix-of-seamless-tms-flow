import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, AppRole } from "@/lib/tms-types";
import { PageHeader } from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/common/KpiCard";
import {
  Truck, Users, Route, AlertTriangle, Receipt, Send, Activity,
  TrendingUp, Fuel, MapPin, UserCog, Building2, ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const COLORS = ["hsl(215 60% 22%)", "hsl(22 95% 55%)", "hsl(145 65% 42%)", "hsl(38 95% 50%)", "hsl(0 75% 50%)", "hsl(215 15% 50%)"];

// Détermine le rôle "principal" affiché en titre
function primaryRole(roles: AppRole[]): AppRole | null {
  const order: AppRole[] = ["admin_it","plant_manager","manager_logistique","planificateur","responsable_flotte","chauffeur"];
  for (const r of order) if (roles.includes(r)) return r;
  return null;
}

export default function Dashboard() {
  const { roles, user } = useAuth();
  const role = primaryRole(roles);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tableau de bord"
        description={`Bienvenue ${user?.email} · ${role ? ROLE_LABELS[role] : "—"}`}
      />
      <div className="flex-1 space-y-6 p-6">
        {role === "admin_it" && <AdminITDashboard />}
        {role === "plant_manager" && <ManagerDashboard variant="plant_manager" />}
        {role === "manager_logistique" && <ManagerDashboard variant="manager_logistique" />}
        {role === "planificateur" && <PlanificateurDashboard />}
        {role === "responsable_flotte" && <RespFlotteDashboard userId={user?.id} />}
        {role === "chauffeur" && <ChauffeurDashboard userId={user?.id} />}
        {!role && <p className="text-muted-foreground">Aucun rôle attribué. Contactez l'Admin IT.</p>}
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN IT — gestion des utilisateurs & supervision IT
   ========================================================= */
function AdminITDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    rolesDistinct: 0,
    respFlotteCount: 0,
    respFlotteAssigned: 0,
    chauffeursLies: 0,
    flottesTotal: 0,
    byRole: [] as { name: string; value: number }[],
    recentUsers: [] as any[],
    signupsByDay: [] as { date: string; count: number }[],
  });

  useEffect(() => {
    (async () => {
      const [
        { data: profiles },
        { data: rolesRows },
        { data: rff },
        { data: flottes },
        { data: chauffeurs },
      ] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("responsable_flotte_flottes").select("user_id, flotte_id"),
        supabase.from("flottes").select("id"),
        supabase.from("chauffeurs").select("user_id"),
      ]);

      // Comptage par rôle
      const counts: Record<string, number> = {};
      (rolesRows || []).forEach((r: any) => { counts[r.role] = (counts[r.role] || 0) + 1; });

      // Utilisateurs avec/sans rôle
      const userIdsWithRole = new Set((rolesRows || []).map((r: any) => r.user_id));
      const activeUsers = (profiles || []).filter((p: any) => userIdsWithRole.has(p.user_id)).length;

      // Responsables flotte avec assignation
      const respFlotteIds = new Set((rolesRows || []).filter((r: any) => r.role === "responsable_flotte").map((r: any) => r.user_id));
      const respWithFlottes = new Set((rff || []).map((r: any) => r.user_id));
      const respFlotteAssigned = [...respFlotteIds].filter((id) => respWithFlottes.has(id)).length;

      // Chauffeurs liés à un user
      const chauffeursLies = (chauffeurs || []).filter((c: any) => c.user_id).length;

      // Inscriptions sur 7 jours
      const days: Record<string, { date: string; count: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = d.toISOString().slice(0, 10);
        days[k] = { date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }), count: 0 };
      }
      (profiles || []).forEach((p: any) => {
        const k = p.created_at?.slice(0, 10);
        if (k && days[k]) days[k].count++;
      });

      // Derniers comptes (5)
      const recentUsers = (profiles || []).slice(0, 5).map((p: any) => ({
        ...p,
        roles: (rolesRows || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      }));

      setStats({
        users: profiles?.length || 0,
        activeUsers,
        inactiveUsers: (profiles?.length || 0) - activeUsers,
        rolesDistinct: Object.keys(counts).length,
        respFlotteCount: respFlotteIds.size,
        respFlotteAssigned,
        chauffeursLies,
        flottesTotal: flottes?.length || 0,
        byRole: Object.entries(counts).map(([name, value]) => ({ name: ROLE_LABELS[name as AppRole] || name, value })),
        recentUsers,
        signupsByDay: Object.values(days),
      });
    })();
  }, []);

  return (
    <>
      <div className="rounded-md border border-info/30 bg-info/5 p-3 text-xs">
        🔐 <strong>Espace Admin IT</strong> — Vous supervisez les comptes, les rôles et les accès. Vous n'avez pas de droits métier (lecture seule).
      </div>

      {/* KPIs principaux IT */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Utilisateurs total" value={stats.users} icon={UserCog} tone="primary" />
        <KpiCard label="Comptes actifs" value={stats.activeUsers} icon={ShieldCheck} tone="success" delta={`${stats.inactiveUsers} sans rôle`} />
        <KpiCard label="Rôles distincts" value={`${stats.rolesDistinct} / 6`} icon={Activity} tone="info" />
        <KpiCard label="Resp. flotte assignés" value={`${stats.respFlotteAssigned} / ${stats.respFlotteCount}`} icon={Building2} tone={stats.respFlotteAssigned < stats.respFlotteCount ? "warning" : "success"} />
      </div>

      {/* KPIs secondaires */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Flottes configurées" value={stats.flottesTotal} icon={Building2} tone="info" />
        <KpiCard label="Chauffeurs liés à un compte" value={stats.chauffeursLies} icon={Users} tone="success" />
        <KpiCard label="Modules sécurisés (RLS)" value="13" icon={ShieldCheck} tone="success" />
        <KpiCard label="Politiques d'accès" value="50+" icon={Activity} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Répartition par rôle */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Répartition des utilisateurs par rôle</h3>
          {stats.byRole.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.byRole} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={(e) => `${e.name}: ${e.value}`}>
                  {stats.byRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Inscriptions 7j */}
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Inscriptions — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats.signupsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Nouveaux comptes" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Derniers comptes créés */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Derniers comptes créés</h3>
          <Button asChild variant="outline" size="sm"><Link to="/utilisateurs">Gérer les utilisateurs</Link></Button>
        </div>
        <table className="w-full text-sm data-table">
          <thead><tr className="border-b border-border">
            <th className="px-3 py-2 text-left">Nom</th>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Rôle(s)</th>
            <th className="px-3 py-2 text-left">Créé le</th>
          </tr></thead>
          <tbody>
            {stats.recentUsers.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Aucun compte récent.</td></tr>
            ) : stats.recentUsers.map((u: any) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{u.prenom} {u.nom}</td>
                <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2">
                  {u.roles.length === 0
                    ? <span className="text-xs text-warning">Aucun rôle</span>
                    : u.roles.map((r: AppRole) => (
                      <span key={r} className="mr-1 inline-block rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {ROLE_LABELS[r]}
                      </span>
                    ))}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Actions rapides IT */}
      <Card className="p-5">
        <h3 className="font-semibold">Actions rapides</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link to="/utilisateurs"><UserCog className="mr-2 h-4 w-4" />Gérer les utilisateurs & rôles</Link></Button>
          <Button asChild variant="outline"><Link to="/flottes">Voir les flottes</Link></Button>
          <Button asChild variant="outline"><Link to="/chauffeurs">Voir les chauffeurs</Link></Button>
        </div>
      </Card>
    </>
  );
}

/* =========================================================
   PLANT MANAGER & MANAGER LOGISTIQUE — vue métier complète
   ========================================================= */
function ManagerDashboard({ variant }: { variant: "plant_manager" | "manager_logistique" }) {
  const [kpi, setKpi] = useState<any>(null);
  const [vehStatuts, setVehStatuts] = useState<{ name: string; value: number }[]>([]);
  const [missionsByDay, setMissionsByDay] = useState<any[]>([]);
  const [recentMissions, setRecentMissions] = useState<any[]>([]);

  const load = async () => {
    const [{ data: k }, { data: vs }, { data: rm }] = await Promise.all([
      supabase.from("v_kpi_global").select("*").maybeSingle(),
      supabase.from("vehicules").select("statut"),
      supabase.from("missions").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    setKpi(k);
    const counts: Record<string, number> = {};
    (vs || []).forEach((v: any) => { counts[v.statut] = (counts[v.statut] || 0) + 1; });
    const STATUT_VEH_LABELS: Record<string,string> = {
      disponible: "Disponible", affecte: "Affecté", en_mission: "En mission",
      maintenance: "Maintenance", retire: "Retiré",
    };
    setVehStatuts(Object.entries(counts).map(([name, value]) => ({ name: STATUT_VEH_LABELS[name] || name, value })));

    const { data: m7 } = await supabase
      .from("missions").select("created_at, statut")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    const days: Record<string, { date: string; missions: number; cloturees: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k2 = d.toISOString().slice(0, 10);
      days[k2] = { date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }), missions: 0, cloturees: 0 };
    }
    (m7 || []).forEach((m: any) => {
      const k2 = m.created_at.slice(0, 10);
      if (days[k2]) {
        days[k2].missions++;
        if (m.statut === "cloturee") days[k2].cloturees++;
      }
    });
    setMissionsByDay(Object.values(days));
    setRecentMissions(rm || []);
  };

  useEffect(() => { load(); }, []);

  const tauxUtil = kpi && kpi.nb_vehicules_total > 0
    ? Math.round((kpi.nb_vehicules_en_mission / kpi.nb_vehicules_total) * 100) : 0;
  const consoMoyenne = kpi && kpi.km_total_parcourus > 0
    ? ((kpi.consommation_totale / kpi.km_total_parcourus) * 100).toFixed(1) : "0";

  return (
    <>
      {variant === "plant_manager" && (
        <div className="rounded-md border border-info/30 bg-info/5 p-3 text-xs">
          ℹ️ <strong>Plant Manager</strong> : vous avez tous les droits sauf modification du planning et des chauffeurs (lecture seule sur ces deux modules).
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Véhicules disponibles" value={`${kpi?.nb_vehicules_dispo ?? 0} / ${kpi?.nb_vehicules_total ?? 0}`} icon={Truck} tone="success" delta={`${tauxUtil}% en mission`} />
        <KpiCard label="Chauffeurs actifs" value={`${kpi?.nb_chauffeurs_dispo ?? 0} / ${kpi?.nb_chauffeurs_total ?? 0}`} icon={Users} tone="info" />
        <KpiCard label="Missions en cours" value={kpi?.nb_missions_actives ?? 0} icon={Route} tone="accent" delta={`${kpi?.nb_missions_cloturees ?? 0} clôturées`} />
        <KpiCard label="MAD en attente" value={kpi?.nb_mad_en_attente ?? 0} icon={Send} tone="warning" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Km parcourus" value={Math.round(kpi?.km_total_parcourus ?? 0).toLocaleString("fr-FR") + " km"} icon={MapPin} tone="primary" />
        <KpiCard label="Consommation moy." value={`${consoMoyenne} L/100km`} icon={Fuel} tone="warning" />
        <KpiCard label="Litiges actifs" value={kpi?.nb_litiges ?? 0} icon={AlertTriangle} tone={kpi && kpi.nb_litiges > 0 ? "warning" : "success"} />
        <KpiCard label="CA facturé" value={`${(kpi?.ca_total ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} MAD`} icon={Receipt} tone="success" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Activité missions — 7 derniers jours</h3>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={missionsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="missions" name="Créées" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="cloturees" name="Clôturées" stroke="hsl(var(--accent))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Statut de la flotte</h3>
          {vehStatuts.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Aucun véhicule enregistré
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={vehStatuts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(e) => `${e.name}: ${e.value}`}>
                  {vehStatuts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Missions récentes</h3>
          <Button asChild variant="outline" size="sm"><Link to="/missions">Voir tout</Link></Button>
        </div>
        <table className="w-full text-sm data-table">
          <thead><tr className="border-b border-border">
            <th className="px-3 py-2 text-left">Réf.</th><th className="px-3 py-2 text-left">Trajet</th>
            <th className="px-3 py-2 text-left">Statut</th>
          </tr></thead>
          <tbody>
            {recentMissions.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{m.reference}</td>
                <td className="px-3 py-2">{m.origine} → {m.destination}</td>
                <td className="px-3 py-2"><StatusBadge status={m.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

/* =========================================================
   PLANIFICATEUR — focus opérationnel
   ========================================================= */
function PlanificateurDashboard() {
  const [stats, setStats] = useState({ madAttente: 0, missionsActives: 0, vehDispo: 0, chauffDispo: 0 });
  useEffect(() => {
    (async () => {
      const [{ count: mad }, { count: mis }, { count: vd }, { count: cd }] = await Promise.all([
        supabase.from("mises_a_disposition").select("*", { count: "exact", head: true }).eq("statut", "creee"),
        supabase.from("missions").select("*", { count: "exact", head: true }).in("statut", ["affectee","en_cours"]),
        supabase.from("vehicules").select("*", { count: "exact", head: true }).eq("statut", "disponible"),
        supabase.from("chauffeurs").select("*", { count: "exact", head: true }).eq("disponibilite", true),
      ]);
      setStats({ madAttente: mad ?? 0, missionsActives: mis ?? 0, vehDispo: vd ?? 0, chauffDispo: cd ?? 0 });
    })();
  }, []);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="MAD à affecter" value={stats.madAttente} icon={Send} tone="warning" />
        <KpiCard label="Missions actives" value={stats.missionsActives} icon={Route} tone="accent" />
        <KpiCard label="Véhicules dispo" value={stats.vehDispo} icon={Truck} tone="success" />
        <KpiCard label="Chauffeurs dispo" value={stats.chauffDispo} icon={Users} tone="info" />
      </div>
      <Card className="p-5">
        <h3 className="font-semibold">Actions rapides</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link to="/plannings">Nouveau planning</Link></Button>
          <Button asChild variant="outline"><Link to="/mises-a-disposition">Affecter une MAD</Link></Button>
          <Button asChild variant="outline"><Link to="/missions">Suivre missions</Link></Button>
        </div>
      </Card>
    </>
  );
}

/* =========================================================
   RESPONSABLE FLOTTE — uniquement sa/ses flottes
   ========================================================= */
function RespFlotteDashboard({ userId }: { userId?: string }) {
  const [stats, setStats] = useState({ flottes: [] as any[], vehs: 0, chauffs: 0, incidents: 0, missions: 0 });
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: rff } = await supabase
        .from("responsable_flotte_flottes")
        .select("flotte_id, flottes(id, nom, type_transport)")
        .eq("user_id", userId);
      const flotteIds = (rff || []).map((r: any) => r.flotte_id);

      if (flotteIds.length === 0) {
        setStats({ flottes: [], vehs: 0, chauffs: 0, incidents: 0, missions: 0 });
        return;
      }

      const [{ count: vehs }, { count: chauffs }, { data: missions }] = await Promise.all([
        supabase.from("vehicules").select("*", { count: "exact", head: true }).in("flotte_id", flotteIds),
        supabase.from("chauffeurs").select("*", { count: "exact", head: true }).in("flotte_id", flotteIds),
        supabase.from("missions").select("id, statut, vehicule_id, vehicules!inner(flotte_id)").in("vehicules.flotte_id", flotteIds),
      ]);
      const missionIds = (missions || []).map((m: any) => m.id);
      let incidentCount = 0;
      if (missionIds.length > 0) {
        const { count: ic } = await supabase.from("incidents").select("*", { count: "exact", head: true }).in("mission_id", missionIds);
        incidentCount = ic ?? 0;
      }
      setStats({
        flottes: (rff || []).map((r: any) => r.flottes).filter(Boolean),
        vehs: vehs ?? 0,
        chauffs: chauffs ?? 0,
        missions: (missions || []).filter((m: any) => ["affectee","en_cours"].includes(m.statut)).length,
        incidents: incidentCount,
      });
    })();
  }, [userId]);

  return (
    <>
      <div className="rounded-md border border-info/30 bg-info/5 p-3 text-xs">
        ℹ️ Vous gérez <strong>{stats.flottes.length}</strong> flotte(s) :{" "}
        {stats.flottes.length === 0 ? <em>aucune assignée — contactez Admin IT</em>
          : stats.flottes.map((f: any) => f.nom).join(", ")}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Mes flottes" value={stats.flottes.length} icon={Building2} tone="primary" />
        <KpiCard label="Véhicules" value={stats.vehs} icon={Truck} tone="info" />
        <KpiCard label="Chauffeurs" value={stats.chauffs} icon={Users} tone="success" />
        <KpiCard label="Incidents (total)" value={stats.incidents} icon={AlertTriangle} tone={stats.incidents > 0 ? "warning" : "success"} />
      </div>
      <Card className="p-5">
        <h3 className="font-semibold">Actions rapides</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link to="/vehicules">Mes véhicules</Link></Button>
          <Button asChild variant="outline"><Link to="/chauffeurs">Mes chauffeurs</Link></Button>
          <Button asChild variant="outline"><Link to="/incidents">Incidents</Link></Button>
          <Button asChild variant="outline"><Link to="/suivi-gps">Suivi GPS</Link></Button>
        </div>
      </Card>
    </>
  );
}

/* =========================================================
   CHAUFFEUR — ses missions
   ========================================================= */
function ChauffeurDashboard({ userId }: { userId?: string }) {
  const [data, setData] = useState<any>({
    chauffeur: null, enCours: 0, terminees: 0, totalMissions: 0,
    prochaine: null, recentes: [] as any[], incidents: 0,
    activityByDay: [] as any[], kmMois: 0, missionsMois: 0,
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: ch } = await supabase
        .from("chauffeurs")
        .select("id, nom, prenom, taux_performance, km_parcourus_total, consommation_moyenne, type_permis, disponibilite")
        .eq("user_id", userId).maybeSingle();
      if (!ch) { setData((d: any) => ({ ...d, chauffeur: null })); return; }

      const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

      const [
        { data: enCours },
        { count: term },
        { count: total },
        { data: nextMis },
        { data: recentes },
        { data: incidentsRows },
        { data: missionsMois },
      ] = await Promise.all([
        supabase.from("missions").select("id").eq("chauffeur_id", ch.id).in("statut", ["affectee","en_cours"]),
        supabase.from("missions").select("*", { count: "exact", head: true }).eq("chauffeur_id", ch.id).in("statut", ["livree","cloturee","facturee"]),
        supabase.from("missions").select("*", { count: "exact", head: true }).eq("chauffeur_id", ch.id),
        supabase.from("missions").select("*").eq("chauffeur_id", ch.id).in("statut", ["affectee","en_cours"]).order("date_debut_prevue").limit(1),
        supabase.from("missions").select("id, reference, origine, destination, statut, date_debut_prevue").eq("chauffeur_id", ch.id).order("date_debut_prevue", { ascending: false }).limit(5),
        supabase.from("incidents").select("id, mission_id, missions!inner(chauffeur_id)").eq("missions.chauffeur_id", ch.id),
        supabase.from("missions").select("id, km_reels, date_debut_prevue, statut").eq("chauffeur_id", ch.id).gte("date_debut_prevue", since30),
      ]);

      // Activité 7 derniers jours
      const days: Record<string, { date: string; missions: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = d.toISOString().slice(0, 10);
        days[k] = { date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }), missions: 0 };
      }
      (missionsMois || []).forEach((m: any) => {
        const k = m.date_debut_prevue?.slice(0, 10);
        if (k && days[k]) days[k].missions++;
      });

      const kmMois = (missionsMois || []).reduce((s: number, m: any) => s + (Number(m.km_reels) || 0), 0);

      setData({
        chauffeur: ch,
        enCours: enCours?.length || 0,
        terminees: term ?? 0,
        totalMissions: total ?? 0,
        prochaine: nextMis?.[0] || null,
        recentes: recentes || [],
        incidents: incidentsRows?.length || 0,
        activityByDay: Object.values(days),
        kmMois,
        missionsMois: (missionsMois || []).length,
      });
    })();
  }, [userId]);

  const ch = data.chauffeur;
  if (!ch) {
    return (
      <div className="rounded-md border border-warning/30 bg-warning/5 p-4 text-sm">
        ⚠️ Aucun profil chauffeur lié à votre compte. Contactez le manager logistique.
      </div>
    );
  }

  const perfTone: "success" | "warning" | "destructive" =
    ch.taux_performance >= 85 ? "success" : ch.taux_performance >= 65 ? "warning" : "destructive";

  return (
    <>
      <div className="rounded-md border border-info/30 bg-info/5 p-3 text-xs">
        🚛 Bonjour <strong>{ch.prenom} {ch.nom}</strong> — Permis {ch.type_permis} ·{" "}
        {ch.disponibilite ? <span className="text-success">Disponible</span> : <span className="text-warning">Indisponible</span>}
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Missions en cours" value={data.enCours} icon={Route} tone="accent" />
        <KpiCard label="Missions terminées" value={data.terminees} icon={Truck} tone="success" delta={`${data.totalMissions} au total`} />
        <KpiCard label="Km parcourus (total)" value={Math.round(Number(ch.km_parcourus_total) || 0).toLocaleString("fr-FR") + " km"} icon={MapPin} tone="primary" />
        <KpiCard label="Performance" value={`${Math.round(Number(ch.taux_performance) || 0)} / 100`} icon={Activity} tone={perfTone} />
      </div>

      {/* KPIs secondaires */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Missions (30j)" value={data.missionsMois} icon={Route} tone="info" />
        <KpiCard label="Km (30j)" value={Math.round(data.kmMois).toLocaleString("fr-FR") + " km"} icon={MapPin} tone="info" />
        <KpiCard label="Conso. moyenne" value={`${Number(ch.consommation_moyenne || 0).toFixed(1)} L/100km`} icon={Fuel} tone="warning" />
        <KpiCard label="Incidents déclarés" value={data.incidents} icon={AlertTriangle} tone={data.incidents > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activité */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Mon activité — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.activityByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="missions" name="Missions" stroke="hsl(var(--accent))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Prochaine mission */}
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">🚛 Prochaine mission</h3>
          {data.prochaine ? (
            <div className="space-y-2 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{data.prochaine.reference}</p>
              <p className="font-medium">{data.prochaine.origine} → {data.prochaine.destination}</p>
              <p className="text-xs text-muted-foreground">
                Départ : {new Date(data.prochaine.date_debut_prevue).toLocaleString("fr-FR")}
              </p>
              <StatusBadge status={data.prochaine.statut} />
              <Button asChild size="sm" className="mt-3 w-full">
                <Link to="/mes-missions">Voir mes missions</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune mission à venir.</p>
          )}
        </Card>
      </div>

      {/* Missions récentes */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Mes dernières missions</h3>
          <Button asChild variant="outline" size="sm"><Link to="/mes-missions">Voir tout</Link></Button>
        </div>
        <table className="w-full text-sm data-table">
          <thead><tr className="border-b border-border">
            <th className="px-3 py-2 text-left">Réf.</th>
            <th className="px-3 py-2 text-left">Trajet</th>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Statut</th>
          </tr></thead>
          <tbody>
            {data.recentes.length === 0 ? (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Aucune mission.</td></tr>
            ) : data.recentes.map((m: any) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{m.reference}</td>
                <td className="px-3 py-2">{m.origine} → {m.destination}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {m.date_debut_prevue ? new Date(m.date_debut_prevue).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="px-3 py-2"><StatusBadge status={m.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Actions rapides */}
      <Card className="p-5">
        <h3 className="font-semibold">Actions rapides</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild><Link to="/mes-missions">Mes missions</Link></Button>
          <Button asChild variant="outline"><Link to="/suivi-gps">Suivi GPS</Link></Button>
          <Button asChild variant="outline"><Link to="/pont-bascule">Pont bascule</Link></Button>
          <Button asChild variant="outline"><Link to="/incidents">Déclarer un incident</Link></Button>
        </div>
      </Card>
    </>
  );
}
