export type NumericPresetItem = { value: number; label: string };

export type PresetWithBounds = {
  presets: NumericPresetItem[];
  customMin: number;
  customMax: number;
  customSeed: number;
};

/** 系统参数页：按 `t_system_param.key` 提供常用档位（其余数字参数仍用普通输入） */
export const SYSTEM_PARAM_NUMERIC_PRESETS: Record<string, PresetWithBounds> = {
  session_timeout_minutes: {
    presets: [
      { value: 15, label: '15 分钟' },
      { value: 30, label: '30 分钟' },
      { value: 60, label: '1 小时' },
      { value: 120, label: '2 小时' },
      { value: 480, label: '8 小时' },
      { value: 1440, label: '24 小时' },
    ],
    customMin: 5,
    customMax: 10080,
    customSeed: 120,
  },
  max_concurrent_sessions: {
    presets: [
      { value: 1, label: '1' },
      { value: 3, label: '3' },
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
    ],
    customMin: 1,
    customMax: 500,
    customSeed: 5,
  },
  max_upload_size_mb: {
    presets: [
      { value: 10, label: '10 MB' },
      { value: 50, label: '50 MB' },
      { value: 100, label: '100 MB' },
      { value: 200, label: '200 MB' },
      { value: 500, label: '500 MB' },
    ],
    customMin: 1,
    customMax: 2048,
    customSeed: 50,
  },
  password_min_length: {
    presets: [
      { value: 8, label: '8（默认强度）' },
      { value: 10, label: '10' },
      { value: 12, label: '12' },
      { value: 16, label: '16' },
    ],
    customMin: 6,
    customMax: 128,
    customSeed: 8,
  },
  auto_lock_attempts: {
    presets: [
      { value: 3, label: '3 次' },
      { value: 5, label: '5 次' },
      { value: 10, label: '10 次' },
    ],
    customMin: 1,
    customMax: 50,
    customSeed: 5,
  },
};

export const RATE_LIMIT_WINDOW_MS: PresetWithBounds = {
  presets: [
    { value: 1000, label: '1 秒' },
    { value: 5000, label: '5 秒' },
    { value: 10000, label: '10 秒' },
    { value: 60000, label: '1 分钟' },
    { value: 3600000, label: '1 小时' },
  ],
  customMin: 1000,
  customMax: 86400000,
  customSeed: 60000,
};

export const RATE_LIMIT_MAX_REQUESTS: PresetWithBounds = {
  presets: [
    { value: 10, label: '10' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 500, label: '500' },
    { value: 1000, label: '1000' },
  ],
  customMin: 1,
  customMax: 10_000_000,
  customSeed: 100,
};

export const RATE_LIMIT_BURST: PresetWithBounds = {
  presets: [
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
  ],
  customMin: 1,
  customMax: 10_000_000,
  customSeed: 20,
};

export const RATE_LIMIT_PRIORITY: PresetWithBounds = {
  presets: [
    { value: 0, label: '0（默认）' },
    { value: 10, label: '10' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
  ],
  customMin: -1000,
  customMax: 100_000,
  customSeed: 0,
};

export const HEALTH_INTERVAL_SEC: PresetWithBounds = {
  presets: [
    { value: 15, label: '15 秒' },
    { value: 30, label: '30 秒' },
    { value: 60, label: '1 分钟' },
    { value: 120, label: '2 分钟' },
    { value: 300, label: '5 分钟' },
  ],
  customMin: 5,
  customMax: 86400,
  customSeed: 60,
};

export const HEALTH_HEALTHY_THRESHOLD: PresetWithBounds = {
  presets: [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
  ],
  customMin: 1,
  customMax: 100,
  customSeed: 3,
};

export const HEALTH_TIMEOUT_SEC: PresetWithBounds = {
  presets: [
    { value: 3, label: '3 秒' },
    { value: 5, label: '5 秒' },
    { value: 10, label: '10 秒' },
    { value: 15, label: '15 秒' },
    { value: 30, label: '30 秒' },
  ],
  customMin: 1,
  customMax: 300,
  customSeed: 5,
};

export const CIRCUIT_FAILURE_THRESHOLD: PresetWithBounds = {
  presets: [
    { value: 3, label: '3' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
  ],
  customMin: 1,
  customMax: 1000,
  customSeed: 5,
};

export const CIRCUIT_OPEN_DURATION_SEC: PresetWithBounds = {
  presets: [
    { value: 10, label: '10 秒' },
    { value: 30, label: '30 秒' },
    { value: 60, label: '1 分钟' },
    { value: 120, label: '2 分钟' },
    { value: 300, label: '5 分钟' },
  ],
  customMin: 1,
  customMax: 3600,
  customSeed: 30,
};

export const CIRCUIT_HALF_OPEN_MAX: PresetWithBounds = {
  presets: [
    { value: 1, label: '1' },
    { value: 3, label: '3' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
  ],
  customMin: 1,
  customMax: 1000,
  customSeed: 3,
};

export const RESOURCE_MAX_CONCURRENCY: PresetWithBounds = {
  presets: [
    { value: 1, label: '1' },
    { value: 2, label: '2' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
  ],
  customMin: 1,
  customMax: 1000,
  customSeed: 10,
};

/** 数据集登记：记录数约值 */
export const DATASET_RECORD_COUNT: PresetWithBounds = {
  presets: [
    { value: 0, label: '未知 / 0' },
    { value: 1000, label: '1 千' },
    { value: 10000, label: '1 万' },
    { value: 100000, label: '10 万' },
    { value: 1_000_000, label: '100 万' },
  ],
  customMin: 0,
  customMax: 2_000_000_000,
  customSeed: 10000,
};

/** 数据集登记：体积（字节）常用档 */
export const DATASET_FILE_SIZE_BYTES: PresetWithBounds = {
  presets: [
    { value: 0, label: '未知 / 0' },
    { value: 1_048_576, label: '约 1 MB' },
    { value: 10_485_760, label: '约 10 MB' },
    { value: 104_857_600, label: '约 100 MB' },
    { value: 1_073_741_824, label: '约 1 GB' },
  ],
  customMin: 0,
  customMax: 2_000_000_000_000,
  customSeed: 1_048_576,
};
