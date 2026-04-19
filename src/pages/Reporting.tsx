import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function Reporting() {
  const [chauffeursKpi, setChauffeursKpi] = useState<any[]>([]);
  const [flotteKpi, setFlotteKpi] = useState<any[]>([]);

  const load = async () => {
    // Récup missions + incidents en parallèle
    const [{ data: missions }, { data: incidents }] = await Promise.all([
      supabase.from("missions").select("*, chauffeurs(id, nom, prenom, consommation_moyenne, km_parcourus_total), vehicules(immatriculation, capacite_tonnage, consommation_moyenne, km_total)"),
      supabase.from("incidents").select("id, mission_id"),
    ]);
    if (!missions) return;

    // Index incidents par mission
    const incidentsByMission: Record<string, number> = {};
    (incidents || []).forEach((i) => {
      incidentsByMission[i.mission_id] = (incidentsByMission[i.mission_id] || 0) + 1;
    });

    // ===== KPI Chauffeur =====
    // Conso & km calculés à partir des missions livrées/clôturées (cohérent avec les triggers DB)
    const byCh: Record<string, any> = {};
    missions.forEach((m: any) => {
      if (!m.chauffeurs) return;
      const k = `${m.chauffeurs.prenom} ${m.chauffeurs.nom}`;
      byCh[k] ??= {
        nom: k,
        chauffeur_id: m.chauffeurs.id,
        km: 0, conso: 0, missions: 0, incidents: 0, attente: 0,
      };
      // On ne compte que les missions terminées pour conso & km
      const isTermine = ["livree", "cloturee", "facturee"].includes(m.statut);
      if (isTermine) {
        byCh[k].km += Number(m.km_reels || 0);
        byCh[k].conso += Number(m.consommation_gasoil || 0);
      }
      byCh[k].missions += 1;
      byCh[k].incidents += incidentsByMission[m.id] || 0;
      byCh[k].attente += Number(m.temps_attente_min || 0);
    });
    // Calcul conso L/100km
    Object.values(byCh).forEach((c: any) => {
      c.conso_l_100 = c.km > 0 ? (c.conso / c.km * 100) : 0;
    });
    setChauffeursKpi(Object.values(byCh));

    // ===== KPI Flotte =====
    const byVeh: Record<string, any> = {};
    missions.forEach((m: any) => {
      if (!m.vehicules) return;
      const k = m.vehicules.immatriculation;
      byVeh[k] ??= {
        vehicule: k, missions: 0, km: 0, tx_remplissage: 0,
        capacite: m.vehicules.capacite_tonnage, charges: 0, retards: 0,
        conso_total: 0, conso_l_100: 0,
      };
      const isTermine = ["livree", "cloturee", "facturee"].includes(m.statut);
      byVeh[k].missions += 1;
      if (isTermine) {
        byVeh[k].km += Number(m.km_reels || 0);
        byVeh[k].conso_total += Number(m.consommation_gasoil || 0);
      }
      if (m.poids_charge && m.vehicules.capacite_tonnage) byVeh[k].charges += (Number(m.poids_charge) / Number(m.vehicules.capacite_tonnage)) * 100;
      if (m.date_fin_reelle && m.date_fin_prevue && new Date(m.date_fin_reelle) > new Date(m.date_fin_prevue)) byVeh[k].retards += 1;
    });
    Object.values(byVeh).forEach((v: any) => {
      v.tx_remplissage = v.missions > 0 ? v.charges / v.missions : 0;
      v.conso_l_100 = v.km > 0 ? (v.conso_total / v.km * 100) : 0;
    });
    setFlotteKpi(Object.values(byVeh));
  };
  useEffect(() => { load(); }, []);

  const exportCsv = (data: any[], name: string) => {
    if (data.length === 0) return toast.error("Aucune donnée");
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("✅ Export CSV téléchargé");
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Reporting & KPI" description="P5/P6 — Indicateurs de performance dynamiques" />
      <div className="flex-1 space-y-6 p-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">KPI Chauffeurs</h3>
              <p className="text-xs text-muted-foreground">Km, consommation (L/100km), incidents, attente</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => exportCsv(chauffeursKpi, "kpi-chauffeurs")}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
          {chauffeursKpi.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée</p> : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chauffeursKpi}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nom" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="km" name="Km" fill="hsl(var(--primary))" />
                  <Bar dataKey="missions" name="Missions" fill="hsl(var(--accent))" />
                  <Bar dataKey="incidents" name="Incidents" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left">Chauffeur</th>
                      <th className="px-3 py-2 text-right">Km</th>
                      <th className="px-3 py-2 text-right">Conso (L/100km)</th>
                      <th className="px-3 py-2 text-right">Missions</th>
                      <th className="px-3 py-2 text-right">Incidents</th>
                      <th className="px-3 py-2 text-right">Attente (min)</th>
                    </tr>
                  </thead>
                  <tbody>{chauffeursKpi.map((c: any) => (
                    <tr key={c.nom} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{c.nom}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.km.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.conso_l_100.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.missions}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${c.incidents > 0 ? "text-destructive font-semibold" : ""}`}>{c.incidents}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.attente}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                💡 La consommation et les km sont calculés à partir des missions livrées/clôturées uniquement.
                Les incidents proviennent de la table Incidents (jointure réelle, plus du flag « litige »).
              </p>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">KPI Flotte</h3>
              <p className="text-xs text-muted-foreground">Taux remplissage, retards, consommation, utilisation par véhicule</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => exportCsv(flotteKpi, "kpi-flotte")}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
          {flotteKpi.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm data-table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left">Véhicule</th>
                    <th className="px-3 py-2 text-right">Missions</th>
                    <th className="px-3 py-2 text-right">Km</th>
                    <th className="px-3 py-2 text-right">Conso (L/100km)</th>
                    <th className="px-3 py-2 text-right">Tx remplissage</th>
                    <th className="px-3 py-2 text-right">Retards</th>
                  </tr>
                </thead>
                <tbody>{flotteKpi.map((v: any) => (
                  <tr key={v.vehicule} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono">{v.vehicule}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.missions}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.km.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.conso_l_100.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.tx_remplissage.toFixed(1)}%</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${v.retards > 0 ? "text-warning font-semibold" : ""}`}>{v.retards}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
