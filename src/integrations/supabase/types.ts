export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chauffeurs: {
        Row: {
          consommation_moyenne: number
          created_at: string
          disponibilite: boolean
          flotte_id: string | null
          id: string
          km_parcourus_total: number
          nom: string
          numero_permis: string
          prenom: string
          taux_performance: number
          telephone: string | null
          type_permis: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          consommation_moyenne?: number
          created_at?: string
          disponibilite?: boolean
          flotte_id?: string | null
          id?: string
          km_parcourus_total?: number
          nom: string
          numero_permis: string
          prenom: string
          taux_performance?: number
          telephone?: string | null
          type_permis?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          consommation_moyenne?: number
          created_at?: string
          disponibilite?: boolean
          flotte_id?: string | null
          id?: string
          km_parcourus_total?: number
          nom?: string
          numero_permis?: string
          prenom?: string
          taux_performance?: number
          telephone?: string | null
          type_permis?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chauffeurs_flotte_id_fkey"
            columns: ["flotte_id"]
            isOneToOne: false
            referencedRelation: "flottes"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client: string | null
          commentaire: string | null
          created_at: string
          created_by: string | null
          date_echeance: string | null
          date_emission: string
          id: string
          mission_id: string
          montant_ht: number
          montant_ttc: number
          numero: string
          statut: Database["public"]["Enums"]["facture_statut"]
          tva_taux: number
          updated_at: string
        }
        Insert: {
          client?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_emission?: string
          id?: string
          mission_id: string
          montant_ht?: number
          montant_ttc?: number
          numero: string
          statut?: Database["public"]["Enums"]["facture_statut"]
          tva_taux?: number
          updated_at?: string
        }
        Update: {
          client?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_emission?: string
          id?: string
          mission_id?: string
          montant_ht?: number
          montant_ttc?: number
          numero?: string
          statut?: Database["public"]["Enums"]["facture_statut"]
          tva_taux?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      flottes: {
        Row: {
          created_at: string
          id: string
          nom: string
          responsable: string | null
          type_transport: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          responsable?: string | null
          type_transport: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          responsable?: string | null
          type_transport?: string
          updated_at?: string
        }
        Relationships: []
      }
      gps_positions: {
        Row: {
          date_heure: string
          id: string
          latitude: number
          longitude: number
          mission_id: string
          vehicule_id: string | null
          vitesse: number | null
        }
        Insert: {
          date_heure?: string
          id?: string
          latitude: number
          longitude: number
          mission_id: string
          vehicule_id?: string | null
          vitesse?: number | null
        }
        Update: {
          date_heure?: string
          id?: string
          latitude?: number
          longitude?: number
          mission_id?: string
          vehicule_id?: string | null
          vitesse?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_positions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_positions_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          date_incident: string
          declare_par: string | null
          description: string
          gravite: Database["public"]["Enums"]["incident_gravite"]
          id: string
          mission_id: string
          resolu: boolean
          type_incident: string
        }
        Insert: {
          created_at?: string
          date_incident?: string
          declare_par?: string | null
          description: string
          gravite?: Database["public"]["Enums"]["incident_gravite"]
          id?: string
          mission_id: string
          resolu?: boolean
          type_incident: string
        }
        Update: {
          created_at?: string
          date_incident?: string
          declare_par?: string | null
          description?: string
          gravite?: Database["public"]["Enums"]["incident_gravite"]
          id?: string
          mission_id?: string
          resolu?: boolean
          type_incident?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mises_a_disposition: {
        Row: {
          commentaire: string | null
          cout_estime: number
          created_at: string
          created_by: string | null
          date_debut_prevue: string
          date_fin_prevue: string
          id: string
          nb_vehicules: number
          planification_id: string | null
          prestataire_id: string | null
          reference: string
          region_destination: string
          statut: Database["public"]["Enums"]["mad_statut"]
          type_prestation: Database["public"]["Enums"]["type_prestation"]
          type_vehicule_requis: string
          updated_at: string
        }
        Insert: {
          commentaire?: string | null
          cout_estime?: number
          created_at?: string
          created_by?: string | null
          date_debut_prevue: string
          date_fin_prevue: string
          id?: string
          nb_vehicules?: number
          planification_id?: string | null
          prestataire_id?: string | null
          reference: string
          region_destination: string
          statut?: Database["public"]["Enums"]["mad_statut"]
          type_prestation?: Database["public"]["Enums"]["type_prestation"]
          type_vehicule_requis: string
          updated_at?: string
        }
        Update: {
          commentaire?: string | null
          cout_estime?: number
          created_at?: string
          created_by?: string | null
          date_debut_prevue?: string
          date_fin_prevue?: string
          id?: string
          nb_vehicules?: number
          planification_id?: string | null
          prestataire_id?: string | null
          reference?: string
          region_destination?: string
          statut?: Database["public"]["Enums"]["mad_statut"]
          type_prestation?: Database["public"]["Enums"]["type_prestation"]
          type_vehicule_requis?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mises_a_disposition_planification_id_fkey"
            columns: ["planification_id"]
            isOneToOne: false
            referencedRelation: "planifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mises_a_disposition_prestataire_id_fkey"
            columns: ["prestataire_id"]
            isOneToOne: false
            referencedRelation: "prestataires"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          chauffeur_id: string | null
          commentaire: string | null
          consommation_gasoil: number | null
          cout_estime: number | null
          cout_reel: number | null
          created_at: string
          date_debut_prevue: string
          date_debut_reelle: string | null
          date_fin_prevue: string
          date_fin_reelle: string | null
          destination: string
          id: string
          km_prevus: number | null
          km_reels: number | null
          litige: boolean
          mise_a_disposition_id: string | null
          origine: string
          poids_charge: number | null
          poids_livre: number | null
          prestataire_id: string | null
          reference: string
          statut: Database["public"]["Enums"]["mission_statut"]
          temps_attente_min: number | null
          type_prestation: Database["public"]["Enums"]["type_prestation"]
          updated_at: string
          vehicule_id: string | null
        }
        Insert: {
          chauffeur_id?: string | null
          commentaire?: string | null
          consommation_gasoil?: number | null
          cout_estime?: number | null
          cout_reel?: number | null
          created_at?: string
          date_debut_prevue: string
          date_debut_reelle?: string | null
          date_fin_prevue: string
          date_fin_reelle?: string | null
          destination: string
          id?: string
          km_prevus?: number | null
          km_reels?: number | null
          litige?: boolean
          mise_a_disposition_id?: string | null
          origine: string
          poids_charge?: number | null
          poids_livre?: number | null
          prestataire_id?: string | null
          reference: string
          statut?: Database["public"]["Enums"]["mission_statut"]
          temps_attente_min?: number | null
          type_prestation?: Database["public"]["Enums"]["type_prestation"]
          updated_at?: string
          vehicule_id?: string | null
        }
        Update: {
          chauffeur_id?: string | null
          commentaire?: string | null
          consommation_gasoil?: number | null
          cout_estime?: number | null
          cout_reel?: number | null
          created_at?: string
          date_debut_prevue?: string
          date_debut_reelle?: string | null
          date_fin_prevue?: string
          date_fin_reelle?: string | null
          destination?: string
          id?: string
          km_prevus?: number | null
          km_reels?: number | null
          litige?: boolean
          mise_a_disposition_id?: string | null
          origine?: string
          poids_charge?: number | null
          poids_livre?: number | null
          prestataire_id?: string | null
          reference?: string
          statut?: Database["public"]["Enums"]["mission_statut"]
          temps_attente_min?: number | null
          type_prestation?: Database["public"]["Enums"]["type_prestation"]
          updated_at?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "chauffeurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_mise_a_disposition_id_fkey"
            columns: ["mise_a_disposition_id"]
            isOneToOne: false
            referencedRelation: "mises_a_disposition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_prestataire_id_fkey"
            columns: ["prestataire_id"]
            isOneToOne: false
            referencedRelation: "prestataires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      pesees_pont_bascule: {
        Row: {
          created_at: string
          date_mesure: string
          ecart: number | null
          id: string
          mission_id: string
          operateur: string | null
          poids_mesure: number
          poids_theorique: number | null
          type_pesee: string
          validation_tonnage: boolean
          vehicule_id: string | null
        }
        Insert: {
          created_at?: string
          date_mesure?: string
          ecart?: number | null
          id?: string
          mission_id: string
          operateur?: string | null
          poids_mesure: number
          poids_theorique?: number | null
          type_pesee?: string
          validation_tonnage?: boolean
          vehicule_id?: string | null
        }
        Update: {
          created_at?: string
          date_mesure?: string
          ecart?: number | null
          id?: string
          mission_id?: string
          operateur?: string | null
          poids_mesure?: number
          poids_theorique?: number | null
          type_pesee?: string
          validation_tonnage?: boolean
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesees_pont_bascule_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesees_pont_bascule_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      planifications: {
        Row: {
          algorithme_utilise: string | null
          commentaire: string | null
          created_at: string
          created_by: string | null
          date_planification: string
          id: string
          reference: string
          statut: string
          taux_remplissage: number | null
          updated_at: string
        }
        Insert: {
          algorithme_utilise?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_planification: string
          id?: string
          reference: string
          statut?: string
          taux_remplissage?: number | null
          updated_at?: string
        }
        Update: {
          algorithme_utilise?: string | null
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          date_planification?: string
          id?: string
          reference?: string
          statut?: string
          taux_remplissage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      prestataires: {
        Row: {
          contact: string | null
          contrat_reference: string | null
          cout_horaire: number | null
          created_at: string
          email: string | null
          id: string
          nom: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          contact?: string | null
          contrat_reference?: string | null
          cout_horaire?: number | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          contact?: string | null
          contrat_reference?: string | null
          cout_horaire?: number | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nom: string
          prenom: string
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      responsable_flotte_flottes: {
        Row: {
          created_at: string
          flotte_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flotte_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flotte_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsable_flotte_flottes_flotte_id_fkey"
            columns: ["flotte_id"]
            isOneToOne: false
            referencedRelation: "flottes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          capacite_tonnage: number
          capacite_volume: number
          consommation_moyenne: number
          created_at: string
          derniere_maintenance: string | null
          flotte_id: string | null
          id: string
          immatriculation: string
          km_total: number
          statut: Database["public"]["Enums"]["vehicule_statut"]
          type_vehicule: string
          updated_at: string
        }
        Insert: {
          capacite_tonnage?: number
          capacite_volume?: number
          consommation_moyenne?: number
          created_at?: string
          derniere_maintenance?: string | null
          flotte_id?: string | null
          id?: string
          immatriculation: string
          km_total?: number
          statut?: Database["public"]["Enums"]["vehicule_statut"]
          type_vehicule: string
          updated_at?: string
        }
        Update: {
          capacite_tonnage?: number
          capacite_volume?: number
          consommation_moyenne?: number
          created_at?: string
          derniere_maintenance?: string | null
          flotte_id?: string | null
          id?: string
          immatriculation?: string
          km_total?: number
          statut?: Database["public"]["Enums"]["vehicule_statut"]
          type_vehicule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_flotte_id_fkey"
            columns: ["flotte_id"]
            isOneToOne: false
            referencedRelation: "flottes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_kpi_global: {
        Row: {
          ca_total: number | null
          consommation_totale: number | null
          km_total_parcourus: number | null
          nb_chauffeurs_dispo: number | null
          nb_chauffeurs_total: number | null
          nb_litiges: number | null
          nb_mad_en_attente: number | null
          nb_missions_actives: number | null
          nb_missions_cloturees: number | null
          nb_vehicules_dispo: number | null
          nb_vehicules_en_mission: number | null
          nb_vehicules_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_flotte_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "admin_it"
        | "plant_manager"
        | "manager_logistique"
        | "responsable_flotte"
        | "planificateur"
        | "chauffeur"
      facture_statut: "brouillon" | "validee" | "envoyee" | "payee" | "annulee"
      incident_gravite: "mineur" | "majeur" | "critique"
      mad_statut:
        | "creee"
        | "validee"
        | "affectee"
        | "en_cours"
        | "terminee"
        | "annulee"
      mission_statut:
        | "creee"
        | "affectee"
        | "en_cours"
        | "livree"
        | "facturee"
        | "cloturee"
        | "annulee"
      type_prestation: "interne" | "externe"
      vehicule_statut:
        | "disponible"
        | "affecte"
        | "en_mission"
        | "maintenance"
        | "retire"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin_it",
        "plant_manager",
        "manager_logistique",
        "responsable_flotte",
        "planificateur",
        "chauffeur",
      ],
      facture_statut: ["brouillon", "validee", "envoyee", "payee", "annulee"],
      incident_gravite: ["mineur", "majeur", "critique"],
      mad_statut: [
        "creee",
        "validee",
        "affectee",
        "en_cours",
        "terminee",
        "annulee",
      ],
      mission_statut: [
        "creee",
        "affectee",
        "en_cours",
        "livree",
        "facturee",
        "cloturee",
        "annulee",
      ],
      type_prestation: ["interne", "externe"],
      vehicule_statut: [
        "disponible",
        "affecte",
        "en_mission",
        "maintenance",
        "retire",
      ],
    },
  },
} as const
