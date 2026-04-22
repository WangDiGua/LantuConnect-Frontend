import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, Building2, CheckCircle2, Database, Eye, EyeOff, FileUp, RefreshCcw, ScrollText, TriangleAlert, Wrench } from 'lucide-react';
import { Blowfish } from 'egoroof-blowfish';
import type { Theme, FontSize } from '../../types';
import { Modal } from '../../components/common/Modal';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { bentoCard, btnDanger, btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { systemConfigService } from '../../api/services/system-config.service';
import type {
  RobotFactoryAvailableResource,
  RobotFactoryCorpMapping,
  RobotFactoryProjection,
  RobotFactorySettings,
  RobotFactorySettingsHealth,
  RobotFactorySyncLog,
} from '../../types/dto/system-config';

interface RobotFactoryAdapterPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TabKey = 'settings' | 'projections' | 'corp' | 'logs';
type ProjectionSubmitMode = 'save' | 'save_and_sync';

interface ImportedRobotFactoryConnection {
  dbUrl?: string;
  dbUsername?: string;
  dbPassword?: string;
  dbDriverClassName?: string;
  publicBaseUrl?: string;
  allowedIps?: string[];
}

interface RobotFactoryConnectionImportCandidate extends ImportedRobotFactoryConnection {
  name: string;
  detail?: string;
  source: 'navicat' | 'text';
  warning?: string;
}

const PAGE_SIZE = 50;
const HEALTH_POLL_MS = 30000;

const emptyProjectionForm = {
  resourceId: '',
  scopeMode: 'school' as 'global' | 'school',
  displayName: '',
  description: '',
  displayTemplate: '',
  specJson: '',
  parametersSchema: '',
  autoSyncEnabled: false,
};

const emptyCorpForm = {
  schoolId: '',
  schoolNameSnapshot: '',
  corpId: '',
  enabled: true,
  remark: '',
};

const defaultSettingsForm: RobotFactorySettings = {
  dbUrl: '',
  dbUsername: '',
  dbPassword: '',
  dbDriverClassName: 'com.mysql.cj.jdbc.Driver',
  publicBaseUrl: '',
  allowedIps: [],
  sessionIdleMinutes: 10,
  sessionMaxLifetimeMinutes: 30,
  invokeTimeoutSeconds: 120,
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const navicatV1Seed = '3DC5CA39';
const navicatV2Key = textEncoder.encode('libcckeylibcckey');
const navicatV2Iv = textEncoder.encode('libcciv libcciv ');

function parseIpText(raw: string): string[] {
  return raw
    .split(/[\n,，;]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimToUndefined(raw: string | null | undefined): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function decodeUrlPart(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildJdbcUrl(protocol: string, host: string, port: string | undefined, database: string | undefined, search: string): string {
  const normalizedProtocol = protocol === 'postgres' ? 'postgresql' : protocol;
  const portPart = port ? `:${port}` : '';
  const databasePart = database ? `/${database}` : '';
  return `jdbc:${normalizedProtocol}://${host}${portPart}${databasePart}${search || ''}`;
}

function inferDriverClassName(url?: string): string | undefined {
  const value = url?.toLowerCase() ?? '';
  if (value === 'mysql' || value.startsWith('jdbc:mysql:') || value.startsWith('mysql://')) return 'com.mysql.cj.jdbc.Driver';
  if (value === 'mariadb' || value.startsWith('jdbc:mariadb:') || value.startsWith('mariadb://')) return 'org.mariadb.jdbc.Driver';
  if (
    value === 'postgres'
    || value === 'postgresql'
    || value.startsWith('jdbc:postgresql:')
    || value.startsWith('postgresql://')
    || value.startsWith('postgres://')
  ) {
    return 'org.postgresql.Driver';
  }
  if (value === 'sqlserver' || value.startsWith('jdbc:sqlserver:') || value.startsWith('sqlserver://')) {
    return 'com.microsoft.sqlserver.jdbc.SQLServerDriver';
  }
  return undefined;
}

function parseKeyValueConnection(raw: string): ImportedRobotFactoryConnection {
  const values = new Map<string, string>();
  const fragments = raw
    .split(/\r?\n|;/g)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const fragment of fragments) {
    const matched = fragment.match(/^([A-Za-z0-9_.-]+)\s*[:=]\s*(.+)$/);
    if (!matched) continue;
    values.set(matched[1].toLowerCase(), matched[2].trim());
  }

  const dbUrl = trimToUndefined(
    values.get('jdbcurl')
    || values.get('jdbc_url')
    || values.get('url')
    || values.get('jdbc'),
  );
  const protocol = trimToUndefined(values.get('protocol') || values.get('dbtype') || values.get('type')) || 'mysql';
  const host = trimToUndefined(values.get('host') || values.get('hostname') || values.get('server'));
  const port = trimToUndefined(values.get('port'));
  const database = trimToUndefined(values.get('database') || values.get('dbname') || values.get('db') || values.get('schema'));
  const username = trimToUndefined(values.get('username') || values.get('user') || values.get('uid'));
  const password = trimToUndefined(values.get('password') || values.get('pwd') || values.get('passwd'));
  const publicBaseUrl = trimToUndefined(values.get('publicbaseurl') || values.get('serveraddress') || values.get('baseurl'));
  const allowedIps = parseIpText(values.get('allowedips') || values.get('ipwhitelist') || values.get('whitelist') || '');

  const resolvedUrl = dbUrl || (host ? buildJdbcUrl(protocol, host, port, database, '') : undefined);

  return {
    dbUrl: resolvedUrl,
    dbUsername: username,
    dbPassword: password,
    dbDriverClassName: trimToUndefined(values.get('driver') || values.get('driverclassname')) || inferDriverClassName(resolvedUrl),
    publicBaseUrl,
    allowedIps: allowedIps.length ? allowedIps : undefined,
  };
}

function parseRobotFactoryConnectionImport(raw: string): ImportedRobotFactoryConnection | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('jdbc:')) {
    const usernameMatch = value.match(/(?:[?&](?:user|username)=)([^&]+)/i);
    const passwordMatch = value.match(/(?:[?&](?:password|pwd)=)([^&]+)/i);
    return {
      dbUrl: value,
      dbUsername: decodeUrlPart(usernameMatch?.[1]),
      dbPassword: decodeUrlPart(passwordMatch?.[1]),
      dbDriverClassName: inferDriverClassName(value),
    };
  }

  if (/^(mysql|mariadb|postgres|postgresql|sqlserver):\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const protocol = parsed.protocol.replace(/:$/, '');
      const database = trimToUndefined(parsed.pathname.replace(/^\/+/, ''));
      return {
        dbUrl: buildJdbcUrl(protocol, parsed.hostname, parsed.port || undefined, database, parsed.search),
        dbUsername: decodeUrlPart(parsed.username),
        dbPassword: decodeUrlPart(parsed.password),
        dbDriverClassName: inferDriverClassName(protocol),
      };
    } catch {
      return null;
    }
  }

  return parseKeyValueConnection(value);
}

function hexToBytes(raw: string): Uint8Array {
  const normalized = raw.trim();
  if (!/^[0-9a-f]+$/i.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function xorByteArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error('Mismatched xor input lengths');
  }

  const result = new Uint8Array(a.length);
  for (let index = 0; index < a.length; index += 1) {
    result[index] = a[index] ^ b[index];
  }
  return result;
}

function concatByteArrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

function decodeImportedText(bytes: Uint8Array): string {
  return textDecoder.decode(bytes).replace(/\0+$/g, '');
}

function isPrintableAscii(value: string): boolean {
  return /^[\x20-\x7E]*$/.test(value);
}

async function decryptNavicatV1(ciphertextHex: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable');
  }

  const ciphertext = hexToBytes(ciphertextHex);
  const blockSize = 8;
  const digest = await globalThis.crypto.subtle.digest('SHA-1', textEncoder.encode(navicatV1Seed));
  const cipher = new Blowfish(new Uint8Array(digest), Blowfish.MODE.ECB, Blowfish.PADDING.NULL);

  let currentVector = cipher.encode(new Uint8Array(blockSize).fill(0xff));
  const rounds = Math.floor(ciphertext.length / blockSize);
  const leftover = ciphertext.length % blockSize;
  const plaintextChunks: Uint8Array[] = [];

  for (let index = 0; index < rounds; index += 1) {
    const offset = index * blockSize;
    const block = ciphertext.slice(offset, offset + blockSize);
    const decrypted = cipher.decode(block, Blowfish.TYPE.UINT8_ARRAY);
    plaintextChunks.push(xorByteArrays(decrypted, currentVector));
    currentVector = xorByteArrays(currentVector, block);
  }

  if (leftover > 0) {
    currentVector = cipher.encode(currentVector);
    const tail = ciphertext.slice(rounds * blockSize);
    plaintextChunks.push(xorByteArrays(tail, currentVector.slice(0, leftover)));
  }

  return decodeImportedText(concatByteArrays(plaintextChunks));
}

