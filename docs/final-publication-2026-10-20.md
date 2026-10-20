# Finalisation et autorisation globale — 20 octobre 2026

Ce dossier complète et remplace l'ordre de publication du dossier du 19 octobre.
État : préparation terminée, aucune opération de production exécutée.

## Sources et préservation

Les branches codex/migration-titayla (simulateur-credit) et
codex/migration-simulateur-credit (Titayla) restent isolées, sans fusion main ni
force-push. Les commits de départ 02801aa et 1927d9c ont été vérifiés sur GitHub.
Les branches principales n'ont pas avancé depuis la préparation précédente.
La branche Titayla inclut les évolutions déjà déployées de 9558dec, absentes de
main ; elle ne doit pas être remplacée par un déploiement de main plus ancien.
Les sources locales préexistantes de C:/Projects/Titayla restent intactes.

Le moteur, les composants, les styles et le PDF du simulateur restent inchangés,
avec vérification des empreintes d'origine. Mensualité hors assurance conservée.

## Production constatée

Titayla reste sur 71462b6c-8677-44eb-8113-278690572009, déploiement
db9cd184-cadf-4dcd-adb2-1b4357ce4141, annotation 9558dec, trafic 100 %.
Inscriptions publiques true ; Stripe et accès live ; catalogue Supabase ;
notifications capture=false/delivery=off. Registre central : Prompteur uniquement.
Le nouveau Worker de production et le nouveau domaine n'existent pas encore.
Le domaine historique erroné conserve son association initiale.

La préproduction utilise le Worker simulateur-credit-staging, avec identités et
droits fictifs sur un service de recette privé. Elle n'est pas un compte Live.
Les manifestes locaux indiquent les SHA et empreintes exactes du code préparé.

## Solution au manque de droits Live

Aucun mécanisme temporaire n'existait : seule app_access_versions était présente.
Le compte nominatif candidat est existant, confirmé et utilisateur ordinaire.
Son e-mail/UUID, les deux IDs de reçus et les SQL exacts sont dans le fichier
LOCAL IGNORÉ Titayla test-results/temporary-recette/plan.json et les SQL voisins.
L'identité doit être explicitement approuvée ; aucune création/impersonation de
compte, aucun lien Auth administrateur et aucun changement de mot de passe.

La migration additive 20261020021907_temporary_app_access_grants.sql prépare un
droit serveur nominatif, limité à l'application et au mode, avec bornes temporelles,
raison, créateur et révocation. RLS active ; anon et authenticated n'ont aucun
privilège, même avec un rôle admin dans le portail. Aucun endpoint public ne peut
émettre un droit. La durée est limitée à deux heures par la base.
Le service peut insérer un reçu et modifier uniquement ses colonnes de révocation,
sans prolonger sa durée ni le supprimer. Aucun nouveau cron n'est nécessaire.

Titayla vérifie d'abord les droits commerciaux existants. Seulement sans droit
commercial pour simulation-credit, il vérifie le reçu temporaire. Prompteur et
les autres apps ne dépendent pas de cette table ; les droits commerciaux valides
restent reconnus même si la lecture de cette table échoue.
La source temporary est explicite ; ce n'est pas un faux abonnement individuel,
un Pass fictif ou un privilège admin. Tous les contrôles Auth/SSO restent requis.

Deux reçus successifs sont proposés : 90 secondes pour constater une expiration
réelle, puis 20 minutes pour la recette fonctionnelle et une révocation active.
Ils ne peuvent pas se chevaucher ; les scripts refusent une duplication active.
Les lignes restent pour audit après expiration/révocation. Aucun reçu n'a été
inséré en production. Une session normale du titulaire sera nécessaire.

## Tests effectivement exécutés hors production

- Simulateur : 36 tests, build et typage, Worker local avec Chromium et Microsoft
  Edge, affichage à 390 pixels, calcul, 240 échéances, PDF, nonce/cookie, refus
  des ressources, assertions invalides/expirées/autre app, retrait de droit,
  panne et redirections du contrôle central.
- Préproduction HTTPS : connexion individuelle et Pass FICTIFS, PDF pour chaque
  cas, refus sans droit, avec droit expiré et assertions invalides. Cette recette
  n'utilise ni clé privée ni compte de production.
- Titayla : 45 tests ciblés validés puis un test supplémentaire validé sur les
  SQL nominatifs exacts. Migration complète et RLS exécutées dans PostgreSQL
  local PGlite. Les tables/prix/abonnements et comptes fictifs sont préservés.
- Routes Titayla réelles sur Worker LOCAL : droits individuel/Pass, droit
  temporaire, mauvais utilisateur/app/mode, expiration, révocation, panne et
  repli sur droit commercial valide, en modes Test et Live simulés.
- Non-régression HTTP Prompteur et facturation : valide, vide, Pass, droits
  cumulés, CSRF, indisponibilité du portail Stripe/base. Aucun appel Stripe réel.
- Typage corrigé et validé. Contrôle des sources et bundles sans secret ajouté.

