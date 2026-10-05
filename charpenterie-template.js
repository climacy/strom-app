// Modèle Charpenterie basé sur les prestations réellement rencontrées dans les devis Tanterine 5.
// Aucune quantité n'est inventée : Ström choisit les lignes utiles et renseigne/valide les quantités.
(() => {
  trades.charpenterie.sections = [
    ['Travaux préparatoires · Démontage', [
      'Démontage tuiles faîtières',
      'Démontage couverture / tuiles',
      'Démontage lattage',
      'Démontage sous-lattage',
      'Démontage sous-couverture existante',
      'Démontage Velux y compris évacuation',
      'Démontage larmiers / virevents',
      'Démontage chéneaux',
      'Démontage barres / crochets à neige',
      'Démontage et évacuation de cheminée',
      'Bâchage provisoire'
    ]],
    ['Évacuation / nettoyage', [
      'Balayage / nettoyage de la surface',
      'Évacuation des tuiles',
      'Benne / évacuation bois',
      'Mise en sac et évacuation matériaux spéciaux',
      'Évacuation des déchets de chantier'
    ]],
    ['Pare-vapeur / étanchéité à l’air', [
      'Pare-vapeur',
      'Raccordement du pare-vapeur aux murs',
      'Raccordement du pare-vapeur aux éléments traversants',
      'Découpes et raccords pare-vapeur'
    ]],
    ['Isolation', [
      'Isolation entre chevrons',
      'Isolation sur chevrons',
      'Isolation Bauder ECO S 105 mm',
      'Isolation Bauder ECO S 125 mm',
      'Complément d’isolation',
      'Découpes et ajustements isolation'
    ]],
    ['Sous-couverture', [
      'Pose sous-couverture',
      'Sous-couverture soudée / étanche',
      'Raccordement sous-couverture aux murs',
      'Raccordement sous-couverture aux Velux',
      'Raccordement sous-couverture aux cheminées',
      'Raccordement sous-couverture aux ventilations',
      'Découpes et raccords sous-couverture'
    ]],
    ['Charpente / structure bois', [
      'Remplacement d’éléments de charpente',
      'Réparation / renforcement de chevrons',
      'Chevêtres pour ouvertures de toiture',
      'Calages et pièces de compensation',
      'Pièces de bois en bord de toiture',
      'Menuiserie autour des lucarnes'
    ]],
    ['Lattage / contre-lattage / ventilation', [
      'Pose contre-lattage',
      'Pose lattage',
      'Calage de ventilation',
      'Grille de ventilation',
      'Arrêt de ventilation',
      'Closoir / ventilation de faîtage'
    ]],
    ['Couverture / remise en état', [
      'Pose / repose de la couverture',
      'Pose / repose des tuiles',
      'Pose / repose des tuiles faîtières',
      'Découpes de couverture',
      'Raccordements de couverture aux éléments traversants'
    ]],
    ['Velux / ouvertures / traversées', [
      'Pose / repose Velux',
      'Rehausse cadre Velux',
      'Création / adaptation chevêtre Velux',
      'Habillage / menuiserie intérieure Velux',
      'Adaptation autour des lucarnes',
      'Adaptation autour des cheminées',
      'Adaptation autour des ventilations'
    ]],
    ['Sécurité toiture / divers', [
      'Support pour barre de sécurité',
      'Support / adaptation pare-neige',
      'Travaux complémentaires de charpentier',
      'Aide-charpentier',
      'Fournitures diverses',
      'Divers et imprévus à justifier'
    ]]
  ];

  // Unités par défaut adaptées au métier. Elles restent modifiables côté Ström.
  const baseDefaultUnit = defaultUnit;
  defaultUnit = function(label){
    const s=String(label||'').toLowerCase();
    if(/velux|cheminée|chevêtre/.test(s) && !/raccordement|adaptation/.test(s)) return 'pce';
    if(/larmier|virevent|chéneau|faîtage|grille de ventilation|arrêt de ventilation|closoir/.test(s)) return 'm';
    if(/tuiles faîtières/.test(s)) return 'm';
    if(/couverture|tuile|lattage|sous-lattage|sous-couverture|pare-vapeur|isolation|bâchage|balayage|nettoyage|contre-lattage/.test(s)) return 'm²';
    if(/charpentier/.test(s)) return 'h';
    return baseDefaultUnit(label);
  };
})();