export type CapabilityWorkbenchLoadingAction = 'resolve' | 'invoke' | 'tools' | 'tool-call' | null;

export type CapabilityWorkbenchToolOption = {
  name: string;
  description?: string;
};

export type CapabilityWorkbenchToolState = {
  selectedTool: string;
  warnings: string[];
  tools: CapabilityWorkbenchToolOption[];
};

export type CapabilityWorkbenchViewState = CapabilityWorkbenchToolState & {
  payloadText: string;
  toolArgsText: string;
  resolveOutput: string;
  invokeOutput: string;
  toolOutput: string;
  loadingAction: CapabilityWorkbenchLoadingAction;
  advancedOpen: boolean;
};

const DEFAULT_CAPABILITY_PAYLOAD = { input: 'hello' };
export const DEFAULT_CAPABILITY_TOOL_ARGS_TEXT = '{\n  "input": "hello"\n}';

export function createCapabilityWorkbenchPayloadText(defaultPayload?: Record<string, unknown>): string {
  return JSON.stringify(defaultPayload ?? DEFAULT_CAPABILITY_PAYLOAD, null, 2);
}

export function createCapabilityWorkbenchToolState(
  tools: CapabilityWorkbenchToolOption[],
  warnings: string[],
): CapabilityWorkbenchToolState {
  const normalizedTools = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  }));
  return {
    selectedTool: normalizedTools[0]?.name ?? '',
    warnings: [...warnings],
    tools: normalizedTools,
  };
}

export function createCapabilityWorkbenchInitialState(defaultPayload?: Record<string, unknown>): CapabilityWorkbenchViewState {
  return {
    payloadText: createCapabilityWorkbenchPayloadText(defaultPayload),
    toolArgsText: DEFAULT_CAPABILITY_TOOL_ARGS_TEXT,
    resolveOutput: '',
    invokeOutput: '',
    toolOutput: '',
    loadingAction: null,
    advancedOpen: false,
    ...createCapabilityWorkbenchToolState([], []),
  };
}

export function createCapabilityWorkbenchInitialStateFromPayloadText(payloadText: string): CapabilityWorkbenchViewState {
  return {
    payloadText,
    toolArgsText: DEFAULT_CAPABILITY_TOOL_ARGS_TEXT,
    resolveOutput: '',
    invokeOutput: '',
    toolOutput: '',
    loadingAction: null,
    advancedOpen: false,
    ...createCapabilityWorkbenchToolState([], []),
  };
}
