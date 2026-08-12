# Météo Bénélux pour Gladys Assistant

**Météo Bénélux** est une intégration externe Gladys de type `weather`. Elle expose les conditions courantes, les prévisions horaires et quotidiennes, ainsi que les avertissements météo de l’Institut royal météorologique de Belgique (IRM/KMI) pour les localisations couvertes en Belgique, au Luxembourg et aux Pays-Bas.[1] [2]

> Cette intégration s’appuie sur une API mobile non documentée de l’IRM/KMI. Elle n’est ni affiliée à l’Institut royal météorologique de Belgique, ni sponsorisée ou validée par celui-ci. L’API est susceptible d’évoluer sans préavis.[2]

| Capacité                | Détail                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Conditions courantes    | Température, état du ciel, pression, vent, rafales et indice UV lorsqu’ils sont disponibles.                       |
| Prévisions horaires     | Jusqu’à 24 échéances avec température, précipitation, probabilité de précipitation, vent et pression.              |
| Prévisions quotidiennes | Jusqu’à 8 jours avec minimales, maximales, état du ciel, précipitation, vent et heures de lever/coucher du soleil. |
| Avertissements          | Type, gravité, période de validité et message de l’IRM/KMI, dans la langue demandée.                               |
| Unités                  | Réponse métrique ou impériale selon la préférence transmise par Gladys.                                            |

## Installation et publication

Le dépôt part du [template JavaScript officiel des intégrations Gladys][3]. Avant de publier l’intégration, remplacez **les deux occurrences** de `your-github-username` dans `gladys-assistant-integration.json` par le propriétaire réel du dépôt GitHub. Le manifeste pourra alors référencer l’image multi-architecture publiée dans GitHub Container Registry et l’illustration du catalogue.

```bash
npm ci
npm test
npm run lint
```

Après avoir poussé le dépôt sur GitHub, utilisez le workflow de publication fourni par le template. Il crée l’image correspondant à la version du manifeste. Ajoutez le sujet GitHub `gladys-assistant-integration` afin que Gladys puisse indexer l’intégration.[3]

## Configuration

Aucune clé personnelle ni compte IRM/KMI n’est requis. Gladys transmet la latitude et la longitude de la localisation demandée ; l’intégration interroge alors le fournisseur pour cette position. Le seul réglage est la durée du cache, qui limite les appels répétés vers le service distant.

| Champ              | Valeur par défaut |              Plage | Effet                                                                                                                              |
| ------------------ | ----------------: | -----------------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Durée du cache** |      600 secondes | 0 à 3 600 secondes | Conserve temporairement la même réponse pour une localisation et un système d’unités identiques. La valeur `0` désactive le cache. |

## Fonctionnement technique

Pour chaque demande, l’intégration arrondit les coordonnées à six décimales, calcule la clé quotidienne attendue par le service IRM/KMI et appelle `getForecasts`. Les données reçues sont ensuite converties dans le format météo pivot Gladys. Les températures, vents et précipitations sont convertis lorsque Gladys demande le système impérial. Le cache est invalidé dès que la configuration est mise à jour.[4]

Les codes d’état de l’IRM/KMI sont traduits explicitement vers les conditions du pivot Gladys. Par exemple, les codes 0–1 correspondent à un ciel dégagé, les codes 24–27 au brouillard et les codes 11–12 ainsi que 22–23 à la neige. Les avertissements de niveau 1, 2 et 3 deviennent respectivement `minor`, `moderate` et `severe`.[1] [4]

## Limites connues

L’API ne fournit pas de données d’humidité ni de point de rosée. L’intégration ne crée donc pas de valeurs artificielles pour ces champs. Les prévisions quotidiennes peuvent contenir deux états pour une même période ; seule la première condition est publiée, conformément à la limite du modèle météo cible. Le radar animé et le pollen sont volontairement exclus de cette première version, car ils requièrent une interface spécifique hors du pivot météo principal.[1] [2]

## Développement et vérification

La suite de tests comprend un échantillon de réponse IRM/KMI, les conversions métriques/impériales, la signature de requête quotidienne, les alertes, le cache et la validation de configuration.

```bash
npm test
npm run lint
npm run format:check
```

La conception détaillée est disponible dans [ARCHITECTURE.md](ARCHITECTURE.md). La documentation utilisateur est proposée en [français](docs/fr.md) et en [anglais](docs/en.md).

## Licence

Ce projet est distribué sous licence Apache-2.0, conformément au template Gladys utilisé comme point de départ.

## Références

[1]: https://github.com/jdejaegh/irm-kmi-ha 'Intégration IRM/KMI pour Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'Client Python IRM/KMI'
[3]: https://github.com/GladysAssistant/integration-template-js 'Template officiel JavaScript pour intégration Gladys'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'Implémentation du protocole IRM/KMI'
