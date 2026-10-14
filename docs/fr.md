# Météo Bénélux

## Présentation

Cette intégration ajoute à Gladys les données de l’Institut royal météorologique de Belgique (IRM/KMI) pour les localisations prises en charge en Belgique, au Luxembourg et aux Pays-Bas.[1] Elle utilise la position demandée par Gladys : vous n’avez donc ni ville, ni station, ni clé API à configurer.

> L’IRM/KMI ne publie pas de documentation officielle pour l’API mobile utilisée ici. Le fonctionnement peut évoluer sans préavis ; l’intégration affichera une erreur claire dans ses journaux si le fournisseur devient indisponible.[2]

| Donnée disponible       | Présentation dans Gladys                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Conditions actuelles    | Température, état du ciel, pression, vent, rafales et indice UV quand le fournisseur les transmet.                           |
| Prévisions horaires     | Jusqu’à 24 échéances de température, précipitation, probabilité de précipitation, vent et pression.                          |
| Prévisions quotidiennes | Jusqu’à 8 journées complètes avec températures minimale et maximale, précipitations, vent et heures solaires.                |
| Avertissements          | Avertissements de vent, pluie, neige/verglas, orage, brouillard, froid, chaleur et submersion selon les données disponibles. |

## Installation

Ajoutez l’intégration depuis le catalogue Gladys une fois que son image Docker a été publiée. Si vous installez le dépôt manuellement, construisez d’abord l’image compatible avec l’architecture de votre serveur puis référencez-la dans le manifeste de l’intégration.

Le projet suit le template officiel Gladys. Si vous publiez votre propre copie du dépôt, adaptez les champs `docker_image` et `cover_image` du fichier `gladys-assistant-integration.json` à votre dépôt GitHub. Le workflow de publication fourni construit une image multi-architecture à chaque version.[3]

## Configuration

L’intégration ne demande aucune information personnelle. Le réglage **Durée du cache** est facultatif et vaut 600 secondes par défaut. Il détermine combien de temps une prévision déjà téléchargée peut être réutilisée pour une même position et les mêmes unités. Utilisez `0` pour désactiver le cache ; cette option augmente les appels au service IRM/KMI.

|        Valeur | Utilisation recommandée                                                           |
| ------------: | --------------------------------------------------------------------------------- |
|           `0` | Diagnostic ponctuel ou besoin exceptionnel de forcer chaque appel réseau.         |
| `300` à `900` | Usage habituel ; réduit les appels sans rendre la prévision obsolète.             |
|        `3600` | À réserver aux installations qui demandent très fréquemment la même localisation. |

## Fonctionnement et unités

Gladys adresse une demande incluant la latitude, la longitude, la langue et les unités de l’utilisateur. L’intégration arrondit les coordonnées, interroge l’API IRM/KMI puis renvoie le résultat dans le format météo standard de Gladys. Les données sources sont métriques ; le vent est renvoyé en mètres par seconde en système métrique, et les valeurs sont converties en Fahrenheit, miles par heure et pouces lorsque Gladys demande le système impérial.[4]

Les messages d’avertissement sont sélectionnés dans la langue demandée lorsqu’elle est disponible. Les niveaux IRM/KMI 1, 2 et 3 sont rendus avec les gravités `minor`, `moderate` et `severe`. Les avertissements sans niveau ou sans identifiant fiable sont volontairement omis afin d’éviter toute alerte ambiguë.

## Limites

L’API de référence ne fournit pas d’humidité ni de point de rosée. Ces informations ne sont donc pas affichées. Une prévision quotidienne peut comporter deux conditions ; seule la première est conservée. Le radar de pluie et le pollen ne font pas partie de cette version, car l’interface météo principale de Gladys ne les transporte pas sous une forme suffisante.[1] [2]

## Dépannage

Si aucune prévision ne s’affiche, vérifiez que la localisation Gladys se trouve bien dans la zone Bénélux supportée. Consultez ensuite les journaux de l’intégration : un code HTTP non réussi, une réponse invalide ou un délai dépassé y sont indiqués. Une indisponibilité temporaire du fournisseur peut être contournée en réessayant plus tard ; augmenter le cache peut également limiter les échecs causés par des demandes répétées.

## Références

[1]: https://github.com/jdejaegh/irm-kmi-ha 'Intégration IRM/KMI pour Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'Client Python IRM/KMI'
[3]: https://github.com/GladysAssistant/integration-template-js 'Template officiel JavaScript pour intégration Gladys'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'Implémentation du protocole IRM/KMI'
