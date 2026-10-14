# Wetter Benelux

## Überblick

Diese Integration bringt die Wetterdaten des Königlichen Meteorologischen Instituts von Belgien (IRM/KMI) für unterstützte Standorte in Belgien, Luxemburg und den Niederlanden nach Gladys.[1] Gladys übermittelt den angefragten Standort: Sie müssen weder Ort noch Station noch API-Schlüssel konfigurieren.

> Das IRM/KMI veröffentlicht keine offizielle Dokumentation der hier genutzten mobilen API. Ihr Verhalten kann sich ohne Vorankündigung ändern; ist der Dienst nicht erreichbar, schreibt die Integration eine eindeutige Fehlermeldung in ihre Protokolle.[2]

| Verfügbare Daten   | Anzeige in Gladys                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Aktuelles Wetter   | Temperatur, Himmelszustand, Luftdruck, Wind, Böen und UV-Index, sofern der Anbieter sie liefert.          |
| Stundenvorhersagen | Bis zu 24 Zeitpunkte mit Temperatur, Niederschlag, Niederschlagswahrscheinlichkeit, Wind und Luftdruck.   |
| Tagesvorhersagen   | Bis zu 8 volle Tage mit Tiefst- und Höchsttemperatur, Niederschlag, Wind sowie Sonnenauf- und -untergang. |
| Warnungen          | Wind, Regen, Schnee/Glätte, Gewitter, Nebel, Kälte, Hitze und Küstenwarnungen, sofern verfügbar.          |

## Installation

Installieren Sie die Integration aus dem Gladys-Katalog, sobald ihr Docker-Image veröffentlicht ist. Wenn Sie das Repository manuell installieren, bauen Sie zuerst ein Image für die Architektur Ihres Servers und tragen Sie es im Manifest der Integration ein.

Das Projekt folgt der offiziellen Gladys-Vorlage für Integrationen. Wenn Sie eine eigene Kopie veröffentlichen, richten Sie `docker_image` und `cover_image` in `gladys-assistant-integration.json` auf Ihr eigenes GitHub-Repository aus. Der mitgelieferte Release-Workflow baut für jede Version ein Multi-Architektur-Image.[3]

## Konfiguration

Es werden keine persönlichen Daten benötigt. Die optionale Einstellung **Cache-Dauer** beträgt standardmäßig 600 Sekunden. Sie bestimmt, wie lange eine heruntergeladene Vorhersage für denselben Standort und dasselbe Einheitensystem wiederverwendet werden darf. Mit `0` wird der Cache deaktiviert; dadurch steigt die Zahl der Anfragen an das IRM/KMI.

|            Wert | Empfohlene Verwendung                                                        |
| --------------: | ---------------------------------------------------------------------------- |
|             `0` | Gelegentliche Fehlersuche oder ausnahmsweise jede Netzwerkanfrage erzwingen. |
| `300` bis `900` | Normaler Betrieb; weniger Anfragen, ohne veraltete Vorhersagen.              |
|          `3600` | Nur für Installationen, die sehr häufig denselben Standort abfragen.         |

## Funktionsweise und Einheiten

Gladys sendet eine Anfrage mit Breitengrad, Längengrad, Sprache und den bevorzugten Einheiten des Benutzers. Die Integration rundet die Koordinaten, fragt die IRM/KMI-API ab und gibt das Ergebnis im Standard-Wetterformat von Gladys zurück. Die Quelldaten sind metrisch; der Wind wird im metrischen System in Metern pro Sekunde zurückgegeben, und die Werte werden in Fahrenheit, Meilen pro Stunde und Zoll umgerechnet, wenn Gladys US-Einheiten anfordert.[4]

Warnungen werden in der Sprache des Benutzers angezeigt, sofern das IRM/KMI sie liefert (Deutsch, Französisch, Niederländisch oder Englisch), andernfalls auf Englisch. Die IRM/KMI-Warnstufen 1, 2 und 3 werden zu den Schweregraden `minor`, `moderate` und `severe`. Warnungen ohne verlässlichen Typ oder Schweregrad werden bewusst ausgelassen, um mehrdeutige Meldungen zu vermeiden.

## Einschränkungen

Die Referenz-API liefert weder Luftfeuchtigkeit noch Taupunkt; diese Werte werden daher nicht angezeigt. Eine Tagesvorhersage kann zwei Wetterzustände enthalten; nur der erste wird übernommen. Regenradar-Animation und Pollenflug sind nicht Teil dieser Version, da die Wetterschnittstelle von Gladys sie nicht in geeigneter Form überträgt.[1] [2]

## Fehlerbehebung

Wird keine Vorhersage angezeigt, prüfen Sie zuerst, ob der Gladys-Standort im unterstützten Benelux-Gebiet liegt. Sehen Sie dann in die Protokolle der Integration: Eine fehlgeschlagene HTTP-Antwort, eine ungültige Antwort oder eine Zeitüberschreitung wird dort ausdrücklich vermerkt. Bei einem vorübergehenden Ausfall des Anbieters hilft ein späterer erneuter Versuch; eine längere Cache-Dauer kann Fehler durch wiederholte Anfragen ebenfalls verringern.

## Referenzen

[1]: https://github.com/jdejaegh/irm-kmi-ha 'IRM/KMI-Integration für Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'IRM/KMI-Python-Client'
[3]: https://github.com/GladysAssistant/integration-template-js 'Offizielle JavaScript-Vorlage für Gladys-Integrationen'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'Implementierung des IRM/KMI-Protokolls'
