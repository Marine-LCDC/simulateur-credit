# Simulateur de crédit indépendant — migration Titayla

Branche `codex/migration-titayla`, issue du commit historique `33cceed5`.
L'ancienne version et son CNAME restent dans `legacy/`, hors des assets publiés.
L'historique complet est conservé ; aucune réécriture et aucun changement main.

## Application

Les composants, styles du simulateur, moteur, PDF et neuf tests proviennent
de Titayla (commits d20ceb1 / deed5cb). Le manifeste `docs/source-manifest.json`
en fige les empreintes. Mensualité HORS assurance, calculs locaux, aucun stockage,
compte métier, Stripe ou Supabase dans l'application indépendante.
React/Vite remplace uniquement l'enveloppe Next. Les styles globaux Titayla sont
repris sans l'import Tailwind ; les classes utilisées par le simulateur sont
conservées. Le lien catalogue passe par le Worker vers l'origine du portail.

## Accès

`titayla-access/{protocol,guard,callback}.ts` reprend sans changement le protocole
générique utilisé par Prompteur et Titayla. Le Worker vérifie signature RS256,
audience simulation-credit, nonce navigateur, droit courant et identité avant
TOUS les assets. Cookie Secure/HttpOnly/SameSite=Lax, 300 secondes maximum,
no-store navigateur/CDN, erreurs et redirections du vérificateur refusées.
Le garde navigateur recontrôle aussi les droits ; aucune promesse d'usage hors
ligne ni d'effacement des anciennes copies client déjà téléchargées.

## Validation

Node 24. `npm ci` puis `npm run build`, `npm test`, `npm run test:worker`.
Le dernier test exécute Wrangler et Chromium, avec un transport de droits local
injecté uniquement dans une entrée de test ignorée de Git. Aucun paiement réel.
La compilation refuse les erreurs TypeScript et ne publie aucune sourcemap.

## Préproduction HTTPS

Deux nouveaux Workers uniquement : `simulateur-credit-staging` et
`simulateur-credit-recette-auth`. Le second est un service de recette privé
avec identités fictives et politique individuelle/Pass copiée de Titayla.
Aucune clé, donnée ou session de production n'est utilisée. Sa clé RSA et son
mot de passe sont distincts, installés comme secrets, jamais dans Git ou dist.
Les identifiants locaux de recette restent dans le fichier ignoré
`test-results/staging-credentials.json` (utilisateur HTTP Basic : `recette`).

Après commit et push exacts : `node scripts/provision-staging.mjs`, puis
`node scripts/test-staging.mjs`. Le provisionnement refuse tout autre dépôt,
branche, Worker ou domaine. Les captures et preuves sont sous test-results.
La chaîne du dépôt comporte validation GitHub Actions et workflow manuel
`Deploy isolated staging`, à activer avec les secrets Cloudflare de
l'environnement GitHub staging. Aucun workflow de production n'est fourni.

La recette privée n'est pas Titayla de production : la recette avec vrais droits
Titayla reste requise après configuration autorisée du registre central.

## Publication et retour arrière

Lire `docs/migration.md`. La configuration production est PRÉPARÉE uniquement.
Ne jamais déployer `wrangler.production.jsonc` sans autorisation de production.
Les Clés du Crédit et ses domaines sont entièrement hors périmètre.
