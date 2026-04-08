/**
 * 限并发执行异步任务，收集成功/失败项（不中断于首个失败）。
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<{ ok: number; errors: Array<{ item: T; index: number; error: unknown }> }> {
  const limit = Math.max(1, Math.min(concurrency, 32));
  const errors: Array<{ item: T; index: number; error: unknown }> = [];
  let ok = 0;
  let i = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const idx = i;
      i += 1;
      if (idx >= items.length) return;
      const item = items[idx]!;
      try {
        await fn(item, idx);
        ok += 1;
      } catch (error) {
        errors.push({ item, index: idx, error });
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return { ok, errors };
}