async function decryptNavicatV2(ciphertextHex: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is unavailable');
  }

  const ciphertext = hexToBytes(ciphertextHex);
  const key = await globalThis.crypto.subtle.importKey('raw', navicatV2Key, 'AES-CBC', false, ['decrypt']);
  const decrypted = await globalThis.crypto.subtle.decrypt({ name: 'AES-CBC', iv: navicatV2Iv }, key, ciphertext);
  return decodeImportedText(new Uint8Array(decrypted));
}

async function decryptNavicatPassword(raw?: string): Promise<string | undefined> {
  const value = trimToUndefined(raw);
  if (!value) return undefined;
  if (!isLikelyEncryptedPassword(value)) return value;

  try {
    const plaintext = await decryptNavicatV2(value);
    if (isPrintableAscii(plaintext)) {
      return plaintext;
    }
  } catch {
    // fall through
  }

  try {
    const plaintext = await decryptNavicatV1(value);
    if (isPrintableAscii(plaintext)) {
      return plaintext;
    }
  } catch {
    // fall through
  }

  return undefined;
}

function normalizeImportKey(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function readImportNodeValue(element: Element, keys: string[]): string | undefined {
  const normalizedKeys = keys.map(normalizeImportKey);

  for (const attr of Array.from(element.attributes)) {
    if (normalizedKeys.includes(normalizeImportKey(attr.name))) {
      return trimToUndefined(attr.value);
    }
  }

  for (const child of Array.from(element.children)) {
    if (normalizedKeys.includes(normalizeImportKey(child.tagName))) {
      return trimToUndefined(child.textContent ?? '');
    }
  }

  return undefined;
}

function inferProtocol(raw?: string): string {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('mariadb')) return 'mariadb';
  if (value.includes('postgres')) return 'postgresql';
  if (value.includes('sqlserver') || value.includes('mssql')) return 'sqlserver';
  return 'mysql';
}

function normalizeImportedDbUrl(raw?: string): string | undefined {
  const value = trimToUndefined(raw);
  if (!value) return undefined;
  if (value.startsWith('jdbc:')) return value;
  return parseRobotFactoryConnectionImport(value)?.dbUrl;
}

function isLikelyEncryptedPassword(raw?: string): boolean {
  const value = raw?.trim();
  if (!value) return false;

  if (value.length >= 32 && value.length % 2 === 0 && /^[0-9a-f]+$/i.test(value)) {
    return true;
  }

  if (value.length >= 24 && /^[A-Za-z0-9+/=]+$/.test(value) && !/[.@:/\\_-]/.test(value)) {
    return true;
  }

  return false;
}

/*
async function buildImportCandidate(element: Element): Promise<RobotFactoryConnectionImportCandidate | null> {
  const rawUrl = readImportNodeValue(element, ['jdbcUrl', 'jdbc_url', 'url', 'connectionUrl']);
  const host = readImportNodeValue(element, ['host', 'hostname', 'server', 'ip']);
  const port = readImportNodeValue(element, ['port']);
  const database = readImportNodeValue(element, ['database', 'dbName', 'dbname', 'schema', 'initialDatabase', 'databaseName']);
  const username = readImportNodeValue(element, ['username', 'user', 'uid', 'userName', 'userId', 'loginUser']);
  const rawPassword = readImportNodeValue(element, ['password', 'pwd', 'passwd']);
  const publicBaseUrl = readImportNodeValue(element, ['publicBaseUrl', 'serverAddress', 'baseUrl']);
  const allowedIpsText = readImportNodeValue(element, ['allowedIps', 'ipWhitelist', 'whitelist']);
  const connectionName = readImportNodeValue(element, ['connectionName', 'name', 'alias', 'label']);
  const urlImport = rawUrl ? parseRobotFactoryConnectionImport(rawUrl) : null;
  const protocol = inferProtocol(rawUrl || readImportNodeValue(element, ['type', 'dbType', 'driver', 'provider']) || element.tagName);
  const dbUrl = normalizeImportedDbUrl(rawUrl) || (host ? buildJdbcUrl(protocol, host, port, database, '') : undefined);

  if (!dbUrl && !host) return null;

  const encryptedPassword = isLikelyEncryptedPassword(rawPassword);
  const decryptedPassword = await decryptNavicatPassword(rawPassword);
  const detailParts = [
    host ? `Host ${host}` : undefined,
    port ? `Port ${port}` : undefined,
    database ? `DB ${database}` : undefined,
  ].filter(Boolean);

  return {
    name: connectionName || [host, database].filter(Boolean).join(' / ') || 'Navicat 导入连接',
    detail: detailParts.join(' · ') || dbUrl,
    source: 'navicat',
    dbUrl,
    dbUsername: username || urlImport?.dbUsername,
    dbPassword: decryptedPassword || urlImport?.dbPassword,
    dbDriverClassName: inferDriverClassName(dbUrl || protocol),
    publicBaseUrl,
    allowedIps: allowedIpsText ? parseIpText(allowedIpsText) : undefined,
    warning: encryptedPassword ? 'Navicat 导出的密码不是明文，已跳过密码导入，请手动补填。' : undefined,
  };
}

*/

async function buildImportCandidateResolved(element: Element): Promise<RobotFactoryConnectionImportCandidate | null> {
  const rawUrl = readImportNodeValue(element, ['jdbcUrl', 'jdbc_url', 'url', 'connectionUrl']);
  const host = readImportNodeValue(element, ['host', 'hostname', 'server', 'ip']);
  const port = readImportNodeValue(element, ['port']);
  const database = readImportNodeValue(element, ['database', 'dbName', 'dbname', 'schema', 'initialDatabase', 'databaseName']);
  const username = readImportNodeValue(element, ['username', 'user', 'uid', 'userName', 'userId', 'loginUser']);
  const rawPassword = readImportNodeValue(element, ['password', 'pwd', 'passwd']);
  const publicBaseUrl = readImportNodeValue(element, ['publicBaseUrl', 'serverAddress', 'baseUrl']);
  const allowedIpsText = readImportNodeValue(element, ['allowedIps', 'ipWhitelist', 'whitelist']);
  const connectionName = readImportNodeValue(element, ['connectionName', 'name', 'alias', 'label']);
  const urlImport = rawUrl ? parseRobotFactoryConnectionImport(rawUrl) : null;
  const protocol = inferProtocol(rawUrl || readImportNodeValue(element, ['type', 'dbType', 'driver', 'provider']) || element.tagName);
  const dbUrl = normalizeImportedDbUrl(rawUrl) || (host ? buildJdbcUrl(protocol, host, port, database, '') : undefined);

  if (!dbUrl && !host) return null;

  const decryptedPassword = await decryptNavicatPassword(rawPassword);
  const unresolvedEncryptedPassword = isLikelyEncryptedPassword(rawPassword) && !decryptedPassword;
  const detailParts = [
    host ? `Host ${host}` : undefined,
    port ? `Port ${port}` : undefined,
    database ? `DB ${database}` : undefined,
  ].filter(Boolean);

  return {
    name: connectionName || [host, database].filter(Boolean).join(' / ') || 'Navicat 导入连接',
    detail: detailParts.join(' · ') || dbUrl,
    source: 'navicat',
    dbUrl,
    dbUsername: username || urlImport?.dbUsername,
    dbPassword: decryptedPassword || urlImport?.dbPassword,
    dbDriverClassName: inferDriverClassName(dbUrl || protocol),
    publicBaseUrl,
    allowedIps: allowedIpsText ? parseIpText(allowedIpsText) : undefined,
    warning: unresolvedEncryptedPassword ? 'Navicat 导出的密码未能自动解密，请手动补填。' : undefined,
  };
}

/*
async function parseRobotFactoryConnectionImportCandidates(raw: string): Promise<RobotFactoryConnectionImportCandidate[]> {
  const value = raw.trim();
  if (!value) return [];

  if (value.startsWith('<') && typeof DOMParser !== 'undefined') {
    const xml = new DOMParser().parseFromString(value, 'application/xml');
    if (!xml.querySelector('parsererror')) {
      const candidates: RobotFactoryConnectionImportCandidate[] = [];
      const seen = new Set<string>();

      for (const element of Array.from(xml.getElementsByTagName('*'))) {
        const candidate = await buildImportCandidateResolved(element);
        if (!candidate) continue;

        const fingerprint = `${candidate.dbUrl || ''}|${candidate.dbUsername || ''}|${candidate.name}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        candidates.push(candidate);
      }

      if (candidates.length) {
        return candidates;
      }
    }
  }

  const parsed = parseRobotFactoryConnectionImport(value);
  if (!parsed) return [];

  return [{
    ...parsed,
    name: '手动粘贴的连接',
    detail: parsed.dbUrl || parsed.dbUsername || '连接信息',
    source: 'text',
  }];
}

*/

