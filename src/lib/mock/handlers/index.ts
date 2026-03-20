import type MockAdapter from 'axios-mock-adapter';
import { registerHandlers as authHandlers } from './auth.mock';
import { registerHandlers as agentHandlers } from './agent.mock';
import { registerHandlers as monitoringHandlers } from './monitoring.mock';
import { registerHandlers as systemConfigHandlers } from './system-config.mock';
import { registerHandlers as knowledgeHandlers } from './knowledge.mock';
import { registerHandlers as databaseHandlers } from './database.mock';
import { registerHandlers as modelServiceHandlers } from './model-service.mock';
import { registerHandlers as toolHandlers } from './tool.mock';
import { registerHandlers as publishHandlers } from './publish.mock';
import { registerHandlers as billingHandlers } from './billing.mock';
import { registerHandlers as adminHandlers } from './admin.mock';
import { registerHandlers as projectHandlers } from './project.mock';
import { registerHandlers as assetHandlers } from './asset.mock';
import { registerHandlers as dataEvalHandlers } from './data-eval.mock';
import { registerHandlers as userSettingsHandlers } from './user-settings.mock';
import { registerHandlers as userMgmtHandlers } from './user-mgmt.mock';
import { registerHandlers as workflowHandlers } from './workflow.mock';

export function registerAllHandlers(mock: MockAdapter): void {
  authHandlers(mock);
  agentHandlers(mock);
  monitoringHandlers(mock);
  systemConfigHandlers(mock);
  knowledgeHandlers(mock);
  databaseHandlers(mock);
  modelServiceHandlers(mock);
  toolHandlers(mock);
  publishHandlers(mock);
  billingHandlers(mock);
  adminHandlers(mock);
  projectHandlers(mock);
  assetHandlers(mock);
  dataEvalHandlers(mock);
  userSettingsHandlers(mock);
  userMgmtHandlers(mock);
  workflowHandlers(mock);
}
