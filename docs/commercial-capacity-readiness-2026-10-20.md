# Simulateur — reprise préparée, publication non autorisée

Branche `codex/simulator-commercial-readiness` issue de `codex/fix-sso-1102` ; anciens travaux conservés. Moteur, rendu, mensualité hors assurance et PDF inchangés. Worker cible existant `simulateur-credit`, domaine exclusif `simulateur-credit.titayla.com`, identifiant d'accès `simulation-credit`. Toutes les ressources restent derrière le garde central ; vérification des droits à chaque requête, refus sur indisponibilité et cache de préparation RSA seulement.

La facturation appartient entièrement au portail Titayla : 5 € HT/mois individuel OU Pass valide incluant le simulateur. Aucun module Stripe, compte client supplémentaire ou prix Live ajouté ici. Aucun besoin d'achat supplémentaire avec le Pass. Le portail candidat bloque désormais aussi le POST direct Checkout pour ce cas.

Le dossier coordonné fait autorité : `Marine-LCDC/titayla`, branche de même nom, `docs/simulator-commercial-publication-2026-10-20.md`. Il remplace l'état ancien « Worker inexistant » du dossier de publication initial. Titayla production reste à `71462b6c-8677-44eb-8113-278690572009` ; simulateur production à `4f9fe3db-ef45-420f-b4cc-2ddcb40214b9` au dernier contrôle.

Bloquants : accord Paid, marge CPU/mémoire démontrée en laboratoire représentatif, limites de reproduction 1102 explicitement traitées, vérification Stripe Live directe et collecte réelle TVA, recette Test isolée et autorisation de publication/ventes. Les tests historiques réussis ne démontrent pas l'élimination de 1102. Aucun déploiement ni droit réel exécuté pendant cette préparation.

Publication future : vérifier sources GitHub exactes et digests, domaine/bindings actifs, déployer ce Worker avant registre Titayla puis URL catalogue ; suivre le dossier coordonné et ses contrôles intermédiaires. Repli : version précédente ci-dessus, fail-closed, restauration portail baseline et URL catalogue capturée, ventes planned. Ne supprimer aucune référence/prix/donnée/abonnement, ne jamais modifier Les Clés du Crédit ni l'ancien sous-domaine erroné.
