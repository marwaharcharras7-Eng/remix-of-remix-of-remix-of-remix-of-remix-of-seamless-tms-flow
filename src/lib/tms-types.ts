export type AppRole = 'administrateur' | 'planificateur' | 'chauffeur' | 'comptable' | 'direction';

export const ROLE_LABELS: Record<AppRole, string> = {
  administrateur: 'Administrateur',
  planificateur: 'Planificateur',
  chauffeur: 'Chauffeur / Opérateur',
  comptable: 'Comptable / Financier',
  direction: 'Direction / Logistique',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  administrateur: 'Tout accès — utilisateurs, flotte, paramétrage',
  planificateur: 'Création, modification, validation des plannings',
  chauffeur: 'Consultation missions, saisie GPS, livraisons',
  comptable: 'Données financières, validation factures',
  direction: 'Consultation globale, KPI, tableaux de bord',
};

// Permissions par module (UI guard)
export const ROLE_PERMS: Record<AppRole, string[]> = {
  administrateur: ['dashboard','flotte','vehicules','chauffeurs','prestataires','planning','mises-a-disposition','missions','suivi-gps','pont-bascule','factures','utilisateurs','reporting','incidents'],
  planificateur:  ['dashboard','flotte','vehicules','chauffeurs','prestataires','planning','mises-a-disposition','missions','suivi-gps','pont-bascule','reporting','incidents'],
  chauffeur:      ['dashboard','mes-missions','suivi-gps','pont-bascule','incidents'],
  comptable:      ['dashboard','factures','missions','reporting'],
  direction:      ['dashboard','reporting','flotte','vehicules','chauffeurs','missions','factures','incidents'],
};

export const VEHICULE_STATUTS = ['disponible','affecte','en_mission','maintenance','retire'] as const;
export const MISSION_STATUTS = ['creee','affectee','en_cours','livree','facturee','cloturee','annulee'] as const;
export const MAD_STATUTS = ['creee','validee','affectee','en_cours','terminee','annulee'] as const;

// ===== Listes déroulantes (référentiels) =====
export const TYPES_TRANSPORT = [
  'Routier longue distance',
  'Routier régional',
  'Distribution urbaine',
  'Frigorifique',
  'Citerne / Vrac liquide',
  'Benne / Vrac solide',
  'Conteneur',
  'Maritime',
  'Multimodal',
] as const;

export const TYPES_VEHICULE = [
  'Camion 19T',
  'Camion 26T',
  'Tracteur + Semi-remorque',
  'Porteur 12T',
  'Camionnette 3.5T',
  'Fourgon',
  'Frigorifique',
  'Citerne',
  'Benne',
  'Plateau',
  'Porte-conteneur',
] as const;

export const TYPES_INCIDENT = [
  'Retard livraison',
  'Panne mécanique',
  'Accident',
  'Vol / Disparition',
  'Marchandise endommagée',
  'Écart de poids',
  'Refus de livraison',
  'Document manquant',
  'Problème client',
  'Conditions météo',
  'Itinéraire bloqué',
  'Autre',
] as const;

// 12 régions administratives du Maroc
export const REGIONS_MAROC = [
  'Tanger-Tétouan-Al Hoceïma',
  'Oriental',
  'Fès-Meknès',
  'Rabat-Salé-Kénitra',
  'Béni Mellal-Khénifra',
  'Casablanca-Settat',
  'Marrakech-Safi',
  'Drâa-Tafilalet',
  'Souss-Massa',
  'Guelmim-Oued Noun',
  'Laâyoune-Sakia El Hamra',
  'Dakhla-Oued Ed-Dahab',
] as const;

export const STATUT_LABELS: Record<string, string> = {
  disponible: 'Disponible',
  affecte: 'Affecté',
  en_mission: 'En mission',
  maintenance: 'Maintenance',
  retire: 'Retiré',
  creee: 'Créée',
  validee: 'Validée',
  affectee: 'Affectée',
  en_cours: 'En cours',
  livree: 'Livrée',
  facturee: 'Facturée',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
  terminee: 'Terminée',
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  interne: 'Interne',
  externe: 'Externe',
  mineur: 'Mineur',
  majeur: 'Majeur',
  critique: 'Critique',
};

export function statutColor(statut: string): string {
  const map: Record<string,string> = {
    disponible: 'bg-success/15 text-success border-success/30',
    affecte: 'bg-info/15 text-info border-info/30',
    en_mission: 'bg-accent/15 text-accent border-accent/30',
    en_cours: 'bg-accent/15 text-accent border-accent/30',
    maintenance: 'bg-warning/15 text-warning border-warning/30',
    retire: 'bg-muted text-muted-foreground border-border',
    creee: 'bg-secondary text-secondary-foreground border-border',
    affectee: 'bg-info/15 text-info border-info/30',
    validee: 'bg-info/15 text-info border-info/30',
    livree: 'bg-success/15 text-success border-success/30',
    terminee: 'bg-success/15 text-success border-success/30',
    facturee: 'bg-primary/15 text-primary border-primary/30',
    cloturee: 'bg-status-cloture/15 text-status-cloture border-status-cloture/30',
    annulee: 'bg-destructive/15 text-destructive border-destructive/30',
    brouillon: 'bg-muted text-muted-foreground border-border',
    envoyee: 'bg-info/15 text-info border-info/30',
    payee: 'bg-success/15 text-success border-success/30',
    mineur: 'bg-info/15 text-info border-info/30',
    majeur: 'bg-warning/15 text-warning border-warning/30',
    critique: 'bg-destructive/15 text-destructive border-destructive/30',
  };
  return map[statut] || 'bg-muted text-muted-foreground border-border';
}

export function generateRef(prefix: string): string {
  const d = new Date();
  const ts = d.getFullYear().toString().slice(-2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${ts}-${rnd}`;
}
