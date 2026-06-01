import { useEffect, useState } from 'react';

const mg = {
     recherche: 'Fikarohana',
     historique_trajets: 'Tantaran\'asa ny fandaharana',
     aucun_historique: 'Tsy misy tantaran\'asa',
     voyage_le: 'Nandritra amin\'ny',
     chargement_historique: 'Miandry ny tantaran\'asa...',
     lignes: 'Ireo taxi-be',
     diagnostic: 'Diagnostika',
     admin: 'Admin',
     rafraichir: 'Hanavao',
     itineraire: 'Dianao',
     depart: 'Fiantombohana',
     destination: 'Toerana haleha',
     trouver: 'Hitady',
     chargement: 'Miandry...',
     itineraire_optimal: 'lalanao mety indrindra',
     duree: 'Fotoana',
     distance: 'Halavirana',
     changements: 'Fiovana',
     arrets: 'fijanona',
     min: 'mn',
     km: 'km',
     toutes_les_lignes: 'Ny taxi-be rehetra',
     rechercher_une_ligne: 'Hitady taxi-be...',
     point_de_passage: 'Toerana lalovana',
     lignes_qui_desservent: 'Taxi-be mandalo amin\'ny fijanonana',
     lieu_ou_arret: 'Toerana na fijanonana',
     desservent_ce_point: 'mandalo amin\'io toerana io',
     arrets_correspondants: 'Fijanonana mifanaraka',
     aucune_ligne_point: 'Tsy misy taxi-be mandalo amin\'io toerana io.',
     parcours: 'lalany',
     backend_connecte: 'Backend mifandray',
     backend_indisponible: 'Backend tsy hita',
     etat_en_ligne: 'En ligne ianao',
     etat_hors_ligne: 'Tsy en ligne ianao',
     verification_du_backend: 'Famaritana ny backend...',
     verifier: 'Hamakafaka',
     relancer_le_diagnostic: 'Handefa indray ny diagnostika',
     deconnexion: 'Hiala',
     parametres: 'Fandrindrana',
     langue: 'Fiteny',
     malagasy: 'Malagasy',
     francais: 'Français',
     english: 'English',
     theme: 'Endrika',
     theme_light: 'Mazava',
     theme_dark: 'Maizim-bonana',
     profil: 'Profil',
     erreur_api: 'Hadisoana API',
     backend_indisponible_message: 'Backend Django tsy hita. Alefaso amin\'ny http://127.0.0.1:8000 Django avy eo amboary ny données.',
     nom_arret_inconnu: 'Anaran\'ny fijanona tsy fantatra. Jereo ny anarana soratana.',
     depart_arrivee_differents: 'Ny fiantombohana sy ny toerana haleha dia tokony ho samy hafa.',
     choisissez_depart_destination: 'Mifidiana fiantombohana sy toerana haleha.',
     chargement_donnees: 'Miandry kely...',
     etat_api: 'Fitrangan\'ny API et base de données',
     premier_bus: 'Taxi_be voalohany ',
     descendre_arret: 'Midina eo amin\'ny fijanon\'ny',
     et_prenez_bus: 'miverina maka taxi_be',
     trajet_direct: 'Dianao mivantana',
     trajet_direct_desc: 'Taxi_be iray ihany, tsy mila miova.',
     trajet_avec_correspondances: 'Dianao miova taxi_be',
     trajet_avec_correspondances_desc: 'Miova taxi_be eo amin\'ny fijanonana voalaza.',
     trajet_indisponible: 'Tsy misy lalana mivantana amin\'io lalana io.',
     proposition: 'Tolo-kevitra',
     correspondances_possibles: 'Fiovana azo atao',
     alternative_recommandee: 'Tolo-kevitra tsara indrindra',
     marche_jusqu_au_depart: 'Mandeha hatrany amin\'ny fiantombohana',
     marche_jusqu_a_destination: 'Mandeha hatrany amin\'ny toerana haleha',
     marche_vers_ligne_suivante: 'Mandeha mankany amin\'ny taxi-be manaraka',
     arret_correspondance: 'Fijanonana fiovana',
     recadrer_arret: 'Hanova ny toeran\'ny fijanonana',
     coords_maj: 'Toerana navoaka',
     appuis_osm: 'Tsindrio eo amin\'ny sarintany',
     valider_ensuite: 'Hamafy eo ambany',
     confirmer_suppression_historique: 'Fafao ity tantaran\'asa ity ve?',
     suppression_en_cours: 'Fafaina...',
     modifier_profil: 'Hanova ny mombamomba',
     prenom: 'Anarana',
     nom_famille: 'Anaran-dray',
     nouveau_mot_de_passe: 'Tenimiafina vaovao',
     enregistrer_profil: 'Tehirizo',
     profil_mis_a_jour: 'Nohavaozina ny mombamomba',
     erreur_mise_a_jour_profil: 'Tsy afaka nohavaozina',
     aucun_arret_trouve: 'Tsy misy fijanonana hita',
     aucun_trajet_trouve: 'Tsy misy basy mivantana manomboka hatrany.',
     lignes_au_depart: 'Taxi-be eo amin\'ny fiantombohana',
     lignes_a_arrivee: 'Taxi-be eo amin\'ny toerana haleha',
     cliquer_ligne_carte: 'Tsindrio taxi-be iray haseho eo amin\'ny sarintany',
     voir_sur_carte: 'Hijery eo amin\'ny sarintany',
     arret_numero: 'Fijanona',
     sans_changement: 'Tsy mila miova',
     backend_attendu: 'Backend attendu',
     endpoint_donnees: 'Endpoint données',
     arrets_charges: 'Arrêts chargés',
     lignes_chargees: 'Lignes chargées',
     si_statut_reste: 'Si le statut reste indisponible, démarrez Django avec :',
     trajet_calcule: 'Lalana voakitana',
     aucun_trajet: 'Aucun trajet calculé',
     choisissez_deux_arrets: 'Choisissez deux arrêts puis lancez la recherche. Le calcul est fait par le backend Django.',
     ligne: 'Ligne',
     reseau: 'Réseau',
     donnees_de_demonstration: 'Données de démonstration chargées quand Django ne répond pas.',
     axe: 'Axe',
     retour_aux_lignes: 'Retour aux lignes',
     depart_en_ligne: 'Fiantombohana amin\'ny ligne',
     arrivee_en_ligne: 'Toerana haleha amin\'ny ligne',
     correspondance_label: 'Correspondance',
     admin_panel: 'Panneau Admin',
     admin_lignes: 'Fandrindrana anireo taxi-be',
     admin_arrets: 'Fandrindrana anireo arrets',
     admin_associations: 'Taxi-be-Arrets',
     admin_no_access: 'Ny administrateur ihany no afaka mampiasa anio.',
     admin_nouvelle_ligne: 'Taxi-be vaovao',
     admin_modifier_ligne: 'Hanova Taxi-be',
     admin_numero: 'Numero',
     admin_nom: 'anarana',
     admin_description: 'Mombamomba',
     admin_latitude: 'Latitude',
     admin_longitude: 'Longitude',
     admin_arrets_de_la_ligne: 'Arrêts de la ligne',
     admin_ordre: 'Baiko',
     admin_actions: 'Actions',
     admin_enregistrer: 'Enregistrer',
     admin_ajouter_arret: 'Ajouter un arrêt',
     admin_supprimer: 'Supprimer',
     admin_modifier: 'Hanova',
     admin_annuler: 'Hajanona ',
     admin_liste_vide: 'Tsy misy ninoninona',
     admin_nb_arrets: "Nombre d'arrêts",
     champ_obligatoire: 'Veuillez remplir tous les champs.',
     mots_de_passe_differents: 'Les mots de passe ne correspondent pas.',
     mot_de_passe_trop_court: 'Le mot de passe doit contenir au moins 6 caractères.',
     erreur_connexion: 'Erreur de connexion',
     erreur_inscription: "Erreur lors de l'inscription",
     erreur_inattendue: 'Une erreur est survenue.',
      bienvenue_title: 'Tongasoa eto amin\'ny Taxi be Ako',
     bienvenue_description: 'Mpikambana fitaterana eto Antananarivo.',
     cartes_interactives: 'Sarintany mifandraika',
     lignes_bus: 'Lalana taxi-be',
     itineraires_rapides: 'Lalana haingana',
     details: 'Hamakafaka',
     cacher: 'Anafina',
     se_connecter: 'Hiditra',
     acces_espace_personnel: 'Midira ao amin\'ny kaontinao',
     nom_utilisateur: 'Anaran\'ny mpampiasa',
     mot_de_passe: 'Tenimiafina',
     placeholder_nom_utilisateur: 'Anaran\'ny mpampiasa',
     placeholder_mot_de_passe: 'Tenimiafina',
     connexion_en_cours: 'Miditra...',
     demo_identifiants: 'Demo: admin / admin123',
     inscription_en_cours: 'Inscription...',
     email: 'Email',
     placeholder_email: 'Ampidiro ny adresse email',
     confirmer_mot_de_passe: 'Hanaiky ny tenimiafina',
     placeholder_confirmer: 'Hanaiky ny tenimiafina',
     creer_compte: 'Hamorona kaonty',
     pas_de_compte: 'mbola tsy manana kaonty ?',
     deja_un_compte: 'efa manana kaonty ?',
     optimal: 'optimaly',
     creer_un_compte_short: 'hamorona kaonty',
     inscrire_vous: "Hisoratra anarana mba hahafahanao manararaotra ny tolotra rehetra atolotray, ankoatra ny fitadiavana lalana sy ny fijerena ny sarintany.",
     loading_msg: 'Miandrasa kely…',
     nouvel_arret: 'Arrêt vaovao',
     modifier_l_arret: 'Hanova ny arrêt',
     choisir_une_ligne: 'Hisafidy taxi-be',
     selectionner_une_ligne: '— Safidio ny taxi be —',
     choisir_un_arret: 'Arrêt',
     choisir_un_arret_placeholder: '— Safidio ny arrêt —',
     anarana_arret: 'Nom de l\'arrêt',
     modifier: 'Hanova',
     supprimer: 'Hamafa',
     confirmer_suppression_ligne: 'Hamafa anio taxi be io ianao ?',
     confirmer_suppression_arret: 'Hamafa anio ny arrêt io ianao ?',
     confirmer_suppression_arret_ligne: 'Hamafa anio ny arrêt io ao amin\'ny taxi be io ianao ?',
     selectionner_ligne_arret: 'Hisafidy ny taxi be sy ny arrêt.',
};

