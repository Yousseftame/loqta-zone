/**
 * Detect Firestore / Functions permission denials so background loaders
 * can fail silently when an admin simply lacks that module.
 */
export function isPermissionDenied(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null | undefined;
  const code = String(e?.code ?? "");
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    code === "permission-denied" ||
    code === "functions/permission-denied" ||
    msg.includes("missing or insufficient permissions") ||
    msg.includes("permission-denied") ||
    msg.includes("permission denied")
  );
}
