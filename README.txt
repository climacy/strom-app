STRÖM APP — Prototype de chiffrage professionnel

Ouvrir index.html dans un navigateur, ou servir le dossier avec un serveur local.

Parcours :
1. Choix du poste
2. Informations techniques spécifiques au métier + prix unitaires
3. Vérification et envoi

Le bouton d'envoi enregistre actuellement le payload dans localStorage (clé strom-last-quote).
Pour l'envoi réel au système Ström, remplacer cette étape par l'appel API correspondant lorsque l'endpoint et son format seront connus.

Les données du projet Nyon sont des données de démonstration à remplacer par les données réelles du projet / backend.

INTERFACE (refonte 2026-10)
- styles.css : design system complet (remplace aussi roof-professional.css et professional-trade-icons.css, supprimés).
- ui.js : couche de présentation uniquement (fil d'étapes, icônes, tonalité des messages, compteur de prix). Aucune donnée ni calcul modifié.
- Étiquettes des pans : placées hors du toit, déplaçables à la souris (double-clic = position automatique). Position mémorisée dans le navigateur (clé strom-ui-pan-labels-v1).
- Zones de raccord / factices (partie des pans non couverte par un module entier) hachurées sur le plan, avec surface modules, raccords et % de couverture dans le panneau Calepinage.
- fonts/ : police Instrument Sans embarquée (licence OFL), aucune dépendance externe.
- Les fichiers de logique sont inchangés, sauf deux corrections de bugs :
  * roof-professional.js : ajout des fonctions basis() et rectWorld() manquantes (bouton « + Ajouter le Velux »).
  * roof-professional.js : eventXY() utilise getScreenCTM() — les points d'obstacle tombent exactement sous le curseur (avant : décalage dû au cadrage centré de la photo et au zoom).
  * roof-professional.js : cheminée ronde = vrai cercle posé en 1 clic (Ø 40 cm par défaut), diamètre réglable par une poignée, déplaçable ; le diamètre est affiché dans la liste des obstacles.
  * roof-professional.js : calepinage auto optimisé — pour chaque pan, plusieurs décalages de colonnes sont testés ; la pose retenue maximise la puissance, puis est la plus centrée (avant : colonnes calées contre un seul bout, tout le reste d'un même côté).
  * submission-reports.js : la quantité modifiée par l'entreprise (.company-qty) est désormais enregistrée dans la soumission (au lieu de 0).
