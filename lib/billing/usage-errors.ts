/**
 * Checks if the database error is a unique constraint violation on the usage
 * ledger idempotency key (PostgreSQL error code 23505).
 */
export function isUniqueConstraintViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || !!error.message?.includes("uq_usage_ledger_user_event_idempotency");
}
