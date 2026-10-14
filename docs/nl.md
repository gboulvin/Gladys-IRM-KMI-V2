# Weer Benelux

## Overzicht

Deze integratie brengt de weergegevens van het Koninklijk Meteorologisch Instituut van België (KMI/IRM) naar Gladys, voor de ondersteunde locaties in België, Luxemburg en Nederland.[1] Gladys geeft de gevraagde locatie door: u hoeft dus geen gemeente, station of API-sleutel in te stellen.

> Het KMI publiceert geen officiële documentatie voor de mobiele API die hier wordt gebruikt. De werking kan zonder voorafgaande kennisgeving wijzigen; als de dienst onbeschikbaar wordt, schrijft de integratie een duidelijke foutmelding in haar logboeken.[2]

| Beschikbare gegevens | Weergave in Gladys                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Huidige toestand     | Temperatuur, hemeltoestand, luchtdruk, wind, windstoten en uv-index wanneer het KMI ze levert.   |
| Uurverwachtingen     | Tot 24 tijdstippen met temperatuur, neerslag, neerslagkans, wind en luchtdruk.                   |
| Dagverwachtingen     | Tot 8 volledige dagen met minimum- en maximumtemperatuur, neerslag, wind en zonnetijden.         |
| Waarschuwingen       | Wind, regen, sneeuw/ijzel, onweer, mist, koude, hitte en kustwaarschuwingen, indien beschikbaar. |

## Installatie

Installeer de integratie vanuit de Gladys-catalogus zodra haar Docker-image is gepubliceerd. Installeert u de repository handmatig, bouw dan eerst een image die past bij de architectuur van uw server en verwijs ernaar in het manifest van de integratie.

Het project volgt de officiële Gladys-template voor integraties. Publiceert u uw eigen kopie, laat dan `docker_image` en `cover_image` in `gladys-assistant-integration.json` naar uw eigen GitHub-repository wijzen. De meegeleverde release-workflow bouwt voor elke versie een multi-architectuur-image.[3]

## Configuratie

Er zijn geen persoonlijke gegevens nodig. De optionele instelling **Cacheduur** staat standaard op 600 seconden. Ze bepaalt hoe lang een gedownloade verwachting hergebruikt mag worden voor dezelfde locatie en hetzelfde eenhedenstelsel. Zet ze op `0` om de cache uit te schakelen; dat verhoogt het aantal oproepen naar het KMI.

|          Waarde | Aanbevolen gebruik                                                          |
| --------------: | --------------------------------------------------------------------------- |
|             `0` | Tijdelijke probleemoplossing of uitzonderlijk elke netwerkoproep afdwingen. |
| `300` tot `900` | Normaal gebruik; minder oproepen zonder verouderde verwachtingen.           |
|          `3600` | Alleen voor installaties die heel vaak dezelfde locatie opvragen.           |

## Werking en eenheden

Gladys stuurt een verzoek met breedtegraad, lengtegraad, taal en de eenheden van de gebruiker. De integratie rondt de coördinaten af, bevraagt de KMI-API en geeft het resultaat terug in het standaard weerformaat van Gladys. De brongegevens zijn metrisch; de wind wordt in meter per seconde teruggegeven in het metrische stelsel, en de waarden worden omgezet naar Fahrenheit, mijl per uur en inch wanneer Gladys Amerikaanse eenheden vraagt.[4]

Waarschuwingen worden weergegeven in de taal van de gebruiker wanneer het KMI die levert (Nederlands, Frans, Engels of Duits); anders in het Engels. KMI-waarschuwingsniveaus 1, 2 en 3 worden de ernstniveaus `minor`, `moderate` en `severe`. Waarschuwingen zonder betrouwbaar type of niveau worden bewust weggelaten om dubbelzinnige meldingen te vermijden.

## Beperkingen

De referentie-API levert geen luchtvochtigheid of dauwpunt; die waarden worden dus niet getoond. Een dagverwachting kan twee toestanden bevatten; alleen de eerste wordt behouden. Buienradar-animatie en pollen vallen buiten deze versie, omdat de weerinterface van Gladys ze niet in een geschikte vorm doorgeeft.[1] [2]

## Probleemoplossing

Verschijnt er geen verwachting, controleer dan eerst of de locatie in Gladys binnen het ondersteunde Benelux-gebied ligt. Raadpleeg daarna de logboeken van de integratie: een mislukt HTTP-antwoord, een ongeldig antwoord of een time-out wordt er expliciet vermeld. Bij een tijdelijke storing van het KMI volstaat het later opnieuw te proberen; een langere cacheduur kan ook fouten door herhaalde verzoeken beperken.

## Referenties

[1]: https://github.com/jdejaegh/irm-kmi-ha 'KMI/IRM-integratie voor Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'KMI/IRM Python-client'
[3]: https://github.com/GladysAssistant/integration-template-js 'Officiële JavaScript-template voor Gladys-integraties'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'Implementatie van het KMI/IRM-protocol'
