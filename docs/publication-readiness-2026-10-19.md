# Dossier de publication — 19 octobre 2026

Statut : préparation uniquement. Aucune publication de production autorisée.

## Sources vérifiées

- simulateur-credit : branche codex/migration-titayla, e670fbbc78c0d57e94a85df40728c0dd6e9f2844 vérifié sur GitHub avant ajout des outils de préparation.
- titayla : branche codex/migration-simulateur-credit, ff13697295a6b3732aeabde45ed35c758478c077 vérifié sur GitHub avant ajout des outils de préparation.
- Les nouveaux outils et procédures sont committés sur ces mêmes branches ; les SHA finaux exacts sont consignés dans les manifestes locaux de publication.
- Aucune fusion dans main, réécriture d'historique ou modification des copies de travail préexistantes.

## État de production relu

Titayla : version 71462b6c-8677-44eb-8113-278690572009, déploiement db9cd184-cadf-4dcd-adb2-1b4357ce4141,
annotation « Catalogue et acces 9558dec - inscriptions ouvertes », trafic 100 %.

Paramètres à préserver : AUTH_PUBLIC_ENABLED=true ; CATALOG_SOURCE=supabase ; STRIPE_MODE=live ;
TITAYLA_ACCESS_MODE=live ; SUBSCRIPTION_NOTIFICATIONS_CAPTURE=false ; SUBSCRIPTION_NOTIFICATIONS_DELIVERY=off.
Les secrets restent dans le portail, aucune rotation ou export de clé privée.

Registre actuel : Prompteur uniquement. Registre préparé : même objet, avec ajout de
simulation-credit=https://simulateur-credit.titayla.com. Préserver toute autre entrée concurrente.

Catalogue : simulation-credit published/planned/subscription, app_url=/simulateur-credit/.
Le Pass immobilier contient déjà le simulateur. Les tarifs publics observés concernent Prompteur et le Pass immobilier ;
aucun tarif individuel du simulateur n'apparaît dans cette lecture publique. Cela ne prouve pas l'absence de droits historiques.
Ne créer aucun tarif ni abonnement pour cette publication. Les règles individuelles et Pass sont conservées.

Le Worker de production simulateur-credit n'existe pas encore. Le nouveau domaine n'a aucune association Worker
et le DNS public HTTPS répond NXDOMAIN. L'API détaillée DNS est refusée au jeton actuel ; cette lecture n'est pas nécessaire
pour préparer le domaine personnalisé Workers. Recontrôler la disponibilité avant toute opération autorisée.
simulationcredit.titayla.com reste strictement inchangé ; aucun appel d'écriture ne le vise.
Ni dépôt ni Worker Les Clés du Crédit n'entre dans le périmètre d'opérations.

## Compatibilité Auth et droits

Le protocole et les garde/callback du simulateur sont identiques aux modules génériques de Prompteur.
App ID : simulation-credit ; mensualité hors assurance inchangée. Clé RSA publique existante de Prompteur
retrouvée et validée pour import Web Crypto, RSA >= 2048 bits, aucune composante privée.
Empreinte SHA-256 normalisée kty/n/e : 0ebfc9feec10936c1ec987e67ef575da5a4ad214c42602c6e77f92bae47a03e8.
Sa correspondance opérationnelle avec le signataire central doit être confirmée par une vraie session lors de la recette.
Ne jamais remplacer les clés centrales par celles de la recette fictive.

La vérification anonyme réelle /api/droits/?app=simulation-credit répond 401.
Les validations positives du protocole, des rôles, des périodes, de la révocation et des Pass passent sur fixtures.
Une recette positive avec compte réellement autorisé reste une condition d'acceptation après raccordement.
Aucun compte client, abonnement, Customer Stripe ou e-mail n'a été utilisé comme fixture réelle.

## Validations renouvelées

Simulateur : build/TypeScript, 36 tests, Worker local + Chromium, recette HTTPS privée individuelle et Pass,
amortissement, PDF, refus sans droit, assertion expirée/invalide/autre app, ressources directes.
Titayla : build vinext, typage, 29 tests ciblés, émission/vérification d'assertions dans les vraies routes avec fixtures,
recette catalogue et anciens liens, 4 tests supplémentaires de préparation/SQL sur base locale PGlite.
Le code métier transféré conserve ses empreintes d'origine. Les nouvelles préparations ne changent pas son exécution.

## Correction indispensable du circuit de publication

La configuration source historique Titayla force AUTH_PUBLIC_ENABLED=false.
Ne pas utiliser npm run deploy:vinext / controlled-release publish pour cette migration : cela fermerait les inscriptions.
Le script dédié scripts/prepare-simulator-release.mjs de la branche Titayla crée
dist/server/wrangler.simulator-release.json avec keep_vars=true et UNE SEULE variable explicite : le registre fusionné.
Les inscriptions, notifications, modes Live et secrets distants sont préservés ; code et registre sont publiés ensemble.
Le script est de préparation uniquement : il ne possède aucun mode de publication.

## Préparation reproductible, sans publication

Dans simulateur-credit-migration :

1. node scripts/prepare-production.mjs — GET Cloudflare/catalogue public uniquement, écrit un snapshot local.
2. npm run build — puis tests déjà décrits dans README.
3. Après commit/push exacts et vérifiés : node scripts/prepare-production-config.mjs — dry-run uniquement.

Dans titayla-simulateur-migration, après build, tests et commit/push vérifiés :

node scripts/prepare-simulator-release.mjs C:/Projects/simulateur-credit-migration/test-results/production-preflight/snapshot.json