Navigateurs physiques iOS/Android, Safari et Firefox : non exécutés.
Les cas Live commerciaux individuel/Pass positifs restent non exécutés faute
d'abonnements Live correspondants ; ne pas les annoncer comme réussis après
une simple recette temporaire. Aucun abonnement fictif ou paiement à créer.

## Opérations regroupées dans UNE autorisation de production

1. Relire baseline, configurations, disponibilité du domaine et sources GitHub.
   Si un état non couvert a changé : arrêter, réauditer et demander un nouvel
   accord sur ce risque. Vérifier les empreintes des artefacts et de la migration.
2. Appliquer UNIQUEMENT la migration additive du droit temporaire sur Titayla.
   Aucun seed/import global, aucune autre migration historique.
3. Publier le nouveau Worker simulateur-credit sans domaine ni workers.dev,
   avec APP_ID=simulation-credit, TITAYLA_URL=https://titayla.com et la clé RSA
   PUBLIQUE réelle déjà utilisée par Prompteur. Aucun secret Stripe/Supabase
   ni clé de recette ou clé privée sur l'application.
4. Rattacher uniquement simulateur-credit.titayla.com et vérifier HTTPS/garde.
5. Publier Titayla avec dist/server/wrangler.simulator-release.json généré par
   scripts/prepare-simulator-release.mjs, source exacte vérifiée par
   scripts/release-source.mjs. Code et registre fusionné sont publiés ensemble.
   keep_vars=true ; aucune variable explicite hors TITAYLA_APP_ORIGINS.
   NE PAS utiliser deploy:vinext/controlled-release publish historiques, qui
   forceraient AUTH_PUBLIC_ENABLED=false. Les inscriptions restent ouvertes.
6. Appliquer seulement simulator-catalogue-apply.sql : seule app_url du
   simulateur change, plus updated_at automatique. Préserver id, statut planned,
   prix et associations Pass ; aucune vente individuelle n'est ouverte.
7. Une fois une session normale du titulaire disponible, appliquer les reçus
   approuvés dans l'ordre 90 s puis 20 min, effectuer les contrôles réels et
   révoquer les reçus exacts à la fin. Pas de logout global, pas de modification
   de app_access_versions ou de compte, pas de demande de paiement ou d'e-mail.
8. Enregistrer les résultats réels, y compris les cas non exécutés, et les versions
   finales. Ne nettoyer aucun fichier ou ancien domaine dans cette publication.

## Recette réelle après autorisation

Avant droit : visite anonyme et compte connecté sans droit, documents et chaque
JS/CSS/PDF/API protégés refusés. Après premier reçu : SSO de la session normale,
affichage autorisé, puis refus après 90 secondes réelles, même si l'assertion
reste cryptographiquement valide. Deuxième reçu : nouveau SSO, quatre calculs,
taux nul, assurance, amortissement, export PDF, mobile, expiration de l'assertion
au bout d'au plus 300 secondes et nouveau SSO si le droit reste valide.
Révoquer le deuxième reçu : refus immédiat de la prochaine requête protégée et
fermeture du garde navigateur ; aucun autre droit du titulaire retiré.
Vérifier cookies sécurisés, no-store, nonce, fragment effacé, assertion invalide,
source future inconnue refusée, absence de code outil distribué sans droit.

Panne centrale : cas exécuté hors production seulement ; ne pas désactiver Titayla
ni changer son registre/clé pour fabriquer une panne en production. Même règle
pour les paiements et les comptes : pas de panne/problème réel volontaire.
Contrôler inscriptions, catalogue et Prompteur, valeurs Live et prix/Pass par
comparaison au snapshot. Les cas commerciaux positifs Live restent en attente
d'un droit légitime correspondant, sans création d'abonnement de test Live.

## Retour arrière coordonné

Déclencher sur fuite d'asset, refus systématique des titulaires, régression
Prompteur/inscriptions/facturation ou échec fonctionnel bloquant.
Révoquer uniquement les deux IDs de reçus créés. Restaurer le Worker Titayla à
la version approuvée 71462b6c-8677-44eb-8113-278690572009 après relecture de
l'absence de publication concurrente. Vérifier ensuite registre et paramètres ;
restaurer seulement l'entrée simulation-credit si nécessaire, sans écraser les
autres entrées. Restaurer seulement l'ancienne app_url par le SQL à garde de
concurrence. Conserver la table additive et les reçus, aucun DROP ou DELETE.
Le nouveau Worker/domaine peut rester en refus d'accès ; aucune réaffectation
à une autre application. Ne restaurer aucune donnée ou souscription Stripe.

## Ancien domaine — autorisation distincte

Voir legacy-domain-removal-plan-2026-10-20.md. Cette association sert encore une
page Les Clés du Crédit avec connexion/abonnement. Ses dépendances externes
ne sont pas toutes démontrées absentes. Aucune suppression dans cette mission,
ni dans l'autorisation globale ci-dessus. Le nouveau simulateur n'en dépend pas.
