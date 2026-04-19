import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { VEHICULE_STATUTS, STATUT_LABELS, TYPES_VEHICULE } from "@/lib/tms-types";

export default function Vehicules() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("administrateur") || hasRole("planificateur");
  const [items, setItems] = useState<any[]>([]);
  const [flottes, setFlottes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<{ immatriculation: string; type_vehicule: string; capacite_tonnage: string; capacite_volume: string; statut: string; flotte_id: string; consommation_moyenne: string; km_total: string }>({
    immatriculation: "", type_vehicule: TYPES_VEHICULE[0], capacite_tonnage: "10", capacite_volume: "30",
    statut: "disponible", flotte_id: "none", consommation_moyenne: "30", km_total: "0",
  });

  const load = async () => {
    const [{ data: v }, { data: f }] = await Promise.all([
      supabase.from("vehicules").select("*, flottes(nom)").order("immatriculation"),
      supabase.from("flottes").select("id, nom").order("nom"),
    ]);
    setItems(v || []); setFlottes(f || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ immatriculation: "", type_vehicule: TYPES_VEHICULE[0], capacite_tonnage: "10", capacite_volume: "30", statut: "disponible", flotte_id: "none", consommation_moyenne: "30", km_total: "0" });
    setOpen(true);
  };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      immatriculation: v.immatriculation,
      type_vehicule: TYPES_VEHICULE.includes(v.type_vehicule) ? v.type_vehicule : TYPES_VEHICULE[0],
      capacite_tonnage: String(v.capacite_tonnage), capacite_volume: String(v.capacite_volume),
      statut: v.statut, flotte_id: v.flotte_id || "none",
      consommation_moyenne: String(v.consommation_moyenne), km_total: String(v.km_total),
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      immatriculation: form.immatriculation,
      type_vehicule: form.type_vehicule,
      capacite_tonnage: Number(form.capacite_tonnage),
      capacite_volume: Number(form.capacite_volume),
      statut: form.statut as any,
      flotte_id: form.flotte_id === "none" ? null : form.flotte_id,
      consommation_moyenne: Number(form.consommation_moyenne),
      km_total: Number(form.km_total),
    };
    const { error } = editing
      ? await supabase.from("vehicules").update(payload).eq("id", editing.id)
      : await supabase.from("vehicules").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "✅ Véhicule mis à jour avec succès" : "✅ Véhicule créé avec succès");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce véhicule ?")) return;
    const { error } = await supabase.from("vehicules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("✅ Véhicule supprimé"); load();
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Véhicules" description="Parc, capacités et statuts"
        actions={canEdit && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau véhicule</Button>}
      />
      <div className="flex-1 p-6">
        <Card>
          <table className="w-full text-sm data-table">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left">Immat.</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Flotte</th>
              <th className="px-4 py-3 text-right">Tonnage</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">Conso (L/100)</th>
              <th className="px-4 py-3 text-left">Statut</th>
              {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <Truck className="mx-auto mb-2 h-8 w-8 opacity-40" />Aucun véhicule
                </td></tr>
              ) : items.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono font-medium">{v.immatriculation}</td>
                  <td className="px-4 py-3">{v.type_vehicule}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.flottes?.nom || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(v.capacite_tonnage).toFixed(1)} t</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(v.capacite_volume).toFixed(1)} m³</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(v.consommation_moyenne).toFixed(1)}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.statut} /></td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      {hasRole("administrateur") && <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Modifier véhicule" : "Nouveau véhicule"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Immatriculation *</Label><Input value={form.immatriculation} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} required /></div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type_vehicule} onValueChange={(v) => setForm({ ...form, type_vehicule: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES_VEHICULE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tonnage (t)</Label><Input type="number" step="0.1" value={form.capacite_tonnage} onChange={(e) => setForm({ ...form, capacite_tonnage: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Volume (m³)</Label><Input type="number" step="0.1" value={form.capacite_volume} onChange={(e) => setForm({ ...form, capacite_volume: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Conso moyenne (L/100km)</Label><Input type="number" step="0.1" value={form.consommation_moyenne} onChange={(e) => setForm({ ...form, consommation_moyenne: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Km total</Label><Input type="number" value={form.km_total} onChange={(e) => setForm({ ...form, km_total: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Flotte</Label>
                <Select value={form.flotte_id} onValueChange={(v) => setForm({ ...form, flotte_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {flottes.map((f) => <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICULE_STATUTS.map((s) => <SelectItem key={s} value={s}>{STATUT_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button type="submit">{editing ? "Mettre à jour" : "Créer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
