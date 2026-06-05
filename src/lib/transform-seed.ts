const MAX_SEED = 2_147_483_647;

export function createTransformSeed(): number {
  return Math.floor(Math.random() * MAX_SEED) + 1;
}

export function parseTransformSeed(value: FormDataEntryValue | null): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_SEED) {
    return undefined;
  }
  return parsed;
}
