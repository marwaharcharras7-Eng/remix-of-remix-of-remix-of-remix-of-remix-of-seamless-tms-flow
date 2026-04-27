import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 6 comptes de démo (un par rôle) + 5 vrais responsables de flotte avec noms/prénoms réalistes
const DEMO_USERS = [
  { email: "admin@tms.demo",       password: "Demo1234!", nom: "El Amrani",   prenom: "Karim",    role: "admin_it" },
  { email: "plant@tms.demo",       password: "Demo1234!", nom: "Bennani",     prenom: "Hassan",   role: "plant_manager" },
  { email: "logistique@tms.demo",  password: "Demo1234!", nom: "Tazi",        prenom: "Salma",    role: "manager_logistique" },
  { email: "respflotte@tms.demo",  password: "Demo1234!", nom: "Alaoui",      prenom: "Youssef",  role: "responsable_flotte" },
  { email: "planif@tms.demo",      password: "Demo1234!", nom: "Chraibi",     prenom: "Nadia",    role: "planificateur" },
  { email: "chauffeur@tms.demo",   password: "Demo1234!", nom: "Berrada",     prenom: "Omar",     role: "chauffeur" },

  // Responsables de flotte additionnels (noms / prénoms réalistes pour la liste de sélection)
  { email: "rf.benjelloun@tms.demo", password: "Demo1234!", nom: "Benjelloun", prenom: "Mehdi",    role: "responsable_flotte", autoAssignAll: false },
  { email: "rf.idrissi@tms.demo",    password: "Demo1234!", nom: "Idrissi",    prenom: "Fatima",   role: "responsable_flotte", autoAssignAll: false },
  { email: "rf.fassi@tms.demo",      password: "Demo1234!", nom: "Fassi",      prenom: "Reda",     role: "responsable_flotte", autoAssignAll: false },
  { email: "rf.cherkaoui@tms.demo",  password: "Demo1234!", nom: "Cherkaoui",  prenom: "Sanaa",    role: "responsable_flotte", autoAssignAll: false },
  { email: "rf.ouazzani@tms.demo",   password: "Demo1234!", nom: "Ouazzani",   prenom: "Anas",     role: "responsable_flotte", autoAssignAll: false },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const results: any[] = [];

    for (const u of DEMO_USERS) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nom: u.nom, prenom: u.prenom, role: u.role },
      });

      let userId = created?.user?.id;
      let status = "created";

      if (createErr) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users?.find((x: any) => x.email === u.email);
        if (!existing) {
          results.push({ email: u.email, status: "error", error: createErr.message });
          continue;
        }
        userId = existing.id;
        status = "exists";
      }

      if (!userId) continue;

      await admin.from("profiles").upsert(
        { user_id: userId, nom: u.nom, prenom: u.prenom, email: u.email },
        { onConflict: "user_id" },
      );

      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: u.role });

      // Le compte démo "respflotte@tms.demo" reçoit toutes les flottes pour la démo
      // Les autres responsables de flotte sont créés "vides" (à assigner manuellement par l'admin)
      if (u.role === "responsable_flotte" && (u as any).autoAssignAll !== false) {
        await admin.from("responsable_flotte_flottes").delete().eq("user_id", userId);
        const { data: flottes } = await admin.from("flottes").select("id");
        if (flottes && flottes.length > 0) {
          await admin.from("responsable_flotte_flottes").insert(
            flottes.map((f: any) => ({ user_id: userId, flotte_id: f.id }))
          );
        }
      }

      results.push({
        email: u.email,
        password: u.password,
        role: u.role,
        nom: `${u.prenom} ${u.nom}`,
        status: roleErr ? `${status}/role-error` : status,
        error: roleErr?.message,
      });
    }

    return new Response(JSON.stringify({ ok: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