async function parseRobotFactoryConnectionImportCandidatesResolved(raw: string): Promise<RobotFactoryConnectionImportCandidate[]> {
  const value = raw.trim();
  if (!value) return [];

  if (value.startsWith('<') && typeof DOMParser !== 'undefined') {
    const xml = new DOMParser().parseFromString(value, 'application/xml');
    if (!xml.querySelector('parsererror')) {
      const candidates: RobotFactoryConnectionImportCandidate[] = [];
      const seen = new Set<string>();

      for (const element of Array.from(xml.getElementsByTagName('*'))) {
        const candidate = await buildImportCandidateResolved(element);
        if (!candidate) continue;

        const fingerprint = `${candidate.dbUrl || ''}|${candidate.dbUsername || ''}|${candidate.name}`;
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);
        candidates.push(candidate);
      }

      if (candidates.length) {
        return candidates;
      }
    }
  }

  const parsed = parseRobotFactoryConnectionImport(value);
  if (!parsed) return [];

  return [{
    ...parsed,
    name: '手动粘贴的连接',
    detail: parsed.dbUrl || parsed.dbUsername || '连接信息',
    source: 'text',
  }];
}

export const RobotFactoryAdapterPage: React.FC<RobotFactoryAdapterPageProps> = ({
  theme,
  fontSize: _fontSize,
  showMessage,
}) => {
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<TabKey>('settings');

  const [settingsForm, setSettingsForm] = useState<RobotFactorySettings>(defaultSettingsForm);
  const [allowedIpsText, setAllowedIpsText] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsTesting, setSettingsTesting] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importConnectionText, setImportConnectionText] = useState('');
  const [importCandidates, setImportCandidates] = useState<RobotFactoryConnectionImportCandidate[]>([]);
  const [selectedImportIndex, setSelectedImportIndex] = useState(0);
  const [importFileName, setImportFileName] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<RobotFactorySettingsHealth | null>(null);

  const [projectionPage, setProjectionPage] = useState(1);
  const [projections, setProjections] = useState<RobotFactoryProjection[]>([]);
  const [projectionTotal, setProjectionTotal] = useState(0);
  const [projectionLoading, setProjectionLoading] = useState(false);
  const [projectionKeyword, setProjectionKeyword] = useState('');
  const [projectionSyncStatus, setProjectionSyncStatus] = useState('');
  const [projectionAutoSyncFilter, setProjectionAutoSyncFilter] = useState('');
  const [projectionForm, setProjectionForm] = useState(emptyProjectionForm);
  const [editingProjection, setEditingProjection] = useState<RobotFactoryProjection | null>(null);
  const [projectionSaving, setProjectionSaving] = useState(false);
  const [projectionSubmitMode, setProjectionSubmitMode] = useState<ProjectionSubmitMode>('save_and_sync');
  const [availableResources, setAvailableResources] = useState<RobotFactoryAvailableResource[]>([]);
  const [availableResourceKeyword, setAvailableResourceKeyword] = useState('');
  const [availableResourcesLoading, setAvailableResourcesLoading] = useState(false);

  const [corpLoading, setCorpLoading] = useState(false);
  const [corpMappings, setCorpMappings] = useState<RobotFactoryCorpMapping[]>([]);
  const [corpForm, setCorpForm] = useState(emptyCorpForm);
  const [editingCorp, setEditingCorp] = useState<RobotFactoryCorpMapping | null>(null);
  const [corpSaving, setCorpSaving] = useState(false);

  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logs, setLogs] = useState<RobotFactorySyncLog[]>([]);
  const [logAction, setLogAction] = useState('');
  const [logSuccessFilter, setLogSuccessFilter] = useState('');
  const [logProjectionId, setLogProjectionId] = useState('');

  const inputClass = nativeInputClass(theme);
  const selectClass = nativeSelectClass(theme);
  const cardClass = bentoCard(theme);
  const smallButton = `h-9 px-3 py-0 text-xs ${btnSecondary(theme)}`;
  const titleClass = `text-sm font-semibold ${textPrimary(theme)}`;
  const labelClass = `text-xs font-medium uppercase tracking-[0.12em] ${textMuted(theme)}`;
  const helperClass = `text-xs ${textMuted(theme)}`;
  const isDark = theme === 'dark';
  const softPanelClass = isDark
    ? 'rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[var(--shadow-control)]'
    : 'rounded-3xl border border-neutral-200/70 bg-neutral-50/80 px-4 py-4 shadow-[var(--shadow-control)]';
  const tableHeadClass = isDark ? 'bg-white/[0.04]' : 'bg-neutral-50/80';
  const tableRowClass = isDark ? 'border-t border-white/10' : 'border-t border-slate-200/70';
  const warningCardClass = isDark
    ? `${cardClass} border border-amber-400/20 bg-amber-500/10 p-4 sm:p-5`
    : `${cardClass} border border-amber-200 bg-amber-50/90 p-4 sm:p-5`;
  const warningInlineClass = isDark
    ? 'rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3'
    : 'rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3';
  const warningTitleClass = isDark ? 'text-sm font-semibold text-amber-100' : 'text-sm font-semibold text-amber-900';
  const warningTextClass = isDark ? 'text-sm text-amber-200/90' : 'text-sm text-amber-800';
  const importHeroClass = isDark
    ? 'rounded-3xl border border-sky-400/20 bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(255,255,255,0.03),rgba(15,23,42,0.02))] p-4 sm:p-5'
    : 'rounded-3xl border border-sky-200/70 bg-[linear-gradient(135deg,rgba(224,242,254,0.95),rgba(255,255,255,1),rgba(248,250,252,0.95))] p-4 sm:p-5';
  const importCandidateClass = (active: boolean) => {
    if (active) {
      return isDark
        ? 'rounded-3xl border border-sky-400/35 bg-sky-500/10 px-4 py-4 shadow-[var(--shadow-control)]'
        : 'rounded-3xl border border-sky-300 bg-sky-50 px-4 py-4 shadow-[var(--shadow-control)]';
    }
    return softPanelClass;
  };

  const syncAllowedIpsFromForm = useCallback((settings: RobotFactorySettings) => {
    const ips = settings.allowedIps ?? [];
    setAllowedIpsText(ips.join('\n'));
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const result = await systemConfigService.getRobotFactorySettings();
      setSettingsForm({
        ...defaultSettingsForm,
        ...result,
      });
      syncAllowedIpsFromForm({
        ...defaultSettingsForm,
        ...result,
      });
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载软件工厂设置失败', 'error');
    }
  }, [showMessage, syncAllowedIpsFromForm]);

  const loadHealth = useCallback(async (silent = false) => {
    setHealthLoading(true);
    try {
      const result = await systemConfigService.getRobotFactorySettingsHealth();
      setHealthStatus(result);
    } catch (e) {
      if (!silent) {
        showMessage(e instanceof Error ? e.message : '加载连接健康状态失败', 'error');
      }
    } finally {
      setHealthLoading(false);
    }
  }, [showMessage]);

  const loadAvailableResources = useCallback(async () => {
    setAvailableResourcesLoading(true);
    try {
      const result = await systemConfigService.listRobotFactoryAvailableResources({
        keyword: availableResourceKeyword.trim() || undefined,
        limit: 100,
      });
      setAvailableResources(result);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载可投影资源失败', 'error');
    } finally {
      setAvailableResourcesLoading(false);
    }
  }, [availableResourceKeyword, showMessage]);

  const loadProjections = useCallback(async (page = projectionPage) => {
    setProjectionLoading(true);
    try {
      const autoSyncEnabled =
        projectionAutoSyncFilter === '' ? undefined : projectionAutoSyncFilter === 'true';
      const result = await systemConfigService.listRobotFactoryProjections({
        page,
        pageSize: PAGE_SIZE,
        keyword: projectionKeyword.trim() || undefined,
        syncStatus: projectionSyncStatus || undefined,
        autoSyncEnabled,
      });
      setProjections(result.list);
      setProjectionTotal(result.total);
      setProjectionPage(result.page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载投影列表失败', 'error');
    } finally {
      setProjectionLoading(false);
    }
  }, [projectionAutoSyncFilter, projectionKeyword, projectionPage, projectionSyncStatus, showMessage]);

  const loadCorpMappings = useCallback(async () => {
    setCorpLoading(true);
    try {
      const result = await systemConfigService.listRobotFactoryCorpMappings();
      setCorpMappings(result);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载 Corp 映射失败', 'error');
    } finally {
      setCorpLoading(false);
    }
  }, [showMessage]);

  const loadLogs = useCallback(async (page = logPage) => {
    setLogLoading(true);
    try {
      const result = await systemConfigService.listRobotFactorySyncLogs({
        page,
        pageSize: PAGE_SIZE,
        action: logAction || undefined,
        success: logSuccessFilter === '' ? undefined : logSuccessFilter === 'true',
        projectionId: logProjectionId.trim() ? Number(logProjectionId.trim()) : undefined,
      });
      setLogs(result.list);
      setLogTotal(result.total);
      setLogPage(result.page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载同步日志失败', 'error');
    } finally {
      setLogLoading(false);
    }
  }, [logAction, logPage, logProjectionId, logSuccessFilter, showMessage]);

  useEffect(() => {
    void loadSettings();
    void loadHealth();
  }, [loadSettings, loadHealth]);

  useEffect(() => {
    if (tab !== 'settings') return undefined;
    const timer = window.setInterval(() => {
      void loadHealth(true);
    }, HEALTH_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadHealth, tab]);

  useEffect(() => {
    if (tab === 'projections') {
      void loadProjections(1);
      if (!editingProjection) {
        void loadAvailableResources();
      }
    }
    if (tab === 'corp') void loadCorpMappings();
    if (tab === 'logs') void loadLogs(1);
  }, [tab, loadProjections, loadCorpMappings, loadLogs, loadAvailableResources, editingProjection]);

  const resetProjectionForm = () => {
    setProjectionForm(emptyProjectionForm);
    setEditingProjection(null);
  };

  const resetCorpForm = () => {
    setCorpForm(emptyCorpForm);
    setEditingCorp(null);
  };

  const buildSettingsPayload = () => ({
    dbUrl: settingsForm.dbUrl?.trim() || undefined,
    dbUsername: settingsForm.dbUsername?.trim() || undefined,
    dbPassword: settingsForm.dbPassword?.trim() || undefined,
    dbDriverClassName: settingsForm.dbDriverClassName?.trim() || undefined,
    publicBaseUrl: settingsForm.publicBaseUrl?.trim() || undefined,
    allowedIps: parseIpText(allowedIpsText),
    sessionIdleMinutes: settingsForm.sessionIdleMinutes,
    sessionMaxLifetimeMinutes: settingsForm.sessionMaxLifetimeMinutes,
    invokeTimeoutSeconds: settingsForm.invokeTimeoutSeconds,
  });

  /*
  const importConnectionConfig = () => {
    const parsed = parseRobotFactoryConnectionImport(importConnectionText);
    if (!parsed || (!parsed.dbUrl && !parsed.dbUsername && !parsed.dbPassword)) {
      showMessage('未识别出可导入的连接信息，请检查粘贴内容格式', 'error');
      return;
    }

    setSettingsForm((prev) => ({
      ...prev,
      dbUrl: parsed.dbUrl ?? prev.dbUrl,
      dbUsername: parsed.dbUsername ?? prev.dbUsername,
      dbPassword: parsed.dbPassword ?? prev.dbPassword,
      dbDriverClassName: parsed.dbDriverClassName ?? prev.dbDriverClassName,
      publicBaseUrl: parsed.publicBaseUrl ?? prev.publicBaseUrl,
    }));

    if (parsed.allowedIps?.length) {
      setAllowedIpsText(parsed.allowedIps.join('\n'));
    }

    setImportModalOpen(false);
    setImportConnectionText('');
    showMessage('连接信息已解析并回填到表单', 'success');
  };

  */

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportConnectionText('');
    setImportCandidates([]);
    setSelectedImportIndex(0);
    setImportFileName('');
  };

  /*
  const applyImportedConnection = (parsed: ImportedRobotFactoryConnection, sourceName?: string, warning?: string) => {
    if (!parsed.dbUrl && !parsed.dbUsername && !parsed.dbPassword) {
      showMessage('未识别出可导入的连接信息，请检查文件或粘贴内容。', 'error');
      return;
    }

    setSettingsForm((prev) => ({
      ...prev,
      dbUrl: parsed.dbUrl ?? prev.dbUrl,
      dbUsername: parsed.dbUsername ?? prev.dbUsername,
      dbPassword: parsed.dbPassword ?? prev.dbPassword,
      dbDriverClassName: parsed.dbDriverClassName ?? prev.dbDriverClassName,
      publicBaseUrl: parsed.publicBaseUrl ?? prev.publicBaseUrl,
    }));

    if (parsed.allowedIps?.length) {
      setAllowedIpsText(parsed.allowedIps.join('\n'));
    }

    closeImportModal();
    showMessage(
      warning
        ? `${sourceName || '连接配置'}已导入，${warning}`
        : `${sourceName || '连接配置'}已导入并回填到表单。`,
      warning ? 'info' : 'success',
    );
  };

  const importConnectionConfig = () => {
    const selectedCandidate = importCandidates[selectedImportIndex];
    if (selectedCandidate) {
      applyImportedConnection(selectedCandidate, selectedCandidate.name, selectedCandidate.warning);
      return;
    }

    applyImportedConnection(parseRobotFactoryConnectionImport(importConnectionText) ?? {}, '粘贴的连接信息');
  };

  const onImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const candidates = await parseRobotFactoryConnectionImportCandidatesResolved(text);
      if (!candidates.length) {
        showMessage('未从该文件中识别到连接配置，请确认它是 Navicat 导出的连接文件。', 'error');
        return;
      }

      setImportFileName(file.name);
      setImportCandidates(candidates);
      setSelectedImportIndex(0);
      showMessage(`已识别 ${candidates.length} 条连接，请选择要导入的配置。`, 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '读取导入文件失败', 'error');
    }
  };

  */

  const applyImportedConnection = (parsed: ImportedRobotFactoryConnection, sourceName?: string, warning?: string) => {
    if (!parsed.dbUrl && !parsed.dbUsername && !parsed.dbPassword) {
      showMessage('\u672a\u8bc6\u522b\u51fa\u53ef\u5bfc\u5165\u7684\u8fde\u63a5\u4fe1\u606f\u3002', 'error');
      return;
    }

    setSettingsForm((prev) => ({
      ...prev,
      dbUrl: parsed.dbUrl ?? prev.dbUrl,
      dbUsername: parsed.dbUsername ?? prev.dbUsername,
      dbPassword: parsed.dbPassword ?? prev.dbPassword,
      dbDriverClassName: parsed.dbDriverClassName ?? prev.dbDriverClassName,
      publicBaseUrl: parsed.publicBaseUrl ?? prev.publicBaseUrl,
    }));

    if (parsed.allowedIps?.length) {
      setAllowedIpsText(parsed.allowedIps.join('\n'));
    }

    closeImportModal();
    showMessage(
      warning
        ? `${sourceName || '\u8fde\u63a5\u914d\u7f6e'}\u5df2\u5bfc\u5165\uff0c${warning}`
        : `${sourceName || '\u8fde\u63a5\u914d\u7f6e'}\u5df2\u5bfc\u5165\u5e76\u56de\u586b\u5230\u8868\u5355\u3002`,
      warning ? 'info' : 'success',
    );
  };

  const importConnectionConfig = () => {
    const selectedCandidate = importCandidates[selectedImportIndex];
    if (selectedCandidate) {
      applyImportedConnection(selectedCandidate, selectedCandidate.name, selectedCandidate.warning);
      return;
    }

    applyImportedConnection(parseRobotFactoryConnectionImport(importConnectionText) ?? {}, '\u7c98\u8d34\u7684\u8fde\u63a5\u4fe1\u606f');
  };

  const onImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const candidates = await parseRobotFactoryConnectionImportCandidatesResolved(text);
      if (!candidates.length) {
        showMessage('\u672a\u4ece\u8be5\u6587\u4ef6\u4e2d\u8bc6\u522b\u5230 Navicat \u8fde\u63a5\u914d\u7f6e\u3002', 'error');
        return;
      }

      setImportFileName(file.name);
      setImportCandidates(candidates);
      setSelectedImportIndex(0);
      showMessage(`\u5df2\u8bc6\u522b ${candidates.length} \u6761\u8fde\u63a5\u914d\u7f6e\u3002`, 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '\u8bfb\u53d6\u5bfc\u5165\u6587\u4ef6\u5931\u8d25\u3002', 'error');
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const saved = await systemConfigService.saveRobotFactorySettings(buildSettingsPayload());
      setSettingsForm({
        ...defaultSettingsForm,
        ...saved,
      });
      syncAllowedIpsFromForm({
        ...defaultSettingsForm,
        ...saved,
      });
      showMessage('软件工厂适配设置已保存', 'success');
      await loadHealth();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存软件工厂设置失败', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const testConnection = async () => {
    setSettingsTesting(true);
    try {
      const result = await systemConfigService.testRobotFactorySettingsConnection(buildSettingsPayload());
      setHealthStatus(result);
      showMessage(result.databaseReachable ? '数据库连接测试成功' : (result.message || '数据库连接测试失败'), result.databaseReachable ? 'success' : 'error');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '测试连接失败', 'error');
    } finally {
      setSettingsTesting(false);
    }
  };

  const saveProjection = async (mode: ProjectionSubmitMode = 'save') => {
    if (!editingProjection && !projectionForm.resourceId.trim()) {
      showMessage('请先选择一个已发布的 MCP 资源', 'error');
      return;
    }
    if (mode === 'save_and_sync' && (!healthStatus?.databaseReachable || !healthStatus?.externalTableReady)) {
      showMessage('当前软件工厂数据库连接不可用，请先检查连接配置与健康状态', 'error');
      setTab('settings');
      return;
    }
    setProjectionSaving(true);
    setProjectionSubmitMode(mode);
    try {
      const payload = {
        resourceId: Number(projectionForm.resourceId),
        scopeMode: projectionForm.scopeMode,
        displayName: projectionForm.displayName.trim() || undefined,
        description: projectionForm.description.trim() || undefined,
        displayTemplate: projectionForm.displayTemplate.trim() || undefined,
        specJson: projectionForm.specJson.trim() || undefined,
        parametersSchema: projectionForm.parametersSchema.trim() || undefined,
        autoSyncEnabled: projectionForm.autoSyncEnabled,
      };
      let savedProjection: RobotFactoryProjection;
      if (editingProjection) {
        savedProjection = await systemConfigService.updateRobotFactoryProjection(editingProjection.id, payload);
      } else {
        savedProjection = await systemConfigService.createRobotFactoryProjection(payload);
      }
      if (mode === 'save_and_sync') {
        await systemConfigService.syncRobotFactoryProjection(savedProjection.id);
        showMessage(editingProjection ? '投影已保存并同步到软件工厂' : '投影已创建并同步到软件工厂', 'success');
      } else {
        showMessage(editingProjection ? '软件工厂投影已更新' : '软件工厂投影已创建', 'success');
      }
      resetProjectionForm();
      await loadProjections(1);
      await loadAvailableResources();
      await loadLogs(1);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : (mode === 'save_and_sync' ? '保存并同步投影失败' : '保存投影失败'), 'error');
    } finally {
      setProjectionSaving(false);
      setProjectionSubmitMode('save_and_sync');
    }
  };

  const saveCorpMapping = async () => {
    if (!corpForm.schoolId.trim() || !corpForm.corpId.trim()) {
      showMessage('school_id 和 corp_id 不能为空', 'error');
      return;
    }
    setCorpSaving(true);
    try {
      const payload = {
        schoolId: Number(corpForm.schoolId),
        schoolNameSnapshot: corpForm.schoolNameSnapshot.trim() || undefined,
        corpId: Number(corpForm.corpId),
        enabled: corpForm.enabled,
        remark: corpForm.remark.trim() || undefined,
      };
      if (editingCorp) {
        await systemConfigService.updateRobotFactoryCorpMapping(editingCorp.id, payload);
        showMessage('Corp 映射已更新', 'success');
      } else {
        await systemConfigService.createRobotFactoryCorpMapping(payload);
        showMessage('Corp 映射已创建', 'success');
      }
      resetCorpForm();
      await loadCorpMappings();
      await loadProjections(1);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存 Corp 映射失败', 'error');
    } finally {
      setCorpSaving(false);
    }
  };

  const onEditProjection = (projection: RobotFactoryProjection) => {
    setEditingProjection(projection);
    setProjectionForm({
      resourceId: projection.resourceId,
      scopeMode: projection.scopeMode,
      displayName: projection.displayName ?? '',
      description: projection.description ?? '',
      displayTemplate: projection.displayTemplate ?? '',
      specJson: '',
      parametersSchema: '',
      autoSyncEnabled: projection.autoSyncEnabled,
    });
  };

  const onEditCorp = (corp: RobotFactoryCorpMapping) => {
    setEditingCorp(corp);
    setCorpForm({
      schoolId: corp.schoolId,
      schoolNameSnapshot: corp.schoolNameSnapshot ?? '',
      corpId: corp.corpId,
      enabled: corp.enabled,
      remark: corp.remark ?? '',
    });
  };

  const projectionStatusBadge = (status?: string) => {
    const normalized = String(status ?? '').toLowerCase();
    const cls = normalized === 'synced'
      ? (isDark ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
      : normalized === 'failed'
        ? (isDark ? 'bg-rose-500/15 text-rose-200 border border-rose-400/20' : 'bg-rose-50 text-rose-700 border border-rose-200')
        : normalized === 'deleted'
          ? (isDark ? 'bg-white/[0.08] text-slate-300 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200')
          : (isDark ? 'bg-amber-500/15 text-amber-200 border border-amber-400/20' : 'bg-amber-50 text-amber-700 border border-amber-200');
    return (
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
        {status || 'pending'}
      </span>
    );
  };

  const healthToneClass = useMemo(() => {
    const status = healthStatus?.status ?? 'unconfigured';
    if (status === 'healthy') return isDark ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (status === 'warning') return isDark ? 'bg-amber-500/15 text-amber-200 border border-amber-400/20' : 'bg-amber-50 text-amber-700 border border-amber-200';
    if (status === 'unhealthy') return isDark ? 'bg-rose-500/15 text-rose-200 border border-rose-400/20' : 'bg-rose-50 text-rose-700 border border-rose-200';
    return isDark ? 'bg-white/[0.08] text-slate-300 border border-white/10' : 'bg-slate-100 text-slate-700 border border-slate-200';
  }, [healthStatus, isDark]);

  const isExternalConnectionReady = Boolean(
    healthStatus?.configured && healthStatus.databaseReachable && healthStatus.externalTableReady,
  );
  const showHealthWarning = !isExternalConnectionReady;

  const selectedResource = useMemo(
    () => availableResources.find((item) => item.resourceId === projectionForm.resourceId) ?? null,
    [availableResources, projectionForm.resourceId],
  );

  const tabButton = (key: TabKey, label: string, Icon: typeof Boxes) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
        tab === key
          ? (isDark ? 'border-white/10 bg-white text-neutral-950 shadow-[var(--shadow-control)]' : 'border-neutral-900 bg-neutral-900 text-white shadow-[var(--shadow-control)]')
          : theme === 'dark'
            ? 'border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.10]'
            : 'border-neutral-200 bg-white/80 text-slate-700 hover:bg-neutral-100'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={_fontSize}
      titleIcon={Wrench}
      breadcrumbSegments={['平台配置', '软件工厂适配']}
      description="软件工厂一期适配仅覆盖 MCP 资源投影、外部注册表同步与兼容 SSE 入口。权限绑定、机器人绑定与缓存刷新仍由软件工厂侧维护。"
      toolbar={(
        <div className="flex flex-wrap items-center gap-3">
          {tabButton('settings', '适配设置', Database)}
          {tabButton('projections', '投影列表', Boxes)}
          {tabButton('corp', '学校 Corp 映射', Building2)}
          {tabButton('logs', '同步日志', ScrollText)}
          <button
            type="button"
            className={btnSecondary(theme)}
            onClick={() => {
              if (tab === 'settings') {
                void loadSettings();
                void loadHealth();
              }
              if (tab === 'projections') {
                void loadProjections(1);
                void loadAvailableResources();
              }
              if (tab === 'corp') void loadCorpMappings();
              if (tab === 'logs') void loadLogs(1);
            }}
          >
            <RefreshCcw size={16} />
            刷新
          </button>
        </div>
      )}
    >
      <div className="space-y-6 px-4 sm:px-6 pb-8">
        {showHealthWarning ? (
          <section className={warningCardClass}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className={warningTitleClass}>软件工厂连接当前不可用于同步</div>
                <p className={warningTextClass}>
                  {healthStatus?.message || '请先完成数据库连接配置并确认 genie_external_agent 可访问。'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={btnSecondary(theme)} onClick={() => setTab('settings')}>
                  去检查设置
                </button>
                <button type="button" className={btnPrimary} onClick={() => void loadHealth()}>
                  重新检测
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'settings' ? (
          <>
            <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
              <div className="hidden">
                <h3 className={titleClass}>连接状态</h3>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${healthToneClass}`}>
                  {healthStatus?.status || 'unconfigured'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className={softPanelClass}>
                  <div className={labelClass}>数据库可达</div>
                  <div className={`mt-2 text-lg font-semibold ${textPrimary(theme)}`}>
                    {healthStatus?.databaseReachable ? '正常' : '异常'}
                  </div>
                </div>
                <div className={softPanelClass}>
                  <div className={labelClass}>注册表可用</div>
                  <div className={`mt-2 text-lg font-semibold ${textPrimary(theme)}`}>
                    {healthStatus?.externalTableReady ? '已检测到 genie_external_agent' : '未检测到'}
                  </div>
                </div>
                <div className={softPanelClass}>
                  <div className={labelClass}>最近检查</div>
                  <div className={`mt-2 text-sm font-medium ${textPrimary(theme)}`}>
                    {healthLoading ? '检查中...' : (healthStatus?.checkedAt || '-')}
                  </div>
                </div>
              </div>
              <p className={helperClass}>{healthStatus?.message || '保存配置后可测试连接，页面会自动轮询最新健康状态。'}</p>
            </section>

            <form
              className={`${cardClass} p-4 sm:p-5 space-y-4`}
              onSubmit={(e) => {
                e.preventDefault();
                void saveSettings();
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className={titleClass}>适配设置</h3>
                <span className={helperClass}>所有软件工厂相关配置均从这里维护，不再依赖配置文件</span>
              </div>
              <div className="hidden">
                <div className="space-y-1">
                  <h3 className={titleClass}>导入连接配置</h3>
                  <p className={helperClass}>支持粘贴 JDBC URL、mysql:// URI 或 Host/Port/User/Password 这类连接串并自动回填</p>
                </div>
                <button
                  type="button"
                  className={btnSecondary(theme)}
                  onClick={() => setImportModalOpen(true)}
                >
                  导入连接串
                </button>
              </div>
              <div className={importHeroClass}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/10 text-sky-100' : 'bg-sky-100 text-sky-700'}`}>
                      <FileUp size={14} />
                      Navicat 导入
                    </div>
                    <div>
                      <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>软件工厂适配连接配置</h3>
                      <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                        支持直接导入 Navicat 导出的 `.ncx` 连接文件，也支持粘贴 JDBC URL 或 Host / Port / User / Password 形式的连接信息。
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={`${btnSecondary(theme)} rounded-2xl`}
                      onClick={() => setImportModalOpen(true)}
                    >
                      <FileUp size={16} />
                      导入 Navicat 连接
                    </button>
                    <button
                      type="button"
                      className={`${btnSecondary(theme)} rounded-2xl`}
                      onClick={() => void loadHealth()}
                    >
                      <RefreshCcw size={16} />
                      重新检测
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <div className={labelClass}>数据库 URL</div>
                  <input
                    className={inputClass}
                    value={settingsForm.dbUrl || ''}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, dbUrl: e.target.value }))}
                    placeholder="jdbc:mysql://host:3306/db?..."
                  />
                </div>
                <div>
                  <div className={labelClass}>数据库用户名</div>
                  <input
                    className={inputClass}
                    value={settingsForm.dbUsername || ''}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, dbUsername: e.target.value }))}
                  />
                </div>
                <div>
                  <div className={labelClass}>数据库密码</div>
                  <div className="relative">
                    <input
                      className={`${inputClass} pr-12`}
                      type={showDbPassword ? 'text' : 'password'}
                      name="robotFactoryDbPassword"
                      autoComplete="new-password"
                      value={settingsForm.dbPassword || ''}
                      onChange={(e) => setSettingsForm((prev) => ({ ...prev, dbPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      aria-label={showDbPassword ? '隐藏密码' : '显示密码'}
                      aria-pressed={showDbPassword}
                      className={`absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl transition-colors ${
                        isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      onClick={() => setShowDbPassword((prev) => !prev)}
                    >
                      {showDbPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className={labelClass}>驱动类名</div>
                  <input
                    className={inputClass}
                    value={settingsForm.dbDriverClassName || ''}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, dbDriverClassName: e.target.value }))}
                  />
                </div>
                <div>
                  <div className={labelClass}>对外访问地址</div>
                  <input
                    className={inputClass}
                    value={settingsForm.publicBaseUrl || ''}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, publicBaseUrl: e.target.value }))}
                    placeholder="https://example.edu.cn"
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className={labelClass}>软件工厂白名单 IP</div>
                  <textarea
                    className={`${inputClass} min-h-[120px]`}
                    value={allowedIpsText}
                    onChange={(e) => setAllowedIpsText(e.target.value)}
                    placeholder={'每行一个 IP，也支持逗号分隔'}
                  />
                </div>
                <div>
                  <div className={labelClass}>会话空闲超时（分钟）</div>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={settingsForm.sessionIdleMinutes ?? 10}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, sessionIdleMinutes: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <div className={labelClass}>会话最大生命周期（分钟）</div>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={settingsForm.sessionMaxLifetimeMinutes ?? 30}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, sessionMaxLifetimeMinutes: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <div className={labelClass}>调用超时（秒）</div>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={settingsForm.invokeTimeoutSeconds ?? 120}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, invokeTimeoutSeconds: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <div className={labelClass}>最近保存</div>
                  <div className={`mt-3 text-sm ${textSecondary(theme)}`}>{settingsForm.updateTime || '-'}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" className={btnPrimary} disabled={settingsSaving}>
                  {settingsSaving ? '保存中...' : '保存设置'}
                </button>
                <button type="button" className={btnSecondary(theme)} disabled={settingsTesting} onClick={() => void testConnection()}>
                  {settingsTesting ? '测试中...' : '测试连接'}
                </button>
              </div>
            </form>
          </>
        ) : null}

        {tab === 'projections' ? (
          <>
            <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className={labelClass}>检索</div>
                  <input
                    className={inputClass}
                    placeholder="资源名称 / 资源编码 / 投影编码"
                    value={projectionKeyword}
                    onChange={(e) => setProjectionKeyword(e.target.value)}
                  />
                </div>
                <div className="w-[180px]">
                  <div className={labelClass}>同步状态</div>
                  <select className={selectClass} value={projectionSyncStatus} onChange={(e) => setProjectionSyncStatus(e.target.value)}>
                    <option value="">全部</option>
                    <option value="pending">pending</option>
                    <option value="synced">synced</option>
                    <option value="failed">failed</option>
                    <option value="deleted">deleted</option>
                  </select>
                </div>
                <div className="w-[180px]">
                  <div className={labelClass}>自动同步</div>
                  <select className={selectClass} value={projectionAutoSyncFilter} onChange={(e) => setProjectionAutoSyncFilter(e.target.value)}>
                    <option value="">全部</option>
                    <option value="true">仅已开启</option>
                    <option value="false">仅已关闭</option>
                  </select>
                </div>
                <button type="button" className={btnPrimary} onClick={() => void loadProjections(1)}>查询</button>
                <button
                  type="button"
                  className={btnSecondary(theme)}
                  onClick={() => {
                    resetProjectionForm();
                    void loadAvailableResources();
                  }}
                >
                  新建投影
                </button>
              </div>
              <p className={helperClass}>
                新建时直接选择已发布 MCP 资源，不需要再手工填写资源 ID。连接正常时主按钮会直接执行“保存并同步”，尽量减少人工步骤。
              </p>
            </section>

            <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className={titleClass}>{editingProjection ? `编辑投影 #${editingProjection.id}` : '新建投影'}</h3>
                {editingProjection ? (
                  <button type="button" className={btnSecondary(theme)} onClick={resetProjectionForm}>取消编辑</button>
                ) : null}
              </div>

              {!isExternalConnectionReady ? (
                <div className={`${warningInlineClass} ${warningTextClass}`}>
                  当前只能保存本地投影配置，不能直接同步到软件工厂。完成连接配置后，主按钮会恢复为“保存并同步”。
                </div>
              ) : null}

              {!editingProjection ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[240px] flex-1">
                      <div className={labelClass}>可投影 MCP 资源</div>
                      <input
                        className={inputClass}
                        placeholder="按资源名称或编码筛选"
                        value={availableResourceKeyword}
                        onChange={(e) => setAvailableResourceKeyword(e.target.value)}
                      />
                    </div>
                    <button type="button" className={btnSecondary(theme)} onClick={() => void loadAvailableResources()}>
                      筛选资源
                    </button>
                  </div>
                  <div>
                    <div className={labelClass}>选择资源</div>
                    <select
                      className={selectClass}
                      value={projectionForm.resourceId}
                      onChange={(e) => {
                        const nextResourceId = e.target.value;
                        const nextResource = availableResources.find((item) => item.resourceId === nextResourceId);
                        setProjectionForm((prev) => ({
                          ...prev,
                          resourceId: nextResourceId,
                          displayName: prev.displayName || nextResource?.displayName || '',
                          description: prev.description || nextResource?.description || '',
                        }));
                      }}
                    >
                      <option value="">{availableResourcesLoading ? '加载中...' : '请选择已发布 MCP 资源'}</option>
                      {availableResources.map((item) => (
                        <option key={item.resourceId} value={item.resourceId}>
                          {item.displayName} {item.resourceCode ? `(${item.resourceCode})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedResource ? (
                    <div className={softPanelClass}>
                      <div className={`text-sm font-semibold ${textPrimary(theme)}`}>{selectedResource.displayName}</div>
                      <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                        资源ID：{selectedResource.resourceId} {selectedResource.resourceCode ? `| 编码：${selectedResource.resourceCode}` : ''} {selectedResource.schoolId ? `| 学校：${selectedResource.schoolId}` : ''}
                      </div>
                      <p className={`mt-2 text-sm ${textSecondary(theme)}`}>{selectedResource.description || '暂无描述'}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  <div className={labelClass}>资源 ID</div>
                  <input className={inputClass} value={projectionForm.resourceId} disabled />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className={labelClass}>范围</div>
                  <select
                    className={selectClass}
                    value={projectionForm.scopeMode}
                    onChange={(e) => setProjectionForm((prev) => ({ ...prev, scopeMode: e.target.value as 'global' | 'school' }))}
                  >
                    <option value="school">学校级</option>
                    <option value="global">全局</option>
                  </select>
                </div>
                <div>
                  <div className={labelClass}>展示模板覆盖</div>
                  <input
                    className={inputClass}
                    value={projectionForm.displayTemplate}
                    onChange={(e) => setProjectionForm((prev) => ({ ...prev, displayTemplate: e.target.value }))}
                    placeholder="file / image / search_web"
                  />
                </div>
                <div>
                  <div className={labelClass}>显示名称覆盖</div>
                  <input
                    className={inputClass}
                    value={projectionForm.displayName}
                    onChange={(e) => setProjectionForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
                <div>
                  <div className={labelClass}>自动同步</div>
                  <label className={`mt-3 inline-flex items-center gap-3 text-sm ${textSecondary(theme)}`}>
                    <input
                      type="checkbox"
                      checked={projectionForm.autoSyncEnabled}
                      onChange={(e) => setProjectionForm((prev) => ({ ...prev, autoSyncEnabled: e.target.checked }))}
                    />
                    保存时同步更新自动同步开关
                  </label>
                </div>
                <div className="lg:col-span-2">
                  <div className={labelClass}>描述覆盖</div>
                  <textarea
                    className={`${inputClass} min-h-[96px]`}
                    value={projectionForm.description}
                    onChange={(e) => setProjectionForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className={labelClass}>spec_json 覆盖</div>
                  <textarea
                    className={`${inputClass} min-h-[120px] font-mono text-xs`}
                    value={projectionForm.specJson}
                    onChange={(e) => setProjectionForm((prev) => ({ ...prev, specJson: e.target.value }))}
                    placeholder='留空则自动生成 {"url":".../sse"}'
                  />
                </div>
                <div className="lg:col-span-2">
                  <div className={labelClass}>parameters_schema 覆盖</div>
                  <textarea
                    className={`${inputClass} min-h-[120px] font-mono text-xs`}
                    value={projectionForm.parametersSchema}
                    onChange={(e) => setProjectionForm((prev) => ({ ...prev, parametersSchema: e.target.value }))}
                    placeholder="可留空，运行时依赖 tools/list"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={projectionSaving}
                  onClick={() => void saveProjection(isExternalConnectionReady ? 'save_and_sync' : 'save')}
                >
                  {projectionSaving
                    ? (projectionSubmitMode === 'save_and_sync' ? '保存并同步中...' : '保存中...')
                    : (isExternalConnectionReady
                      ? (editingProjection ? '保存并同步' : '创建并同步')
                      : (editingProjection ? '仅保存修改' : '仅创建投影'))}
                </button>
                <button
                  type="button"
                  className={btnSecondary(theme)}
                  disabled={projectionSaving}
                  onClick={() => void saveProjection('save')}
                >
                  仅保存
                </button>
                <button type="button" className={btnSecondary(theme)} onClick={resetProjectionForm}>清空</button>
              </div>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <h3 className={titleClass}>投影列表</h3>
                <span className={helperClass}>共 {projectionTotal} 条</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">资源ID</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">资源</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">范围</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Corp</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">状态</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">自动同步</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">结果</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map((item) => (
                      <tr key={item.id} className={tableRowClass}>
                        <td className="px-4 py-3 text-sm font-mono">{item.resourceId}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{item.displayName}</div>
                          <div className={helperClass}>{item.resourceCode || item.agentName}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{item.scopeMode === 'global' ? '全局' : `学校 ${item.schoolId ?? '-'}`}</td>
                        <td className="px-4 py-3 text-sm">{item.corpId ?? '-'}</td>
                        <td className="px-4 py-3 text-sm">{projectionStatusBadge(item.syncStatus)}</td>
                        <td className="px-4 py-3 text-sm">{item.autoSyncEnabled ? '已开启' : '已关闭'}</td>
                        <td className="px-4 py-3 text-sm">{item.syncMessage || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" className={smallButton} onClick={() => onEditProjection(item)}>编辑</button>
                            <button
                              type="button"
                              className={smallButton}
                              disabled={!isExternalConnectionReady}
                              onClick={async () => {
                                try {
                                  await systemConfigService.syncRobotFactoryProjection(item.id);
                                  showMessage('已触发手动同步', 'success');
                                  await loadProjections(projectionPage);
                                  await loadLogs(1);
                                } catch (e) {
                                  showMessage(e instanceof Error ? e.message : '手动同步失败', 'error');
                                }
                              }}
                            >
                              同步
                            </button>
                            <button
                              type="button"
                              className={smallButton}
                              onClick={async () => {
                                try {
                                  await systemConfigService.setRobotFactoryProjectionAutoSync(item.id, !item.autoSyncEnabled);
                                  showMessage(item.autoSyncEnabled ? '已关闭自动同步' : '已开启自动同步', 'success');
                                  await loadProjections(projectionPage);
                                } catch (e) {
                                  showMessage(e instanceof Error ? e.message : '切换自动同步失败', 'error');
                                }
                              }}
                            >
                              {item.autoSyncEnabled ? '关闭自动' : '开启自动'}
                            </button>
                            <button
                              type="button"
                              className={`${btnDanger} h-9 px-3 py-0 text-xs`}
                              onClick={async () => {
                                try {
                                  await systemConfigService.deleteRobotFactoryProjectionExternal(item.id);
                                  showMessage('已删除软件工厂外部注册', 'info');
                                  await loadProjections(projectionPage);
                                  await loadLogs(1);
                                } catch (e) {
                                  showMessage(e instanceof Error ? e.message : '删除外部注册失败', 'error');
                                }
                              }}
                            >
                              删外部
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!projectionLoading && projections.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">暂无投影数据</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {tab === 'corp' ? (
          <>
            <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className={titleClass}>{editingCorp ? `编辑映射 #${editingCorp.id}` : '学校 Corp 映射'}</h3>
                {editingCorp ? (
                  <button type="button" className={btnSecondary(theme)} onClick={resetCorpForm}>取消编辑</button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className={labelClass}>school_id</div>
                  <input className={inputClass} value={corpForm.schoolId} onChange={(e) => setCorpForm((prev) => ({ ...prev, schoolId: e.target.value }))} />
                </div>
                <div>
                  <div className={labelClass}>corp_id</div>
                  <input className={inputClass} value={corpForm.corpId} onChange={(e) => setCorpForm((prev) => ({ ...prev, corpId: e.target.value }))} />
                </div>
                <div>
                  <div className={labelClass}>学校名称快照</div>
                  <input className={inputClass} value={corpForm.schoolNameSnapshot} onChange={(e) => setCorpForm((prev) => ({ ...prev, schoolNameSnapshot: e.target.value }))} />
                </div>
                <div>
                  <div className={labelClass}>备注</div>
                  <input className={inputClass} value={corpForm.remark} onChange={(e) => setCorpForm((prev) => ({ ...prev, remark: e.target.value }))} />
                </div>
                <label className={`inline-flex items-center gap-3 text-sm ${textSecondary(theme)}`}>
                  <input type="checkbox" checked={corpForm.enabled} onChange={(e) => setCorpForm((prev) => ({ ...prev, enabled: e.target.checked }))} />
                  启用该映射
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={btnPrimary} disabled={corpSaving} onClick={() => void saveCorpMapping()}>
                  {corpSaving ? '保存中...' : editingCorp ? '保存映射' : '新增映射'}
                </button>
                <button type="button" className={btnSecondary(theme)} onClick={resetCorpForm}>清空</button>
              </div>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <h3 className={titleClass}>映射列表</h3>
                <span className={helperClass}>共 {corpMappings.length} 条</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">school_id</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">学校快照</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">corp_id</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">状态</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">备注</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corpMappings.map((item) => (
                      <tr key={item.id} className={tableRowClass}>
                        <td className="px-4 py-3 text-sm">{item.schoolId}</td>
                        <td className="px-4 py-3 text-sm">{item.schoolNameSnapshot || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono">{item.corpId}</td>
                        <td className="px-4 py-3 text-sm">{item.enabled ? '启用' : '停用'}</td>
                        <td className="px-4 py-3 text-sm">{item.remark || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" className={smallButton} onClick={() => onEditCorp(item)}>编辑</button>
                        </td>
                      </tr>
                    ))}
                    {!corpLoading && corpMappings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">暂无 Corp 映射</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {tab === 'logs' ? (
          <>
            <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[180px]">
                  <div className={labelClass}>动作</div>
                  <select className={selectClass} value={logAction} onChange={(e) => setLogAction(e.target.value)}>
                    <option value="">全部动作</option>
                    <option value="create">create</option>
                    <option value="update">update</option>
                    <option value="delete">delete</option>
                    <option value="manual_sync">manual_sync</option>
                  </select>
                </div>
                <div className="w-[180px]">
                  <div className={labelClass}>结果</div>
                  <select className={selectClass} value={logSuccessFilter} onChange={(e) => setLogSuccessFilter(e.target.value)}>
                    <option value="">全部</option>
                    <option value="true">成功</option>
                    <option value="false">失败</option>
                  </select>
                </div>
                <div className="w-[180px]">
                  <div className={labelClass}>投影 ID</div>
                  <input className={inputClass} value={logProjectionId} onChange={(e) => setLogProjectionId(e.target.value)} />
                </div>
                <button type="button" className={btnPrimary} onClick={() => void loadLogs(1)}>查询</button>
              </div>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-4 sm:px-5">
                <h3 className={titleClass}>同步日志</h3>
                <span className={helperClass}>共 {logTotal} 条</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">时间</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">投影ID</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">动作</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">结果</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">消息</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((item) => (
                      <tr key={item.id} className={tableRowClass}>
                        <td className="px-4 py-3 text-sm">{item.createTime || '-'}</td>
                        <td className="px-4 py-3 text-sm font-mono">{item.projectionId || '-'}</td>
                        <td className="px-4 py-3 text-sm">{item.action}</td>
                        <td className="px-4 py-3 text-sm">{item.success ? '成功' : '失败'}</td>
                        <td className="px-4 py-3 text-sm">{item.message || '-'}</td>
                      </tr>
                    ))}
                    {!logLoading && logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">暂无同步日志</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>

      {/*
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="导入连接串"
        theme={theme}
        size="lg"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setImportModalOpen(false)}>
              取消
            </button>
            <button type="button" className={btnPrimary} onClick={importConnectionConfig}>
              解析并回填
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className={`text-sm ${textSecondary(theme)}`}>
            支持类似 Navicat 的快速导入体验。把连接串或连接信息粘贴进来后，系统会自动解析数据库 URL、用户名、密码和驱动类。
          </p>
          <textarea
            className={`${inputClass} min-h-[220px] font-mono text-xs`}
            value={importConnectionText}
            onChange={(e) => setImportConnectionText(e.target.value)}
            placeholder={[
              '示例 1:',
              'mysql://root:password@127.0.0.1:3306/genie',
              '',
              '示例 2:',
              'jdbc:mysql://127.0.0.1:3306/genie?useUnicode=true&characterEncoding=UTF-8',
              '',
              '示例 3:',
              'Host=127.0.0.1;Port=3306;User=root;Password=password;Database=genie',
            ].join('\n')}
          />
          <div className={`${softPanelClass} text-xs leading-6 ${textMuted(theme)}`}>
            <div>支持格式：</div>
            <div>1. `jdbc:mysql://...` 这类 JDBC URL</div>
            <div>2. `mysql://user:password@host:port/db` 这类 URI</div>
            <div>3. `Host=...;Port=...;User=...;Password=...;Database=...` 这类键值串</div>
          </div>
        </div>
      </Modal>
      */}

      <Modal
        open={importModalOpen}
        onClose={closeImportModal}
        title="导入 Navicat 连接"
        theme={theme}
        size="lg"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={closeImportModal}>
              取消
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={importConnectionConfig}
              disabled={!importCandidates.length && !importConnectionText.trim()}
            >
              导入并回填
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".ncx,.xml,text/xml,application/xml"
            className="hidden"
            onChange={onImportFileChange}
          />

          <div className={importHeroClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className={`text-sm font-semibold ${textPrimary(theme)}`}>从 Navicat 导出文件快速导入</div>
                <p className={`text-sm leading-6 ${textSecondary(theme)}`}>
                  选择 Navicat 导出的 `.ncx` 文件后，系统会自动识别其中的连接配置；如果导出的密码不是明文，会保留连接信息并提示你手动补填密码。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`${btnSecondary(theme)} rounded-2xl`}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <FileUp size={16} />
                  选择 .ncx 文件
                </button>
              </div>
            </div>
            {importFileName ? (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isDark ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700 shadow-[var(--shadow-control)]'}`}>
                <CheckCircle2 size={14} />
                {importFileName}
              </div>
            ) : null}
          </div>

          {importCandidates.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className={`text-sm font-semibold ${textPrimary(theme)}`}>识别到的连接</div>
                <div className={`text-xs ${textMuted(theme)}`}>选择一条配置后直接导入</div>
              </div>
              <div className="grid gap-3">
                {importCandidates.map((candidate, index) => (
                  <button
                    key={`${candidate.name}-${candidate.dbUrl || index}`}
                    type="button"
                    className={`${importCandidateClass(index === selectedImportIndex)} text-left transition`}
                    onClick={() => setSelectedImportIndex(index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${textPrimary(theme)}`}>{candidate.name}</div>
                        {candidate.detail ? (
                          <div className={`mt-1 text-xs ${textMuted(theme)}`}>{candidate.detail}</div>
                        ) : null}
                        {candidate.dbUrl ? (
                          <div className={`mt-2 break-all font-mono text-xs ${textSecondary(theme)}`}>{candidate.dbUrl}</div>
                        ) : null}
                      </div>
                      {index === selectedImportIndex ? (
                        <CheckCircle2 size={18} className={isDark ? 'text-sky-300' : 'text-sky-600'} />
                      ) : null}
                    </div>
                    {candidate.warning ? (
                      <div className={`mt-3 inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-xs ${isDark ? 'bg-amber-500/12 text-amber-100' : 'bg-amber-50 text-amber-800'}`}>
                        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                        <span>{candidate.warning}</span>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className={`text-sm font-semibold ${textPrimary(theme)}`}>或粘贴连接信息</div>
            <textarea
              className={`${inputClass} min-h-[200px] font-mono text-xs`}
              value={importConnectionText}
              onChange={(e) => setImportConnectionText(e.target.value)}
              placeholder={[
                '示例 1:',
                'mysql://root:password@127.0.0.1:3306/genie',
                '',
                '示例 2:',
                'jdbc:mysql://127.0.0.1:3306/genie?useUnicode=true&characterEncoding=UTF-8',
                '',
                '示例 3:',
                'Host=127.0.0.1;Port=3306;User=root;Password=password;Database=genie',
              ].join('\n')}
            />
          </div>

          <div className={`${softPanelClass} text-xs leading-6 ${textMuted(theme)}`}>
            <div className={`mb-1 font-semibold ${textPrimary(theme)}`}>支持的导入格式</div>
            <div>1. Navicat 导出的 `.ncx` 连接文件</div>
            <div>2. `jdbc:mysql://...` 这类 JDBC URL</div>
            <div>3. `mysql://user:password@host:port/db` 这类 URI</div>
            <div>4. `Host=...;Port=...;User=...;Password=...;Database=...` 这类键值对</div>
          </div>
        </div>
      </Modal>
    </MgmtPageShell>
  );
};
