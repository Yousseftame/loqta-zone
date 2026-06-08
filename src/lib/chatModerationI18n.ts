/** English default stored by older moderation actions — resolve via i18n instead. */
export const CHAT_MODERATION_DEFAULT_REASON_EN =
  "violating auction chat policy";

export function resolveModerationReason(
  customReason: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const trimmed = customReason?.trim();
  if (!trimmed || trimmed === CHAT_MODERATION_DEFAULT_REASON_EN) {
    return t("auctionLive.chatDefaultReason");
  }
  return trimmed;
}
