/**
 * 多平台 curl 文案：Bash 多行续行；Windows CMD / PowerShell 使用 curl.exe 单行，便于粘贴执行。
 */

export type CurlPlatform = 'bash' | 'cmd' | 'powershell';

export interface CurlRequestSpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: Array<{ name: string; value: string }>;
  /** raw JSON 或占位片段，直接作为 -d */
  body?: string;
  /** 命令前的说明（Bash: # ；CMD: REM ；PS: #） */
  comments?: string[];
  /** 命令后的说明（同上） */
  notes?: string[];
}

function bashSingleQuoted(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function bashQuoteHeader(name: string, value: string): string {
  return bashSingleQuoted(`${name}: ${value}`);
}

function escapeDouble(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function winHeaderPair(name: string, value: string): string {
  return `"${escapeDouble(`${name}: ${value}`)}"`;
}

function cmdBodyArg(body: string): string {
  return `"${escapeDouble(body)}"`;
}

function psBodyArg(body: string): string {
  if (!body.includes("'")) {
    return `'${body}'`;
  }
  return `"${escapeDouble(body)}"`;
}

function normCommentLines(lines: string[] | undefined, style: 'hash' | 'rem'): string[] {
  if (!lines?.length) return [];
  return lines
    .filter((c) => c.trim() !== '')
    .map((c) => {
      const t = c.replace(/^#\s?/, '').trim();
      if (style === 'hash') {
        return c.startsWith('#') ? c : `# ${t}`;
      }
      return `REM ${t}`;
    });
}

export function buildCurlCommand(spec: CurlRequestSpec, platform: CurlPlatform): string {
  const m = spec.method.toUpperCase();
  const hasBody = spec.body != null && String(spec.body).length > 0;
  const needData = hasBody && m !== 'GET';
  const needExplicitMethod = m !== 'GET';

  const leadingBash = normCommentLines(spec.comments, 'hash');
  const trailingBash = normCommentLines(spec.notes, 'hash');
  const leadingRem = normCommentLines(spec.comments, 'rem');
  const trailingRem = normCommentLines(spec.notes, 'rem');
  const leadingPs = normCommentLines(spec.comments, 'hash');
  const trailingPs = normCommentLines(spec.notes, 'hash');

  const exe = platform === 'bash' ? 'curl' : 'curl.exe';
  const flags = `${exe} -sS`;

  if (platform === 'bash') {
    const lines: string[] = [...leadingBash];
    const hdrs = spec.headers;
    const firstLine = `${flags}${needExplicitMethod ? ` -X ${m}` : ''} "${spec.url}"`;

    if (hdrs.length === 0 && !needData) {
      lines.push(firstLine);
    } else {
      lines.push(`${firstLine} \\`);
      hdrs.forEach((h, i) => {
        const isLastHdr = i === hdrs.length - 1 && !needData;
        let hline = `  -H ${bashQuoteHeader(h.name, h.value)}`;
        if (!isLastHdr) hline += ' \\';
        lines.push(hline);
      });
      if (needData && spec.body != null) {
        const lastIdx = lines.length - 1;
        if (!lines[lastIdx].endsWith('\\')) {
          lines[lastIdx] = `${lines[lastIdx]} \\`;
        }
        lines.push(`  -d ${bashSingleQuoted(spec.body)}`);
      }
    }
    lines.push(...trailingBash);
    return lines.join('\n');
  }

  const parts: string[] = [flags];
  if (needExplicitMethod) {
    parts.push(`-X ${m}`);
  }
  parts.push(`"${escapeDouble(spec.url)}"`);
  spec.headers.forEach((h) => {
    parts.push('-H', winHeaderPair(h.name, h.value));
  });
  if (needData && spec.body != null) {
    parts.push('-d');
    parts.push(platform === 'powershell' ? psBodyArg(spec.body) : cmdBodyArg(spec.body));
  }
  const oneLine = parts.join(' ');

  if (platform === 'cmd') {
    const out: string[] = [...leadingRem, oneLine, ...trailingRem];
    return out.join('\r\n');
  }

  const out: string[] = [...leadingPs, oneLine, ...trailingPs];
  return out.join('\r\n');
}

export function buildCurlTriple(spec: CurlRequestSpec): { bash: string; cmd: string; powershell: string } {
  return {
    bash: buildCurlCommand(spec, 'bash'),
    cmd: buildCurlCommand(spec, 'cmd'),
    powershell: buildCurlCommand(spec, 'powershell'),
  };
}

/** 多条 curl（如 JSON-RPC 三连）；段与段之间空行分隔 */
export function buildCurlTripleMulti(
  sections: Array<{ comments?: string[]; notes?: string[]; spec: CurlRequestSpec }>,
): {
  bash: string;
  cmd: string;
  powershell: string;
} {
  return {
    bash: sections.map((s) => buildCurlCommand({ ...s.spec, comments: s.comments, notes: s.notes }, 'bash')).join('\n\n'),
    cmd: sections.map((s) => buildCurlCommand({ ...s.spec, comments: s.comments, notes: s.notes }, 'cmd')).join('\r\n\r\n'),
    powershell: sections
      .map((s) => buildCurlCommand({ ...s.spec, comments: s.comments, notes: s.notes }, 'powershell'))
      .join('\r\n\r\n'),
  };
}
