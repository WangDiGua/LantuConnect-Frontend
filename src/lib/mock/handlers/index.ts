import type MockAdapter from 'axios-mock-adapter';
import { registerHandlers as authHandlers } from './auth.mock';
import { registerHandlers as agentHandlers } from './agent.mock';
import { registerHandlers as skillHandlers } from './skill.mock';
import { registerHandlers as smartAppHandlers } from './smart-app.mock';
import { registerHandlers as datasetHandlers } from './dataset.mock';
import { registerHandlers as providerHandlers } from './provider.mock';
import { registerHandlers as categoryHandlers } from './category.mock';
import { registerHandlers as monitoringHandlers } from './monitoring.mock';
import { registerHandlers as systemConfigHandlers } from './system-config.mock';
import { registerHandlers as userSettingsHandlers } from './user-settings.mock';
import { registerHandlers as userMgmtHandlers } from './user-mgmt.mock';

export function registerAllHandlers(mock: MockAdapter): void {
  authHandlers(mock);
  agentHandlers(mock);
  skillHandlers(mock);
  smartAppHandlers(mock);
  datasetHandlers(mock);
  providerHandlers(mock);
  categoryHandlers(mock);
  monitoringHandlers(mock);
  systemConfigHandlers(mock);
  userSettingsHandlers(mock);
  userMgmtHandlers(mock);
}