const frOverrides = {
      recherche: 'Recherche',
      historique_trajets: 'Historique des trajets',
      aucun_historique: 'Aucun historique',
      voyage_le: 'Voyage du',
      chargement_historique: 'Chargement de l\'historique...',
      lignes: 'Lignes',
      diagnostic: 'Diagnostic',
      admin: 'Admin',
      rafraichir: 'Rafraîchir',
      itineraire: 'Itinéraire',
      depart: 'Départ',
      destination: 'Destination',
      trouver: 'Trouver',
      chargement: 'Chargement...',
      itineraire_optimal: 'Itinéraire optimal',
      duree: 'Durée',
      distance: 'Distance',
      changements: 'Changements',
      arrets: 'arrêts',
      min: 'min',
      km: 'km',
      toutes_les_lignes: 'Toutes les lignes',
      rechercher_une_ligne: 'Rechercher une ligne...',
      point_de_passage: 'Point de passage',
      lignes_qui_desservent: 'Lignes qui desservent un arrêt',
      lieu_ou_arret: 'Lieu ou arrêt',
      desservent_ce_point: 'desservent ce point',
      arrets_correspondants: 'Arrêts correspondants',
      aucune_ligne_point: 'Aucune ligne ne dessert ce point.',
      parcours: 'Parcours',
      backend_connecte: 'Backend connecté',
      backend_indisponible: 'Backend indisponible',
       etat_en_ligne: 'Vous êtes en ligne',
       etat_hors_ligne: 'Vous êtes hors ligne',
      verification_du_backend: 'Vérification du backend...',
      verifier: 'Vérifier',
      relancer_le_diagnostic: 'Relancer le diagnostic',
      deconnexion: 'Déconnexion',
      parametres: 'Paramètres',
      langue: 'Langue',
      malagasy: 'Malagasy',
      francais: 'Français',
      english: 'English',
      theme: 'Thème',
      theme_light: 'Clair',
      theme_dark: 'Sombre',
      profil: 'Profil',
      erreur_api: 'Erreur API',
      backend_indisponible_message: 'Backend Django indisponible. Démarrez Django sur http://127.0.0.1:8000 puis rechargez les données.',
      nom_arret_inconnu: 'Nom d\'arrêt inconnu. Vérifiez les noms saisis.',
      depart_arrivee_differents: 'Le départ et l\'arrivée doivent être différents.',
      choisissez_depart_destination: 'Choisissez le départ et la destination.',
      chargement_donnees: 'Chargement des données...',
      etat_api: 'État API et base de données',
      premier_bus: 'Premier bus',
      descendre_arret: 'Descendre à l\'arrêt',
      et_prenez_bus: 'et prendre le bus',
      trajet_direct: 'Trajet direct',
      trajet_direct_desc: 'Un seul bus suffit, sans changement.',
      trajet_avec_correspondances: 'Trajet avec correspondances',
      trajet_avec_correspondances_desc: 'Changez de bus aux arrêts indiqués.',
      trajet_indisponible: 'Trajet indisponible sur cet axe.',
      proposition: 'Proposition',
      correspondances_possibles: 'Correspondances possibles',
      alternative_recommandee: 'Meilleure option',
      marche_jusqu_au_depart: 'Marchez jusqu\'au départ',
      marche_jusqu_a_destination: 'Marchez jusqu\'à destination',
      marche_vers_ligne_suivante: 'Marche vers la ligne suivante',
      arret_correspondance: 'Arrêt de correspondance',
      recadrer_arret: 'Recadrer l\'arrêt',
      coords_maj: 'Coordonnées mises à jour',
      appuis_osm: 'Cliquez sur la carte pour positionner',
      valider_ensuite: 'Puis validez ci-dessous',
      confirmer_suppression_historique: 'Supprimer cet historique de trajet ?',
      suppression_en_cours: 'Suppression...',
      modifier_profil: 'Modifier le profil',
      prenom: 'Prénom',
      nom_famille: 'Nom',
      nouveau_mot_de_passe: 'Nouveau mot de passe',
      enregistrer_profil: 'Enregistrer',
      profil_mis_a_jour: 'Profil mis à jour',
      erreur_mise_a_jour_profil: 'Impossible de mettre à jour le profil',
      aucun_arret_trouve: 'Aucun arrêt trouvé',
      aucun_trajet_trouve: 'Aucun bus ne relie directement ces arrêts.',
      lignes_au_depart: 'Lignes au départ',
      lignes_a_arrivee: 'Lignes à l\'arrivée',
      cliquer_ligne_carte: 'Cliquez sur une ligne pour l\'afficher sur la carte',
      voir_sur_carte: 'Voir sur la carte',
      arret_numero: 'Arrêt',
      sans_changement: 'Sans changement',
      trajet_calcule: 'Trajet calculé',
      ligne: 'Ligne',
      admin_panel: 'Panneau Admin',
      admin_lignes: 'Gestion des lignes',
      admin_arrets: 'Gestion des arrêts',
      admin_associations: 'Ligne-Arrêts',
      admin_no_access: 'Administrateurs uniquement.',
      admin_nouvelle_ligne: 'Nouvelle ligne',
      admin_modifier_ligne: 'Modifier la ligne',
      admin_numero: 'Numéro',
      admin_nom: 'Nom',
      admin_description: 'Description',
      admin_latitude: 'Latitude',
      admin_longitude: 'Longitude',
      admin_arrets_de_la_ligne: 'Arrêts de la ligne',
      admin_ordre: 'Ordre',
      admin_actions: 'Actions',
      admin_enregistrer: 'Enregistrer',
      admin_ajouter_arret: 'Ajouter un arrêt',
      admin_supprimer: 'Supprimer',
      admin_modifier: 'Modifier',
      admin_annuler: 'Annuler',
      admin_liste_vide: 'Liste vide',
      admin_nb_arrets: "Nombre d'arrêts",
      nouvel_arret: 'Nouvel arrêt',
      modifier_l_arret: 'Modifier l\'arrêt',
      choisir_une_ligne: 'Choisir une ligne',
      selectionner_une_ligne: '— Sélectionner une ligne —',
      choisir_un_arret: 'Arrêt',
      choisir_un_arret_placeholder: '— Choisir un arrêt —',
      confirmer_suppression_ligne: 'Supprimer définitivement cette ligne ?',
      confirmer_suppression_arret: 'Supprimer définitivement cet arrêt ?',
      confirmer_suppression_arret_ligne: 'Supprimer cet arrêt de la ligne ?',
      selectionner_ligne_arret: 'Sélectionnez une ligne et un arrêt.',
      loading_msg: 'Chargement…',
      admin_numero_nom_obligatoires: 'Numéro et nom sont obligatoires.',
      admin_arret_champs_obligatoires: 'Nom, latitude et longitude sont obligatoires.',
   details: 'Détails',
   cacher: 'Cacher',
};

