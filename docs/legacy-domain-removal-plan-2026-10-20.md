# Ancienne association erronée — opération indépendante NON autorisée

La publication du nouveau simulateur ne dépend pas de cette suppression.

Lecture du 20 octobre :
- Compte : 690699e6b1b9ab890f6902d8946d0e52.
- Association : 99309a00e6e2715200979d74c8e0f93f6bb47339.
- Domaine : simulationcredit.titayla.com.
- Service : les-cles-du-credit, environnement production.

La racine répond encore 200 avec l'application Les Clés du Crédit et des liens
connexion/abonnement. Supprimer l'association retirerait donc un point d'entrée
réel de cette application, malgré le nom erroné. Aucun lien d'exécution vers cet
ancien domaine n'a été trouvé dans les sources Titayla/simulateur examinées.

Avant toute suppression : obtenir une autorisation SPÉCIFIQUE ; relire l'ID,
hostname, service et environnement ; vérifier les autres points d'entrée légitimes
et dépendances (liens diffusés, retours Auth, retours de paiement, webhooks).
Ces dépendances externes ne sont pas toutes prouvées absentes : ne pas annoncer
une suppression sans impact sur la seule base d'une recherche dans les dépôts.

L'unique ressource candidate est l'association de domaine ci-dessus, via
DELETE /accounts/690699e6b1b9ab890f6902d8946d0e52/workers/domains/99309a00e6e2715200979d74c8e0f93f6bb47339.
Cette ligne est documentaire, pas une commande exécutée ni un script automatique.
Ne supprimer aucun Worker, dépôt, compte, abonnement, autre domaine ou DNS en masse.

Retour arrière à prévoir séparément : recréer la même association vers le même
service après vérification des éventuels changements concurrents, avec contrôle
du certificat. Conserver les métadonnées avant suppression dans un reçu local.

État actuel : aucune suppression ni modification de cette association effectuée.
Cette opération est EXCLUE de l'autorisation globale demandée pour le nouveau simulateur.