Fichiers locaux ignorés de Git : snapshot, clé PUBLIQUE, registres avant/après, configurations bootstrap et domaine,
manifestes de source/digest/baseline. Aucun secret privé dans ces artefacts. Ne pas confondre avec staging-credentials.json.

## Ordre exact après autorisation explicite

1. Relire la version active, les bindings et le registre. Si différence avec le manifeste : arrêter, réauditer et faire valider.
   Revalider les SHA GitHub exacts et les empreintes des artefacts. Vérifier l'absence d'environnement de test local.
2. Créer le seul nouveau Worker simulateur-credit avec la configuration bootstrap préparée : pas de domaine,
   workers_dev=false, preview_urls=false, clé PUBLIQUE réelle, APP_ID=simulation-credit, TITAYLA_URL=https://titayla.com.
   Ne pas réutiliser le Worker de recette ou un Worker existant.
3. Après contrôle de cette version, rattacher uniquement simulateur-credit.titayla.com via la configuration de domaine préparée.
   Vérifier certificat HTTPS et contrôle avant ASSETS ; les accès restent refusés tant que Titayla n'est pas raccordé.
4. Publier Titayla avec la configuration générée dédiée, après invocation de scripts/release-source.mjs et recontrôle de la baseline.
   Commande après ces gardes uniquement : node node_modules/@vinext/cloudflare/dist/cli.js deploy --skip-build --config dist/server/wrangler.simulator-release.json.
   Cette publication fusionne le registre sans modifier l'origine Prompteur et déploie la fiche/compatibilité d'URL.
5. Exécuter UNIQUEMENT docs/operations/simulator-catalogue-apply.sql de Titayla, après accord sur cette mise à jour de catalogue.
   Transaction avec verrou et contrôle de baseline : seul app_url et son updated_at automatique changent.
   Ne pas utiliser l'enregistrement complet de l'administration catalogue : il réécrit les relations et plans.
6. Effectuer la recette réelle ci-dessous avant d'annoncer le service disponible. Garder la vente individuelle planned.

## Recette réelle après publication

Utiliser des sessions navigateur appartenant à des testeurs autorisés ; aucune collecte de mot de passe, JWT ou cookie dans les rapports.

- Visiteur sans connexion : document, index.html, chaque JS/CSS du build et API de session refusés/redirigés ; aucun code outil distribué.
- Compte sans droit : retour vers la fiche avec refus ; ni calculateur ni fichier protégé servi.
- Compte avec abonnement individuel préexistant valide : nonce, callback, ouverture, quatre calculs, taux nul, assurance, amortissement, PDF.
- Compte avec Pass valide contenant explicitement simulation-credit : même parcours. Un autre univers ou rôle admin seul ne donne aucun droit.
- Si aucun compte individuel autorisé n'est disponible : test individuel réel NON RÉALISÉ, ne pas créer de souscription de production pour le fabriquer.
- Expiration de l'assertion : patienter jusqu'à sa véritable échéance (<= 300 s), vérifier refus de l'ancienne assertion ; nouveau SSO possible
  si le droit reste actif. Ne jamais afficher l'assertion conservée temporairement en mémoire de test.
- Expiration de l'abonnement : utiliser un compte déjà expiré ou constater son expiration naturelle ; accès refusé. Ne pas annuler/modifier un abonnement.
- Accès direct aux JS, CSS, HTML et API dans une nouvelle session vierge : refus, y compris après la recette autorisée.
- Contrôler Cache-Control/CDN no-store, cookies Secure/HttpOnly/SameSite=Lax, absence d'assertion dans URL après callback et absence de sourcemap.
- Prompteur : origine centrale inchangée, catalogue/tarif/Pass identiques, ouverture par un testeur déjà autorisé. Aucun achat, portail Stripe ou logout global pour tester.
- Comparer modes, inscriptions et notifications aux paramètres du manifeste, et relations/prix publics au snapshot. Aucune modification des abonnements n'est requise.

## Retour arrière

Déclencheurs : fichier protégé servi sans droit, régression Prompteur, changement d'inscriptions/modes Live,
erreur du vérificateur, rejet systématique des comptes autorisés, échec fonctionnel bloquant.

Restaurer Titayla à la version immuable 71462b6c-8677-44eb-8113-278690572009, après accord de retour arrière
et vérification de sa disponibilité et de l'absence de publication concurrente. Cette version conserve le registre et les
paramètres originaux. Relire le registre après rollback : si nécessaire, restaurer UNIQUEMENT l'entrée simulation-credit,
en conservant toutes les autres entrées et modifications concurrentes. Ne pas réécrire aveuglément l'objet entier.
Si la seule URL de catalogue a été changée, appliquer simulator-catalogue-rollback.sql : refuse une URL modifiée depuis,
préserve les autres champs et ne touche ni aux Pass, ni aux prix, ni aux abonnements.
Le nouveau Worker et son nouveau domaine restent en place, accès fermé si le registre manque ; pas de suppression automatique,
pas de réaffectation à un autre Worker. Aucun mouvement de données à inverser.
Ne pas exécuter rollback:controlled : ses consignes historiques de fermeture commerciale ne sont pas ce plan.

## Conditions avant feu vert final

- Autorisation explicite de production (non reçue).
- Baseline et artefacts toujours identiques au moment d'agir.
- Testeurs réels disposant des profils requis disponibles ; sinon marquer les cas correspondants en attente.
- Clé publique déployée confirmée par une session centrale réelle, avant acceptation du service.

L'ancien domaine erroné fera l'objet d'une mission séparée. Aucune suppression de fichiers Titayla dans cette publication.
