import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { email: "admin@tms.demo",      password: "Demo1234!", nom: "Admin",       prenom: "TMS",       role: "administrateur" },
  { email: "planif@tms.demo",     password: "Demo1234!", nom: "Planificateur", prenom: "Demo",    role: "planificateur" },
  { email: "chauffeur@tms.demo",  password: "Demo1234!", nom: "Chauffeur",   prenom: "Demo",      role: "chauffeur" },
  { email: "compta@tms.demo",     password: "Demo1234!", nom: "Comptable",   prenom: "Demo",      role: "comptable" },
  { email: "direction@tms.demo",  password: "Demo1234!", nom: "Direction",   prenom: "Demo",      role: "direction" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const results: any[] = [];

    for (const u of DEMO_USERS) {
      // Try create user (auto-confirmed). If it already exists, fetch and ensure role.
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nom: u.nom, prenom: u.prenom, role: u.role },
      });

      let userId = created?.user?.id;
      let status = "created";

      if (createErr) {
        // User probably already exists; look up by listing
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

      // Ensure profile (trigger should have done it, but be defensive)
      await admin.from("profiles").upsert(
        { user_id: userId, nom: u.nom, prenom: u.prenom, email: u.email },
        { onConflict: "user_id" },
      );

      // Reset role to the intended one
      await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: u.role });

      results.push({
        email: u.email,
        password: u.password,
        role: u.role,
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