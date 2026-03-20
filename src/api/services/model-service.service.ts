import { http } from '../../lib/http';
import type {
  CreateFineTunePayload,
  FineTuneJob,
  ModelEndpoint,
  PlaygroundMessage,
  PlaygroundResponse,
  PlaygroundSession,
  SendPlaygroundPayload,
} from '../../types/dto/model-service';

export const modelServiceApi = {
  listEndpoints: () =>
    http.get<ModelEndpoint[]>('/model-service/endpoints'),

  getPlayground: (sessionId: string) =>
    http.get<PlaygroundSession>(`/model-service/playground/${sessionId}`),

  sendPlayground: (sessionId: string, message: Pick<PlaygroundMessage, 'role' | 'content'>, config?: PlaygroundSession['config']) =>
    http.post<PlaygroundSession>(`/model-service/playground/${sessionId}/send`, { message, config }),

  listFineTuneJobs: () =>
    http.get<FineTuneJob[]>('/model-service/fine-tune'),

  sendPlaygroundMessage: (data: SendPlaygroundPayload) =>
    http.post<PlaygroundResponse>('/model-service/playground/send', data),

  createFineTuneJob: (data: CreateFineTunePayload) =>
    http.post<FineTuneJob>('/model-service/fine-tune', data),
};
