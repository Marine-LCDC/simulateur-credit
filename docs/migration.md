# Publication après validation explicite

## Périmètre

Dépôt cible : Marine-LCDC/simulateur-credit. APP_ID conservé : simulation-credit.
Domaine cible : simulateur-credit.titayla.com. Aucun changement de l'autre
sous-domaine simulationcredit.titayla.com, ni de Les Clés du Crédit.

## Avant publication

- Revalider les commits GitHub, le build, les tests et la préproduction HTTPS.
- Relever la version Titayla et sa provenance ; la baseline observée est
  71462b6c-8677-44eb-8113-278690572009 (annotation 9558dec).
- Relever l'état courant du registre central et la seule ligne de catalogue
  simulation-credit ; préserver toute mise à jour concurrente.
- Vérifier que le nouveau domaine est toujours libre et que le nouveau Worker
  simulateur-credit n'a pas reçu de déploiement concurrent.
- Faire valider les changements préparés dans la branche Titayla
  codex/migration-simulateur-credit, basée sur le code déployé 9558dec.

## Ordre de bascule autorisée

1. Publier le nouveau Worker simulateur-credit avec wrangler.production.jsonc,
   après commit/push vérifiés. Installer uniquement la clé PUBLIQUE Titayla,
   APP_ID=simulation-credit, TITAYLA_URL=https://titayla.com. Aucune clé privée,
   Stripe ou Supabase sur ce Worker. Ne pas réutiliser les clés de recette.
2. Rattacher uniquement simulateur-credit.titayla.com. Le Worker refuse tout
   accès tant que le SSO central n'est pas entièrement configuré.
3. Ajouter l'entrée simulation-credit au registre TITAYLA_APP_ORIGINS existant,
   sans toucher à Prompteur ni aux clés ou modes du portail.
4. Mettre à jour uniquement apps.app_url pour simulation-credit vers la nouvelle
   origine. Ne changer aucun prix, abonnement, Pass, identifiant, statut de vente.
5. Publier la branche Titayla validée via son circuit contrôlé existant. Elle
   rend la fiche planned visible, sans ouvrir la vente, et garde l'ancien lien
   comme redirection temporaire vers /acces/simulation-credit/.
6. Recette réelle non destructive : droits individuels/Pass existants,
   absence de droit, callback, retrait, logout, assets, PDF, fiche et ancien lien.
   Aucun Checkout réel, e-mail ou changement d'abonnement pour tester.

## Retour arrière

Ne supprimer aucun code ni Worker. Restaurer la version Titayla immuable
relevée juste avant la bascule, l'ancienne app_url et uniquement l'entrée
simulation-credit du registre. Préserver les autres entrées et changements.
Si le nouveau Worker est déjà utilisé, restaurer sa dernière version validée
ou le laisser refuser l'accès ; ne jamais transférer son domaine au Worker
Les Clés du Crédit. Aucun mouvement de données ou abonnement n'est nécessaire.

## Nettoyage différé

Les sources du simulateur restent dans Titayla jusqu'à validation. Fichiers
candidats : src/components/credit-simulator/*, src/lib/credit-simulator/*,
scripts/test-credit.mjs ; retirer jsPDF uniquement après contrôle de tous ses
autres usages. Conserver fiche, SEO, route de compatibilité, Pass et droits.
L'ancien CNAME GitHub Pages et son domaine historique ne sont pas modifiés.

## Transport Cloudflare

Le flag global_fetch_strictly_public permet les appels HTTP entre Workers du
même compte, y compris workers.dev pendant la recette. Les origines restent
validées et toutes les redirections du vérificateur sont refusées. Aucun
changement du protocole générique ou contournement des droits.
