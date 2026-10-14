# Architecture — Météo Bénélux

## Objet et périmètre

**Météo Bénélux** est une intégration externe Gladys de type `weather`. Elle fournit, pour une position demandée par Gladys, les conditions courantes, jusqu’à vingt-quatre prévisions horaires, jusqu’à huit prévisions quotidiennes ainsi que les avertissements météo de l’Institut royal météorologique de Belgique (IRM/KMI). La couverture dépend du service de l’IRM/KMI et vise la Belgique, le Luxembourg et les Pays-Bas.[1] [2]

> Le service distant est issu de l’API non documentée de l’application mobile de l’IRM/KMI. Son interface peut évoluer sans préavis ; l’intégration ne prétend donc pas être affiliée, sponsorisée ou validée par l’IRM/KMI.[2]

| Décision           | Choix retenu                                                                                                                      | Justification                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Type d’intégration | `weather`                                                                                                                         | Gladys fournit la position à chaque requête et attend une réponse dans le format météo pivot.[3]                          |
| Transport          | `cloud`                                                                                                                           | La source de données est une API HTTPS distante.                                                                          |
| Configuration      | `cache_duration` facultatif, 600 secondes par défaut                                                                              | La réponse est identique à court terme pour une même position ; le cache réduit les appels à une API non documentée.      |
| API IRM/KMI        | `https://app.meteo.be/services/appv4/?s=getForecasts`                                                                             | Le client de référence demande une clé calculée quotidiennement, avec latitude et longitude arrondies à six décimales.[4] |
| Langue             | Français, néerlandais, anglais ou allemand, normalisée à `fr`, `nl`, `en` ou `de`                                                 | Ces quatre langues sont proposées dans les données textuelles de l’IRM/KMI.[4]                                            |
| Dégradation        | Un échec de l’API principale échoue explicitement ; les avertissements incomplets sont omis sans masquer la prévision principale. | Les données météo doivent rester cohérentes et vérifiables.                                                               |

## Modules

Le point d’entrée reste volontairement mince ; `src/app.js` reçoit le client Gladys en paramètre, ce qui permet de le tester contre le faux Gladys du SDK. Il associe les hooks météo du SDK à quatre modules indépendants : un client HTTP pour le protocole IRM/KMI, un cache mémoire par position, un normaliseur de prévision et un normaliseur d’avertissements. Cette séparation reprend le principe du template officiel — infrastructure SDK dans le point d’entrée, logique métier isolée — et l’architecture de l’intégration Météo France.[3]

| Module                  | Responsabilité                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `index.js`              | Instancier le SDK, enregistrer les handlers puis se connecter.                                                 |
| `src/app.js`            | Recevoir les requêtes Gladys, actualiser la configuration et publier l’état de connexion.                      |
| `src/irm-kmi-api.js`    | Construire l’URL signée du jour, appliquer un délai d’expiration, valider le code HTTP et décoder le JSON.     |
| `src/forecast.js`       | Transformer les observations et prévisions IRM/KMI dans le pivot Gladys, avec conversions métrique / impérial. |
| `src/conditions.js`     | Traduire les codes d’icône IRM/KMI vers les conditions normalisées Gladys.                                     |
| `src/alerts.js`         | Convertir les avertissements IRM/KMI en alertes pivot, avec type, gravité, durée et texte localisé.            |
| `src/forecast-cache.js` | Éviter les requêtes dupliquées par clé latitude / longitude / unités / langue.                                 |

## Correspondances de données

Les données `obs`, `for.hourly`, `for.daily` et `for.warning` du fournisseur couvrent respectivement l’observation, les prévisions horaires, quotidiennes et les alertes. Les températures sont reçues en degrés Celsius, les vitesses de vent en km/h, les précipitations en mm et la pression en hPa.[4]

| Donnée IRM/KMI                                  | Champ pivot Gladys                           | Règle de conversion                                                    |
| ----------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `obs.temp`                                      | `temperature`                                | °C ou °F selon les unités demandées.                                   |
| `obs.ww`, `obs.dayNight`                        | `weather`, `is_day`                          | Table de correspondance explicite des codes 0 à 27.                    |
| `for.hourly[].temp`                             | `hours[].temperature`                        | Jusqu’à vingt-quatre entrées successives à partir de l’heure courante. |
| `for.hourly[].windSpeedKm`, `windPeakSpeedKm`   | `wind_speed`, `wind_gust`                    | m/s ou mph ; les rafales nulles sont omises.                           |
| `for.hourly[].precipQuantity`, `precipChance`   | `precipitation`, `precipitation_probability` | mm ou pouces ; probabilité conservée sur l’échelle 0–100.              |
| `for.daily[].tempMin`, `tempMax`                | `days[].temperature_min`, `temperature_max`  | Valeurs ordonnées, avec absence tolérée pour une période nocturne.     |
| `for.daily[].dawnRiseSeconds`, `dawnSetSeconds` | `sunrise`, `sunset`                          | Secondes depuis minuit de la journée locale.                           |
| `for.warning[]`                                 | `alerts[]`                                   | Niveau 1–3 converti en gravité CAP `minor` / `moderate` / `severe`.    |

## Limites assumées

La prévision quotidienne de l’IRM/KMI peut contenir deux conditions pour une même journée ; seule la première condition est publiée afin de correspondre au modèle de Gladys. Les données d’humidité et de point de rosée ne sont pas exposées par l’API de référence et ne sont donc pas inventées.[2] L’animation radar et le pollen restent hors de cette première version : ils ne font pas partie du contrat météo pivot indispensable et mériteraient une interface dédiée.

## Références

[1]: https://github.com/jdejaegh/irm-kmi-ha 'Intégration IRM/KMI pour Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'Client Python IRM/KMI'
[3]: https://github.com/William-De71/gladys-meteo-france 'Intégration externe Météo France pour Gladys'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'Implémentation du protocole IRM/KMI'
