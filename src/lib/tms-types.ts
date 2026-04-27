export type AppRole =
  | 'admin_it'
  | 'plant_manager'
  | 'manager_logistique'
  | 'responsable_flotte'
  | 'planificateur'
  | 'chauffeur';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin_it: 'Admin IT',
  plant_manager: 'Plant Manager (Directeur d\'usine)',
  manager_logistique: 'Manager Logistique',
  responsable_flotte: 'Responsable de flotte',
  planificateur: 'Planificateur',
  chauffeur: 'Chauffeur / Opérateur',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin_it: 'Gestion des utilisateurs et de leurs rôles. Lecture seule sur le métier.',
  plant_manager: 'Tous les droits métier sauf modification des plannings et des chauffeurs. Gère aussi les utilisateurs.',
  manager_logistique: 'Tous les droits métier (y compris plannings et chauffeurs). Gère aussi les utilisateurs.',
  responsable_flotte: 'Ne modifie que les véhicules, chauffeurs et incidents de SES flottes assignées.',
  planificateur: 'Création, modification, validation des plannings, MAD, missions.',
  chauffeur: 'Consultation de ses missions, saisie GPS, livraisons, déclaration d\'incidents.',
};

// Permissions par module (UI guard)
// Note: les RLS de la base font foi côté sécurité ; ces listes contrôlent l'affichage des menus.
export const ROLE_PERMS: Record<AppRole, string[]> = {
  // Admin IT : uniquement les utilisateurs + lecture seule sur quelques modules clés
  admin_it: ['dashboard', 'utilisateurs', 'flotte', 'vehicules', 'chauffeurs', 'missions'],

  // Plant Manager : tout sauf édition planning/chauffeurs (l'UI désactive l'édition, RLS aussi)
  plant_manager: ['dashboard','flotte','vehicules','chauffeurs','prestataires','planning','mises-a-disposition','missions','suivi-gps','pont-bascule','factures','utilisateurs','reporting','incidents'],

  // Manager Logistique : tout, y compris planning et chauffeurs en édition
  manager_logistique: ['dashboard','flotte','vehicules','chauffeurs','prestataires','planning','mises-a-disposition','missions','suivi-gps','pont-bascule','factures','utilisateurs','reporting','incidents'],

  // Responsable de flotte : voit le métier mais filtré sur ses flottes
  responsable_flotte: ['dashboard','flotte','vehicules','chauffeurs','missions','suivi-gps','pont-bascule','incidents','reporting'],

  // Planificateur : inchangé
  planificateur: ['dashboard','flotte','vehicules','chauffeurs','prestataires','planning','mises-a-disposition','missions','suivi-gps','pont-bascule','reporting','incidents'],

  // Chauffeur : ses missions seulement
  chauffeur: ['dashboard','mes-missions','suivi-gps','pont-bascule','incidents'],
};

// Helpers permissions métier
export const canEditPlanning = (roles: AppRole[]) =>
  roles.some(r => r === 'manager_logistique' || r === 'planificateur');

export const canEditChauffeur = (roles: AppRole[]) =>
  roles.some(r => r === 'manager_logistique' || r === 'planificateur' || r === 'responsable_flotte');

export const canEditFlotte = (roles: AppRole[]) =>
  roles.some(r => r === 'plant_manager' || r === 'manager_logistique');

export const canManageUsers = (roles: AppRole[]) =>
  roles.some(r => r === 'admin_it' || r === 'plant_manager' || r === 'manager_logistique');

export const canEditFactures = (roles: AppRole[]) =>
  roles.some(r => r === 'plant_manager' || r === 'manager_logistique');

export const isFleetScoped = (roles: AppRole[]) =>
  roles.includes('responsable_flotte') && !roles.some(r =>
    r === 'admin_it' || r === 'plant_manager' || r === 'manager_logistique' || r === 'planificateur'
  );

export const VEHICULE_STATUTS = ['disponible','affecte','en_mission','maintenance','retire'] as const;
export const MISSION_STATUTS = ['creee','affectee','en_cours','livree','facturee','cloturee','annulee'] as const;
export const MAD_STATUTS = ['creee','validee','affectee','en_cours','terminee','annulee'] as const;

// ===== Listes déroulantes (référentiels) =====
export const TYPES_TRANSPORT = [
  'Routier longue distance','Routier régional','Distribution urbaine','Frigorifique',
  'Citerne / Vrac liquide','Benne / Vrac solide','Conteneur','Maritime','Multimodal',
] as const;

export const TYPES_VEHICULE = [
  'Camion 19T','Camion 26T','Tracteur + Semi-remorque','Porteur 12T','Camionnette 3.5T',
  'Fourgon','Frigorifique','Citerne','Benne','Plateau','Porte-conteneur',
] as const;

export const TYPES_INCIDENT = [
  'Retard livraison','Panne mécanique','Accident','Vol / Disparition','Marchandise endommagée',
  'Écart de poids','Refus de livraison','Document manquant','Problème client','Conditions météo',
  'Itinéraire bloqué','Autre',
] as const;

export const REGIONS_MAROC = [
  'Tanger-Tétouan-Al Hoceïma','Oriental','Fès-Meknès','Rabat-Salé-Kénitra',
  'Béni Mellal-Khénifra','Casablanca-Settat','Marrakech-Safi','Drâa-Tafilalet',
  'Souss-Massa','Guelmim-Oued Noun','Laâyoune-Sakia El Hamra','Dakhla-Oued Ed-Dahab',
] as const;

export const STATUT_LABELS: Record<string, string> = {
  disponible: 'Disponible', affecte: 'Affecté', en_mission: 'En mission',
  maintenance: 'Maintenance', retire: 'Retiré',
  creee: 'Créée', validee: 'Validée', affectee: 'Affectée',
  en_cours: 'En cours', livree: 'Livrée', facturee: 'Facturée',
  cloturee: 'Clôturée', annulee: 'Annulée', terminee: 'Terminée',
  brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée',
  interne: 'Interne', externe: 'Externe',
  mineur: 'Mineur', majeur: 'Majeur', critique: 'Critique',
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