const fr = Object.assign({}, mg, frOverrides);

const enOverrides = {
      recherche: 'Search',
      historique_trajets: 'Trip History',
      aucun_historique: 'No History',
      voyage_le: 'Trip on the',
      chargement_historique: 'Loading History...',
      lignes: 'Bus Lines',
      diagnostic: 'Diagnostic',
      admin: 'Admin',
      rafraichir: 'Refresh',
      itineraire: 'Route',
      depart: 'Departure',
      destination: 'Destination',
      trouver: 'Find',
      chargement: 'Loading...',
      itineraire_optimal: 'Optimal Route',
      duree: 'Duration',
      distance: 'Distance',
      changements: 'Transfers',
      arrets: 'Stops',
      min: 'min',
      km: 'km',
      toutes_les_lignes: 'All Bus Lines',
      rechercher_une_ligne: 'Search for a bus line...',
      point_de_passage: 'Passage point',
      lignes_qui_desservent: 'Lines serving a stop',
      lieu_ou_arret: 'Place or stop',
      desservent_ce_point: 'serve this point',
      arrets_correspondants: 'Matching stops',
      aucune_ligne_point: 'No line serves this point.',
      parcours: 'Route',
      backend_connecte: 'Backend Connected',
      backend_indisponible: 'Backend Unavailable',
      verification_du_backend: 'Checking Backend...',
      verifier: 'Check',
      relancer_le_diagnostic: 'Rerun Diagnostic',
      deconnexion: 'Logout',
      parametres: 'Settings',
      langue: 'Language',
      malagasy: 'Malagasy',
      francais: 'French',
      english: 'English',
      theme: 'Theme',
      theme_light: 'Light',
      theme_dark: 'Dark',
      profil: 'Profile',
      erreur_api: 'API Error',
      backend_indisponible_message: 'Django backend not available. Start Django at http://127.0.0.1:8000 then reload data.',
      nom_arret_inconnu: 'Stop name unknown. Check the entered names.',
      depart_arrivee_differents: 'Departure and arrival must be different.',
      choisissez_depart_destination: 'Select departure and destination.',
      chargement_donnees: 'Loading data...',
      etat_api: 'API and Database Status',
      premier_bus: 'First Bus',
      descendre_arret: 'Get off at stop',
      et_prenez_bus: 'and take the bus',
      trajet_direct: 'Direct route',
      trajet_direct_desc: 'One bus is enough, no transfer needed.',
      trajet_avec_correspondances: 'Route with transfers',
      trajet_avec_correspondances_desc: 'Change buses at the stops shown below.',
      trajet_indisponible: 'Route unavailable on this corridor.',
      proposition: 'Option',
      correspondances_possibles: 'Possible transfers',
      alternative_recommandee: 'Best option',
      marche_jusqu_au_depart: 'Walk to departure stop',
      marche_jusqu_a_destination: 'Walk to destination',
      marche_vers_ligne_suivante: 'Walk to next line',
      arret_correspondance: 'Transfer stop',
      recadrer_arret: 'Reposition stop',
      coords_maj: 'Coordinates updated',
      appuis_osm: 'Click on the map to position',
      valider_ensuite: 'Then confirm below',
      confirmer_suppression_historique: 'Delete this trip from history?',
      suppression_en_cours: 'Deleting...',
      modifier_profil: 'Edit profile',
      prenom: 'First name',
      nom_famille: 'Last name',
      nouveau_mot_de_passe: 'New password',
      enregistrer_profil: 'Save',
      profil_mis_a_jour: 'Profile updated',
      erreur_mise_a_jour_profil: 'Could not update profile',
      aucun_arret_trouve: 'No stop found',
      aucun_trajet_trouve: 'No bus connects these stops directly.',
      lignes_au_depart: 'Lines at departure',
      lignes_a_arrivee: 'Lines at arrival',
      cliquer_ligne_carte: 'Click a line to show it on the map',
      voir_sur_carte: 'Show on map',
      arret_numero: 'Stop',
      sans_changement: 'No transfer',
      trajet_calcule: 'Route calculated',
      ligne: 'Line',
      admin_panel: 'Admin Panel',
      admin_lignes: 'Lines Management',
      admin_arrets: 'Stops Management',
      admin_associations: 'Line-Stops',
      admin_no_access: 'Admin only.',
      admin_nouvelle_ligne: 'New line',
      admin_modifier_ligne: 'Edit line',
      admin_numero: 'Number',
      admin_nom: 'Name',
      admin_description: 'Description',
      admin_latitude: 'Latitude',
      admin_longitude: 'Longitude',
      admin_arrets_de_la_ligne: 'Line stops',
      admin_ordre: 'Order',
      admin_actions: 'Actions',
      admin_enregistrer: 'Save',
      admin_ajouter_arret: 'Add a stop',
      admin_supprimer: 'Delete',
      admin_modifier: 'Edit',
      admin_annuler: 'Cancel',
      admin_liste_vide: 'Empty list',
      admin_nb_arrets: 'Number of stops',
      nouvel_arret: 'New stop',
      modifier_l_arret: 'Edit stop',
      choisir_une_ligne: 'Choose a line',
      selectionner_une_ligne: '— Select a line —',
      choisir_un_arret: 'Stop',
      choisir_un_arret_placeholder: '— Choose a stop —',
      confirmer_suppression_ligne: 'Delete this line permanently?',
      confirmer_suppression_arret: 'Delete this stop permanently?',
      confirmer_suppression_arret_ligne: 'Delete this stop from the line?',
      selectionner_ligne_arret: 'Select a line and a stop.',
      loading_msg: 'Loading…',
      admin_numero_nom_obligatoires: 'Number and name are required.',
      admin_arret_champs_obligatoires: 'Name, latitude and longitude are required.',
   details: 'Details',
   cacher: 'Hide',
};

