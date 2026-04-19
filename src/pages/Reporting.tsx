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
    const { data: missions } = await supabase.from("missions").select("*, chauffeurs(nom, prenom), vehicules(immatriculation, capacite_tonnage)");
    if (!missions) return;

    // KPI Chauffeur
    const byCh: Record<string, any> = {};
    missions.forEach((m: any) => {
      if (!m.chauffeurs) return;
      const k = `${m.chauffeurs.prenom} ${m.chauffeurs.nom}`;
      byCh[k] ??= { nom: k, km: 0, conso: 0, missions: 0, litiges: 0, attente: 0 };
      byCh[k].km += Number(m.km_reels || 0);
      byCh[k].conso += Number(m.consommation_gasoil || 0);
      byCh[k].missions += 1;
      if (m.litige) byCh[k].litiges += 1;
      byCh[k].attente += Number(m.temps_attente_min || 0);
    });
    setChauffeursKpi(Object.values(byCh));

    // KPI Flotte (par véhicule)
    const byVeh: Record<string, any> = {};
    missions.forEach((m: any) => {
      if (!m.vehicules) return;
      const k = m.vehicules.immatriculation;
      byVeh[k] ??= { vehicule: k, missions: 0, km: 0, tx_remplissage: 0, capacite: m.vehicules.capacite_tonnage, charges: 0, retards: 0 };
      byVeh[k].missions += 1;
      byVeh[k].km += Number(m.km_reels || 0);
      if (m.poids_charge && m.vehicules.capacite_tonnage) byVeh[k].charges += (Number(m.poids_charge) / Number(m.vehicules.capacite_tonnage)) * 100;
      if (m.date_fin_reelle && m.date_fin_prevue && new Date(m.date_fin_reelle) > new Date(m.date_fin_prevue)) byVeh[k].retards += 1;
    });
    Object.values(byVeh).forEach((v: any) => { v.tx_remplissage = v.missions > 0 ? v.charges / v.missions : 0; });
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
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Reporting & KPI" description="P5/P6 — Indicateurs de performance dynamiques" />
      <div className="flex-1 space-y-6 p-6">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="font-semibold">KPI Chauffeurs</h3><p className="text-xs text-muted-foreground">Km, consommation, litiges, attente</p></div>
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
                  <Bar dataKey="litiges" name="Litiges" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm data-table">
                  <thead><tr className="border-b border-border"><th className="px-3 py-2 text-left">Chauffeur</th><th className="px-3 py-2 text-right">Km</th><th className="px-3 py-2 text-right">Conso (L)</th><th className="px-3 py-2 text-right">Missions</th><th className="px-3 py-2 text-right">Litiges</th><th className="px-3 py-2 text-right">Attente (min)</th></tr></thead>
                  <tbody>{chauffeursKpi.map((c: any) => (
                    <tr key={c.nom} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{c.nom}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.km.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.conso.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.missions}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.litiges}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{c.attente}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div><h3 className="font-semibold">KPI Flotte</h3><p className="text-xs text-muted-foreground">Taux remplissage, retards, utilisation par véhicule</p></div>
            <Button size="sm" variant="outline" onClick={() => exportCsv(flotteKpi, "kpi-flotte")}><Download className="mr-2 h-4 w-4" />CSV</Button>
          </div>
          {flotteKpi.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm data-table">
                <thead><tr className="border-b border-border"><th className="px-3 py-2 text-left">Véhicule</th><th className="px-3 py-2 text-right">Missions</th><th className="px-3 py-2 text-right">Km</th><th className="px-3 py-2 text-right">Tx remplissage</th><th className="px-3 py-2 text-right">Retards</th></tr></thead>
                <tbody>{flotteKpi.map((v: any) => (
                  <tr key={v.vehicule} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono">{v.vehicule}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.missions}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.km.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.tx_remplissage.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{v.retards}</td>
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
