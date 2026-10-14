// -----------------------------------------------------------------------------
// Point d'entrée de l'intégration externe Gladys « Météo Bénélux ».
//
// Ce fichier ne contient que l’amorçage : instancier le SDK, enregistrer les
// handlers (src/app.js) AVANT connect(), puis se connecter. Le SDK lit lui-même
// les variables d’environnement fournies par le superviseur Gladys
// (GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN, GLADYS_INTEGRATION_SELECTOR).
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { registerHandlers } from './src/app.js';

const gladys = new GladysIntegration();
registerHandlers(gladys);

logger.info("Démarrage de l'intégration Météo Bénélux...");
gladys.connect().catch((error) => {
  logger.error('Échec de la connexion à Gladys', error);
  process.exit(1);
});