const en = Object.assign({}, mg, enOverrides);

export const translations = { mg, fr, en };

// Helper pour extraire un nom d'arrêt en toute sécurité
function getStopName(stop) {
  if (!stop) return '?';
  if (typeof stop === 'string') return stop;
  if (typeof stop.nom === 'string') return stop.nom;
  if (stop.id) return `Arrêt #${stop.id}`;
  return '?';
}

export default function SettingsView({
  language,
  onLanguageChange,
  onClose,
  theme,
  onThemeChange,
  user,
  onUserUpdate,
}) {
  const t = translations[language];
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [showTripHistory, setShowTripHistory] = useState(true);
  const [deletingTrip, setDeletingTrip] = useState(null);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const dateLocale =
    language === 'en' ? 'en-GB' : language === 'mg' ? 'mg-MG' : 'fr-FR';

  useEffect(() => {
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
  }, [user]);

  useEffect(() => {
    async function fetchTrips() {
      setLoadingTrips(true);
      try {
        const data = await fetch('/api/users/trips/', { credentials: 'include' });
        if (data.ok) {
          const tripsData = await data.json();
          setTrips(tripsData || []);
        }
      } catch (error) {
        // Silently fail - trip history is optional
      } finally {
        setLoadingTrips(false);
      }
    }
    fetchTrips();
  }, []);

  async function handleSaveProfile(event) {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');
    if (newPassword && newPassword !== confirmPassword) {
      setProfileError(t.mots_de_passe_differents);
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setProfileError(t.mot_de_passe_trop_court);
      return;
    }
    if (!user?.id) return;

    setSavingProfile(true);
    try {
      const body = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };
      if (newPassword) body.password = newPassword;

      const response = await fetch(`/api/utilisateurs/${user.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProfileError(data.detail || t.erreur_mise_a_jour_profil);
        return;
      }
      onUserUpdate?.(data);
      setNewPassword('');
      setConfirmPassword('');
      setProfileMessage(t.profil_mis_a_jour);
    } catch {
      setProfileError(t.erreur_mise_a_jour_profil);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDeleteTrip(tripId) {
    if (!window.confirm(t.confirmer_suppression_historique || 'Supprimer cet historique ?')) return;
    setDeletingTrip(tripId);
    try {
      const response = await fetch(`/api/users/trips/${tripId}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setTrips(trips.filter(t => t.id !== tripId));
      }
    } catch (error) {
      // Silently fail
    } finally {
      setDeletingTrip(null);
    }
  }

  const languages = [
    { code: 'mg', name: t.malagasy, flag: '🇲🇬' },
    { code: 'fr', name: t.francais, flag: '🇫🇷' },
    { code: 'en', name: t.english, flag: '🇬🇧' },
  ];

  const themes = [
    { code: 'light', name: t.theme_light || 'Clair', icon: '☀️' },
    { code: 'dark', name: t.theme_dark || 'Sombre', icon: '🌙' },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>{t.parametres}</h3>
          <button className="settings-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {user && (
            <div className="settings-section">
              <label className="settings-label">{t.profil}</label>
              {!isEditingProfile ? (
                <div className="profile-summary">
                  <p className="profile-username">
                    <strong>{user.nom || user.username}</strong>
                    {user.email ? <span> · {user.email}</span> : null}
                  </p>
                  <button
                    type="button"
                    className="setting-action-btn"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    <span className="action-icon">✏️</span>
                    <span className="action-text">{t.modifier_profil || 'Modifier'}</span>
                  </button>
                </div>
              ) : (
                <form className="profile-form" onSubmit={handleSaveProfile}>
                  <p className="profile-username">
                    <strong>{user.username}</strong>
                    {user.email ? <span> · {user.email}</span> : null}
                  </p>
                  <div className="profile-fields">
                    <div className="profile-field">
                      <label htmlFor="profile-first-name">{t.prenom}</label>
                      <input
                        id="profile-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="profile-last-name">{t.nom_famille}</label>
                      <input
                        id="profile-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="profile-password">{t.nouveau_mot_de_passe}</label>
                      <input
                        id="profile-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••"
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="profile-confirm">{t.confirmer_mot_de_passe}</label>
                      <input
                        id="profile-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                  {profileError && <p className="profile-error">{profileError}</p>}
                  {profileMessage && <p className="profile-success">{profileMessage}</p>}
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileError('');
                        setProfileMessage('');
                      }}
                      disabled={savingProfile}
                    >
                      {t.admin_annuler || 'Annuler'}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                      {savingProfile ? t.chargement : t.enregistrer_profil}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="settings-section">
            <label className="settings-label">{t.langue}</label>
            <div className="setting-options">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`setting-option ${language === lang.code ? 'active' : ''}`}
                  onClick={() => onLanguageChange(lang.code)}
                >
                  <span className="setting-icon">{lang.flag}</span>
                  <span className="setting-text">{lang.name}</span>
                  {language === lang.code && (
                    <span className="setting-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <label className="settings-label">{t.theme || 'Thème'}</label>
            <div className="setting-options">
              {themes.map((th) => (
                <button
                  key={th.code}
                  className={`setting-option ${theme === th.code ? 'active' : ''}`}
                  onClick={() => onThemeChange(th.code)}
                >
                  <span className="setting-icon">{th.icon}</span>
                  <span className="setting-text">{th.name}</span>
                  {theme === th.code && (
                    <span className="setting-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <label className="settings-label">{t.historique_trajets || 'Historique des trajets'}</label>
              <button 
                className="setting-toggle-btn"
                onClick={() => setShowTripHistory(!showTripHistory)}
              >
                {showTripHistory ? t.cacher || 'Cacher' : t.details || 'Détails'}
              </button>
            </div>
            <div className="trip-history-container">
              {showTripHistory && (
                <>
                  {loadingTrips ? (
                    <p className="loading-msg">{t.chargement_historique || 'Chargement...'}</p>
                  ) : trips.length === 0 ? (
                    <p className="empty-msg">{t.aucun_historique || 'Aucun historique'}</p>
                  ) : (
                    <ul className="trip-history-list">
                      {trips.map((trip) => (
                        <li key={trip.id} className="trip-history-item">
                           <div className="trip-route">
                             {/* CORRECTION : utiliser getStopName pour éviter de rendre des objets */}
                             <strong>{getStopName(trip.depart)} → {getStopName(trip.arrivee)}</strong>
                           </div>
                          <div className="trip-meta">
                            {trip.date_voyage && (
                              <span>
                                {t.voyage_le}:{' '}
                                {new Date(trip.date_voyage || trip.date_creation).toLocaleDateString(dateLocale)}
                              </span>
                            )}
                            <span>{t.duree}: {trip.duree_minutes} min</span>
                            <span>{t.distance}: {trip.distance_km} km</span>
                            {trip.nb_changements > 0 && (
                              <span>{t.changements}: {trip.nb_changements}</span>
                            )}
                          </div>
                          {deletingTrip === trip.id ? (
                            <span className="deleting-status">{t.suppression_en_cours}</span>
                          ) : (
                            <button 
                              className="setting-action-btn"
                              onClick={() => handleDeleteTrip(trip.id)}
                            >
                              <span className="action-icon">🗑️</span>
                              <span className="action-text">{t.supprimer || 'Supprimer'}</span>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
