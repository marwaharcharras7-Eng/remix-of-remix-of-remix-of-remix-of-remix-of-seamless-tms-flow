import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Scale } from "lucide-react";
import { toast } from "sonner";

export default function PontBascule() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mission_id: "", type_pesee: "chargement", poids_mesure: "", poids_theorique: "" });

  const load = async () => {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("pesees_pont_bascule").select("*, missions(reference, destination), vehicules(immatriculation)").order("date_mesure", { ascending: false }),
      supabase.from("missions").select("id, reference, vehicule_id, destination").in("statut", ["affectee", "en_cours", "livree"]),
    ]);
    setItems(p || []); setMissions(m || []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = missions.find((x) => x.id === form.mission_id);
    const { error } = await supabase.from("pesees_pont_bascule").insert({
      mission_id: form.mission_id, vehicule_id: m?.vehicule_id || null,
      type_pesee: form.type_pesee, poids_mesure: Number(form.poids_mesure),
      poids_theorique: form.poids_theorique ? Number(form.poids_theorique) : null,
      operateur: user?.id,
    });
    if (error) return toast.error(error.message);
    // Sync mission poids
    if (form.type_pesee === "chargement") await supabase.from("missions").update({ poids_charge: Number(form.poids_mesure) }).eq("id", form.mission_id);
    else await supabase.from("missions").update({ poids_livre: Number(form.poids_mesure) }).eq("id", form.mission_id);
    toast.success("Pesée enregistrée");
    setOpen(false); setForm({ mission_id: "", type_pesee: "chargement", poids_mesure: "", poids_theorique: "" });
    load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Pont bascule" description="P4 — Pesée chargement / livraison" actions={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle pesée</Button>} />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Mission</th>
              <th className="px-4 py-3 text-left">Véhicule</th><th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Poids mesuré</th><th className="px-4 py-3 text-right">Théorique</th>
              <th className="px-4 py-3 text-right">Écart</th>
            </tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-muted-foreground"><Scale className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucune pesée</td></tr>
              : items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.date_mesure).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.missions?.reference || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.vehicules?.immatriculation || "—"}</td>
                  <td className="px-4 py-3 capitalize">{p.type_pesee}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{Number(p.poids_mesure).toFixed(2)} t</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.poids_theorique ? `${Number(p.poids_theorique).toFixed(2)} t` : "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${Math.abs(Number(p.ecart || 0)) > 1 ? "text-warning font-semibold" : ""}`}>{p.ecart != null ? `${Number(p.ecart).toFixed(2)} t` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle pesée</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5"><Label>Mission *</Label>
              <Select value={form.mission_id} onValueChange={(v) => setForm({ ...form, mission_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{missions.map((m) => <SelectItem key={m.id} value={m.id}>{m.reference} → {m.destination}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Type *</Label>
              <Select value={form.type_pesee} onValueChange={(v) => setForm({ ...form, type_pesee: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="chargement">Chargement</SelectItem><SelectItem value="livraison">Livraison</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Poids mesuré (t) *</Label><Input type="number" step="0.01" value={form.poids_mesure} onChange={(e) => setForm({ ...form, poids_mesure: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Poids théorique (t)</Label><Input type="number" step="0.01" value={form.poids_theorique} onChange={(e) => setForm({ ...form, poids_theorique: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={!form.mission_id}>Enregistrer</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
