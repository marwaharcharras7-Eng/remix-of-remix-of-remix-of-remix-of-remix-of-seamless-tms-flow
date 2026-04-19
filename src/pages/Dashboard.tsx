import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/tms-types";
import { PageHeader } from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/common/KpiCard";
import {
  Truck, Users, Route, AlertTriangle, Receipt, Send, Activity,
  TrendingUp, Fuel, MapPin, Clock, CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Kpi {
  nb_vehicules_total: number;
  nb_vehicules_dispo: number;
  nb_vehicules_en_mission: number;
  nb_chauffeurs_total: number;
  nb_chauffeurs_dispo: number;
  nb_missions_actives: number;
  nb_missions_cloturees: number;
  nb_litiges: number;
  km_total_parcourus: number;
  consommation_totale: number;
  ca_total: number;
  nb_mad_en_attente: number;
}

const COLORS = ["hsl(215 60% 22%)", "hsl(22 95% 55%)", "hsl(145 65% 42%)", "hsl(38 95% 50%)", "hsl(0 75% 50%)", "hsl(215 15% 50%)"];

export default function Dashboard() {
  const { roles, user } = useAuth();
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehStatuts, setVehStatuts] = useState<{ name: string; value: number }[]>([]);
  const [missionsByDay, setMissionsByDay] = useState<any[]>([]);
  const [recentMissions, setRecentMissions] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: k }, { data: vs }, { data: rm }] = await Promise.all([
        supabase.from("v_kpi_global").select("*").maybeSingle(),
        supabase.from("vehicules").select("statut"),
        supabase.from("missions").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      if (k) setKpi(k as any);

      // Vehicules par statut
      const counts: Record<string, number> = {};
      (vs || []).forEach((v: any) => { counts[v.statut] = (counts[v.statut] || 0) + 1; });
      setVehStatuts(Object.entries(counts).map(([name, value]) => ({ name, value })));

      // Missions 7 derniers jours
      const { data: m7 } = await supabase
        .from("missions").select("created_at, statut")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
      const days: Record<string, { date: string; missions: number; cloturees: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const k = d.toISOString().slice(0, 10);
        days[k] = { date: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }), missions: 0, cloturees: 0 };
      }
      (m7 || []).forEach((m: any) => {
        const k = m.created_at.slice(0, 10);
        if (days[k]) {
          days[k].missions++;
          if (m.statut === "cloturee") days[k].cloturees++;
        }
      });
      setMissionsByDay(Object.values(days));

      setRecentMissions(rm || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // Realtime sync
    const channel = supabase
      .channel("dashboard-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicules" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "mises_a_disposition" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const tauxUtil = kpi && kpi.nb_vehicules_total > 0
    ? Math.round((kpi.nb_vehicules_en_mission / kpi.nb_vehicules_total) * 100) : 0;
  const consoMoyenne = kpi && kpi.km_total_parcourus > 0
    ? ((kpi.consommation_totale / kpi.km_total_parcourus) * 100).toFixed(1) : "0";

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={`Tableau de bord`}
        description={`Bienvenue ${user?.email} · ${roles.map((r) => ROLE_LABELS[r]).join(", ") || "—"}`}
        actions={
          <Button onClick={load} variant="outline" size="sm">
            <Activity className="mr-2 h-4 w-4" /> Actualiser
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* KPI principaux */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Véhicules disponibles" value={`${kpi?.nb_vehicules_dispo ?? 0} / ${kpi?.nb_vehicules_total ?? 0}`} icon={Truck} tone="success" loading={loading} delta={`${tauxUtil}% en mission`} />
          <KpiCard label="Chauffeurs actifs" value={`${kpi?.nb_chauffeurs_dispo ?? 0} / ${kpi?.nb_chauffeurs_total ?? 0}`} icon={Users} tone="info" loading={loading} />
          <KpiCard label="Missions en cours" value={kpi?.nb_missions_actives ?? 0} icon={Route} tone="accent" loading={loading} delta={`${kpi?.nb_missions_cloturees ?? 0} clôturées`} />
          <KpiCard label="MAD en attente" value={kpi?.nb_mad_en_attente ?? 0} icon={Send} tone="warning" loading={loading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Km parcourus" value={Math.round(kpi?.km_total_parcourus ?? 0).toLocaleString("fr-FR") + " km"} icon={MapPin} tone="primary" loading={loading} />
          <KpiCard label="Consommation moy." value={`${consoMoyenne} L/100km`} icon={Fuel} tone="warning" loading={loading} />
          <KpiCard label="Litiges actifs" value={kpi?.nb_litiges ?? 0} icon={AlertTriangle} tone={kpi && kpi.nb_litiges > 0 ? "warning" : "success"} loading={loading} />
          <KpiCard label="CA facturé" value={`${(kpi?.ca_total ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} MAD`} icon={Receipt} tone="success" loading={loading} />
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Activité missions — 7 derniers jours</h3>
                <p className="text-xs text-muted-foreground">Créations vs clôtures</p>
              </div>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={missionsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="missions" name="Créées" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cloturees" name="Clôturées" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-semibold">Statut de la flotte</h3>
            {vehStatuts.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Aucun véhicule. <Link to="/vehicules" className="ml-1 text-primary hover:underline">Ajouter</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={vehStatuts} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(e) => `${e.name}: ${e.value}`}>
                    {vehStatuts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Missions récentes */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Missions récentes</h3>
            <Button asChild variant="outline" size="sm"><Link to="/missions">Voir tout</Link></Button>
          </div>
          {recentMissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune mission. Créez-en une depuis le module Missions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">Réf.</th>
                    <th className="px-3 py-2 text-left">Trajet</th>
                    <th className="px-3 py-2 text-left">Date prévue</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-right">Coût estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMissions.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-2.5 font-mono text-xs">{m.reference}</td>
                      <td className="px-3 py-2.5">{m.origine} → {m.destination}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{new Date(m.date_debut_prevue).toLocaleString("fr-FR")}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={m.statut} /></td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{Number(m.cout_estime).toLocaleString("fr-FR")} MAD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
