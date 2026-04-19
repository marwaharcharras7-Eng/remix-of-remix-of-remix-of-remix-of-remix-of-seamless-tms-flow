import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Play, Square, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Fix icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Casablanca par défaut
const DEFAULT_CENTER: [number, number] = [33.5731, -7.5898];

export default function SuiviGPS() {
  const { hasRole, user } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [positions, setPositions] = useState<any[]>([]);
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef<NodeJS.Timeout | null>(null);

  const loadMissions = async () => {
    let q = supabase.from("missions").select("id, reference, origine, destination, vehicule_id, chauffeur_id, chauffeurs(user_id)").in("statut", ["affectee", "en_cours"]);
    const { data } = await q;
    let filtered = data || [];
    if (hasRole("chauffeur") && !hasRole("administrateur") && !hasRole("planificateur")) {
      filtered = filtered.filter((m: any) => m.chauffeurs?.user_id === user?.id);
    }
    setMissions(filtered);
    if (filtered.length > 0 && !selected) setSelected(filtered[0].id);
  };

  const loadPositions = async (mid: string) => {
    const { data } = await supabase.from("gps_positions").select("*").eq("mission_id", mid).order("date_heure", { ascending: true }).limit(200);
    setPositions(data || []);
  };

  useEffect(() => { loadMissions(); }, []);
  useEffect(() => {
    if (!selected) return;
    loadPositions(selected);
    const ch = supabase.channel(`gps-${selected}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "gps_positions", filter: `mission_id=eq.${selected}` },
      (p) => setPositions((prev) => [...prev, p.new])).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  const simulate = async () => {
    if (simulating) {
      if (simRef.current) clearInterval(simRef.current);
      setSimulating(false); return;
    }
    if (!selected) return;
    const m = missions.find((x) => x.id === selected);
    if (!m) return;
    setSimulating(true);
    let lat = DEFAULT_CENTER[0] + (Math.random() - 0.5) * 0.02;
    let lng = DEFAULT_CENTER[1] + (Math.random() - 0.5) * 0.02;
    simRef.current = setInterval(async () => {
      lat += (Math.random() - 0.4) * 0.005;
      lng += (Math.random() - 0.4) * 0.005;
      await supabase.from("gps_positions").insert({
        mission_id: selected, vehicule_id: m.vehicule_id,
        latitude: lat, longitude: lng, vitesse: 40 + Math.random() * 40,
      });
    }, 3000);
    toast.success("Simulation GPS démarrée (1 point / 3s)");
  };

  const last = positions[positions.length - 1];
  const center: [number, number] = last ? [Number(last.latitude), Number(last.longitude)] : DEFAULT_CENTER;
  const path: [number, number][] = positions.map((p) => [Number(p.latitude), Number(p.longitude)]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Suivi GPS" description="P4 — Position temps réel des véhicules en mission"
        actions={
          <div className="flex items-center gap-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Choisir une mission" /></SelectTrigger>
              <SelectContent>{missions.map((m) => <SelectItem key={m.id} value={m.id}>{m.reference} — {m.destination}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={simulate} variant={simulating ? "destructive" : "default"} disabled={!selected}>
              {simulating ? <><Square className="mr-2 h-4 w-4" />Stopper</> : <><Play className="mr-2 h-4 w-4" />Simuler</>}
            </Button>
          </div>
        } />
      <div className="flex-1 p-6">
        <Card className="overflow-hidden">
          {missions.length === 0 ? (
            <div className="flex h-[500px] flex-col items-center justify-center text-muted-foreground">
              <MapPin className="mb-2 h-10 w-10 opacity-40" />Aucune mission active
            </div>
          ) : (
            <div className="h-[600px]">
              <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} key={selected}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {path.length > 1 && <Polyline positions={path} color="hsl(22 95% 55%)" weight={4} />}
                {last && (
                  <Marker position={center}>
                    <Popup>
                      <div className="text-xs">
                        <div className="font-bold">Position actuelle</div>
                        <div>Vitesse : {Number(last.vitesse).toFixed(1)} km/h</div>
                        <div>{new Date(last.date_heure).toLocaleString("fr-FR")}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          )}
        </Card>
        <p className="mt-3 text-xs text-muted-foreground">{positions.length} point(s) GPS enregistrés{last && ` · dernière vitesse : ${Number(last.vitesse).toFixed(1)} km/h`}</p>
      </div>
    </div>
  );
}
