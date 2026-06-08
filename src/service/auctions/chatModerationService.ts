/**
 * chatModerationService.ts — Admin chat moderation (warn / kick).
 * Stores i18n keys + params so messages localize per viewer language.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { restrictUserFromAuctionFull } from "@/service/users/userService";

export type ChatMessageType = "user" | "system_warn" | "system_kick";

export interface ChatMessageParams {
  targetUserName: string;
  customReason?: string | null;
  auctionNumber?: number;
}

async function sendChatNotification(
  userId: string,
  payload: {
    type: "chat_warning" | "chat_kick";
    auctionId: string;
    auctionNumber: number;
    titleKey: string;
    messageKey: string;
    messageParams: { auctionNumber: number; customReason?: string | null };
    url: string;
  },
): Promise<void> {
  await addDoc(collection(db, "users", userId, "notifications"), {
    ...payload,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

/** Replace an offending message with a public system warning. */
export async function warnChatUser(params: {
  auctionId: string;
  messageId: string;
  targetUserId: string;
  targetUserName: string;
  auctionNumber: number;
  reason?: string;
}): Promise<void> {
  const {
    auctionId,
    messageId,
    targetUserId,
    targetUserName,
    auctionNumber,
    reason,
  } = params;

  const customReason = reason?.trim() || null;

  await updateDoc(doc(db, "auctions", auctionId, "chat", messageId), {
    type: "system_warn",
    userId: "system",
    userName: "System",
    userPhotoURL: null,
    messageKey: "auctionLive.chatSystem.warnPublic",
    messageParams: { targetUserName, customReason },
    targetUserId,
    targetUserName,
    moderationReason: customReason,
    moderatedAt: serverTimestamp(),
  });

  await sendChatNotification(targetUserId, {
    type: "chat_warning",
    auctionId,
    auctionNumber,
    titleKey: "notifications.chatWarning.title",
    messageKey: "notifications.chatWarning.message",
    messageParams: { auctionNumber, customReason },
    url: `/auctions/${auctionId}`,
  });
}

/** Restrict user, remove from participants, post public kick notice, notify user. */
export async function kickChatUser(params: {
  auctionId: string;
  targetUserId: string;
  targetUserName: string;
  auctionNumber: number;
  reason?: string;
}): Promise<void> {
  const { auctionId, targetUserId, targetUserName, auctionNumber, reason } =
    params;

  const customReason = reason?.trim() || null;

  const userSnap = await getDoc(doc(db, "users", targetUserId));
  const userEmail = userSnap.exists() ? (userSnap.data()?.email ?? "") : "";

  const restrictedSnap = await getDoc(
    doc(db, "auctions", auctionId, "restricted", targetUserId),
  );
  if (restrictedSnap.exists()) {
    throw new Error("This user is already removed from this auction.");
  }

  await restrictUserFromAuctionFull(targetUserId, auctionId, userEmail);

  const participantRef = doc(
    db,
    "auctions",
    auctionId,
    "Participants",
    targetUserId,
  );
  const participantSnap = await getDoc(participantRef);
  if (participantSnap.exists()) {
    await deleteDoc(participantRef);
    try {
      await updateDoc(doc(db, "auctions", auctionId), {
        totalParticipants: increment(-1),
      });
    } catch {
      /* non-fatal if count update fails */
    }
  }

  await addDoc(collection(db, "auctions", auctionId, "chat"), {
    type: "system_kick",
    auctionId,
    userId: "system",
    userName: "System",
    userPhotoURL: null,
    messageKey: "auctionLive.chatSystem.kickPublic",
    messageParams: { targetUserName, customReason },
    targetUserId,
    targetUserName,
    moderationReason: customReason,
    createdAt: serverTimestamp(),
  });

  await sendChatNotification(targetUserId, {
    type: "chat_kick",
    auctionId,
    auctionNumber,
    titleKey: "notifications.chatKick.title",
    messageKey: "notifications.chatKick.message",
    messageParams: { auctionNumber, customReason },
    url: `/auctions/${auctionId}`,
  });
}
