// Shared required-env accessor: throws with a clear name-specific message so
// a missing key fails the individual request instead of an opaque crash.
export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}
