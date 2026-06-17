/**
 * Per-key async mutex for in-memory storage backends.
 * Prevents read-modify-write races within a single Node process.
 */
const chains = new Map<string, Promise<void>>();

export async function withKeyLock<T>(
  key: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  chains.set(
    key,
    previous.then(() => current),
  );

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (chains.get(key) === current) {
      chains.delete(key);
    }
  }
}

export function resetKeyLocksForTests() {
  chains.clear();
}
