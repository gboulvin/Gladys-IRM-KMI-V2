# Tiempo Benelux

## Descripción general

Esta integración incorpora a Gladys los datos meteorológicos del Real Instituto Meteorológico de Bélgica (IRM/KMI) para las ubicaciones admitidas en Bélgica, Luxemburgo y los Países Bajos.[1] Gladys proporciona la ubicación solicitada, por lo que no necesita configurar ninguna localidad, estación ni clave de API.

> El IRM/KMI no publica documentación oficial de la API móvil utilizada aquí. Su funcionamiento puede cambiar sin previo aviso; si el servicio deja de estar disponible, la integración registra un error claro en sus registros.[2]

| Datos disponibles     | Presentación en Gladys                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Condiciones actuales  | Temperatura, estado del cielo, presión, viento, rachas e índice UV cuando el proveedor los envía.                  |
| Previsiones por horas | Hasta 24 horas con temperatura, precipitación, probabilidad de precipitación, viento y presión.                    |
| Previsiones diarias   | Hasta 8 días completos con temperaturas mínima y máxima, precipitación, viento y horas de salida y puesta del sol. |
| Avisos                | Viento, lluvia, nieve/hielo, tormenta, niebla, frío, calor y avisos costeros, cuando están disponibles.            |

## Instalación

Instale la integración desde el catálogo de Gladys una vez publicada su imagen Docker. Si instala el repositorio manualmente, construya primero una imagen compatible con la arquitectura de su servidor y haga referencia a ella en el manifiesto de la integración.

El proyecto sigue la plantilla oficial de integraciones de Gladys. Si publica su propia copia, haga que `docker_image` y `cover_image` de `gladys-assistant-integration.json` apunten a su propio repositorio de GitHub. El flujo de publicación incluido construye una imagen multiarquitectura para cada versión.[3]

## Configuración

No se necesita ningún dato personal. El ajuste opcional **Duración de la caché** vale 600 segundos por defecto. Determina durante cuánto tiempo se puede reutilizar una previsión descargada para la misma ubicación y el mismo sistema de unidades. Use `0` para desactivar la caché; esto aumenta las llamadas al servicio del IRM/KMI.

|         Valor | Uso recomendado                                                              |
| ------------: | ---------------------------------------------------------------------------- |
|           `0` | Diagnóstico puntual o necesidad excepcional de forzar cada llamada de red.   |
| `300` a `900` | Uso habitual; reduce las llamadas sin que la previsión quede desactualizada. |
|        `3600` | Solo para instalaciones que solicitan muy a menudo la misma ubicación.       |

## Funcionamiento y unidades

Gladys envía una solicitud con la latitud, la longitud, el idioma y las unidades preferidas del usuario. La integración redondea las coordenadas, consulta la API del IRM/KMI y devuelve el resultado en el formato meteorológico estándar de Gladys. Los datos de origen son métricos; el viento se devuelve en metros por segundo en el sistema métrico, y los valores se convierten a Fahrenheit, millas por hora y pulgadas cuando Gladys solicita unidades estadounidenses.[4]

El IRM/KMI no publica sus avisos en español: se muestran en inglés. Los niveles de aviso 1, 2 y 3 del IRM/KMI se convierten en las gravedades `minor`, `moderate` y `severe`. Los avisos sin un tipo o un nivel fiable se omiten deliberadamente para evitar notificaciones ambiguas.

## Limitaciones

La API de referencia no proporciona humedad ni punto de rocío, por lo que estos valores no se muestran. Una previsión diaria puede contener dos estados; solo se conserva el primero. La animación del radar de lluvia y el polen quedan fuera de esta versión, ya que la interfaz meteorológica de Gladys no los transmite de forma adecuada.[1] [2]

## Solución de problemas

Si no aparece ninguna previsión, compruebe primero que la ubicación de Gladys se encuentra dentro de la zona del Benelux admitida. Consulte después los registros de la integración: una respuesta HTTP fallida, una respuesta no válida o un tiempo de espera agotado se indican explícitamente. Ante una indisponibilidad temporal del proveedor, basta con volver a intentarlo más tarde; aumentar la duración de la caché también puede reducir los fallos causados por solicitudes repetidas.

## Referencias

[1]: https://github.com/jdejaegh/irm-kmi-ha 'Integración IRM/KMI para Home Assistant'
[2]: https://github.com/jdejaegh/irm-kmi-api 'Cliente Python del IRM/KMI'
[3]: https://github.com/GladysAssistant/integration-template-js 'Plantilla oficial JavaScript para integraciones de Gladys'
[4]: https://github.com/jdejaegh/irm-kmi-api/blob/main/irm_kmi_api/api.py 'Implementación del protocolo IRM/KMI'
