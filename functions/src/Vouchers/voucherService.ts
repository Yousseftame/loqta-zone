/**
 * functions/src/Vouchers/voucherService.ts
 *
 * Cloud Function: applyVoucher
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 * All validation + all writes run inside a SINGLE Firestore runTransaction.
 * This means:
 *   - No two concurrent calls can both succeed for the same (userId, voucherId)
 *   - usageCount can never exceed maxUses even under heavy load
 *   - If any write fails, ALL writes are rolled back
 *
 * ─── Firestore paths written ──────────────────────────────────────────────────
 *   vouchers/{voucherId}                     → increment usageCount
 *   vouchers/{voucherId}/usages/{userId}     → create usage record (idempotency key)
 *   users/{userId}/auctions/{auctionId}      → voucherUsed, amount, discountApplied
 *   auctions/{auctionId}/Participants/{uid}  → voucherUsed, discountApplied
 *
 * ─── Why Cloud Function (not client-side) ────────────────────────────────────
 *   1. Firestore security rules cannot enforce "user hasn't used voucher X yet"
 *      across two collections atomically
 *   2. usageCount increment MUST be inside a transaction to prevent overshooting
 *   3. Client cannot be trusted to compute effective fees
 *
 * ─── Call from client ─────────────────────────────────────────────────────────
 *   const applyVoucher = httpsCallable(functions, "applyVoucher");
 *   const result = await applyVoucher({ voucherCode, auctionId });
 *   // result.data = { effectiveFee, discountApplied, voucherId, type }
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

// ─── Types ────────────────────────────────────────────────────────────────────

type VoucherType = "entry_free" | "entry_discount" | "final_discount";

interface VoucherDoc {
  code:               string;
  type:               VoucherType;
  discountAmount:     number | null;
  applicableAuctions: string[];
  maxUses:            number;
  usageCount:         number;
  isActive:           boolean;
  expiryDate:         Timestamp;
}

interface ApplyVoucherRequest {
  voucherCode: string;
  auctionId:   string;
}

interface ApplyVoucherResponse {
  effectiveFee:    number;   // entry fee after discount (0 for entry_free)
  discountApplied: number;   // how much was saved
  voucherId:       string;
  voucherCode:     string;
  type:            VoucherType;
  message:         string;
}

// ─── Helper: compute effective entry fee ─────────────────────────────────────

function computeEffectiveFee(
  type:           VoucherType,
  originalFee:    number,
  discountAmount: number | null,
): { effectiveFee: number; discountApplied: number } {
  switch (type) {
    case "entry_free":
      return { effectiveFee: 0, discountApplied: originalFee };

    case "entry_discount": {
      const discount = discountAmount ?? 0;
      const effective = Math.max(0, originalFee - discount);
      return {
        effectiveFee:    effective,
        discountApplied: originalFee - effective,
      };
    }

    case "final_discount":
      // Entry fee unchanged — discount applied to winning bid at settlement
      return { effectiveFee: originalFee, discountApplied: 0 };

    default:
      return { effectiveFee: originalFee, discountApplied: 0 };
  }
}

// ─── Cloud Function ───────────────────────────────────────────────────────────

export const applyVoucher = onCall(
  { timeoutSeconds: 30, memory: "256MiB" },
  async (request): Promise<ApplyVoucherResponse> => {

    // ── 1. Auth guard ─────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const userId = request.auth.uid;

    // ── 2. Input validation ───────────────────────────────────────────────────
    const { voucherCode, auctionId } = request.data as ApplyVoucherRequest;

    if (!voucherCode || typeof voucherCode !== "string" || !voucherCode.trim()) {
      throw new HttpsError("invalid-argument", "voucherCode is required.");
    }
    if (!auctionId || typeof auctionId !== "string") {
      throw new HttpsError("invalid-argument", "auctionId is required.");
    }

    const code = voucherCode.trim().toUpperCase();

    // ── 3. Look up voucher by code (outside transaction — read-only pre-check) ─
    // This is a cheap early-exit before we open an expensive transaction.
    // The transaction will re-read all docs and re-validate everything atomically.
    const voucherQuery = await db
      .collection("vouchers")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (voucherQuery.empty) {
      throw new HttpsError("not-found", "Voucher code not found.");
    }

    const voucherRef = voucherQuery.docs[0].ref;
    const voucherId  = voucherQuery.docs[0].id;

    // ── 4. All other refs ─────────────────────────────────────────────────────
    const usageRef       = voucherRef.collection("usages").doc(userId);
    const auctionRef     = db.collection("auctions").doc(auctionId);
    const participantRef = db.collection("auctions").doc(auctionId)
                             .collection("Participants").doc(userId);
    const userAuctionRef = db.collection("users").doc(userId)
                             .collection("auctions").doc(auctionId);

    // ── 5. Transaction — ALL reads first, then ALL writes ─────────────────────
    const result = await db.runTransaction(async (transaction) => {

      // ── READS ──────────────────────────────────────────────────────────────
      const [
        voucherSnap,
        usageSnap,
        auctionSnap,
        participantSnap,
        userAuctionSnap,
      ] = await Promise.all([
        transaction.get(voucherRef),
        transaction.get(usageRef),
        transaction.get(auctionRef),
        transaction.get(participantRef),
        transaction.get(userAuctionRef),
      ]);

      // ── VALIDATIONS (all must pass before any write) ───────────────────────

      // V1: Voucher exists
      if (!voucherSnap.exists) {
        throw new HttpsError("not-found", "Voucher no longer exists.");
      }
      const voucher = voucherSnap.data() as VoucherDoc;

      // V2: Voucher is active
      if (!voucher.isActive) {
        throw new HttpsError("failed-precondition", "This voucher is no longer active.");
      }

      // V3: Not expired
      const expiry: Date =
        voucher.expiryDate instanceof Timestamp
          ? voucher.expiryDate.toDate()
          : new Date(voucher.expiryDate);
      if (new Date() > expiry) {
        throw new HttpsError("failed-precondition", "This voucher has expired.");
      }

      // V4: Global usage limit not exceeded (atomic — inside transaction)
      if (voucher.usageCount >= voucher.maxUses) {
        throw new HttpsError(
          "resource-exhausted",
          "This voucher has reached its maximum usage limit.",
        );
      }

      // V5: This user has NOT already used this voucher (global — any auction)
      if (usageSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "You have already used this voucher.",
        );
      }

      // V6: User has NOT already used a different voucher on this specific auction
      if (userAuctionSnap.exists) {
        const userAuctionData = userAuctionSnap.data()!;
        if (userAuctionData.voucherUsed === true) {
          throw new HttpsError(
            "already-exists",
            "A voucher has already been applied to this auction registration.",
          );
        }
      }

      // V7: User is a participant in this auction (must have joined first)
      if (!participantSnap.exists) {
        throw new HttpsError(
          "failed-precondition",
          "You must register for the auction before applying a voucher.",
        );
      }

      // V8: Auction exists
      if (!auctionSnap.exists) {
        throw new HttpsError("not-found", "Auction not found.");
      }
      const auctionData = auctionSnap.data()!;

      // V9: Voucher applicable to this auction
      if (
        voucher.applicableAuctions.length > 0 &&
        !voucher.applicableAuctions.includes(auctionId)
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This voucher is not valid for the selected auction.",
        );
      }

      // V10: entry_free / entry_discount only make sense on paid auctions
      const entryFee: number = auctionData.entryFee ?? 0;
      const entryType: string = auctionData.entryType ?? "free";

      if (
        (voucher.type === "entry_free" || voucher.type === "entry_discount") &&
        entryType === "free"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This voucher only applies to paid-entry auctions.",
        );
      }

      // ── COMPUTE DISCOUNT ───────────────────────────────────────────────────
      const { effectiveFee, discountApplied } = computeEffectiveFee(
        voucher.type,
        entryFee,
        voucher.discountAmount,
      );

      const now = FieldValue.serverTimestamp();

      // ── WRITES (all atomic) ────────────────────────────────────────────────

      // W1: Increment usageCount on the voucher doc
      transaction.update(voucherRef, {
        usageCount: FieldValue.increment(1),
      });

      // W2: Create usage record — doc ID = userId = idempotency key
      //     If a concurrent call tries to write this same doc, Firestore
      //     will detect the conflict and retry the transaction, then fail V5.
      transaction.set(usageRef, {
        userId,
        auctionId,
        voucherCode:     code,
        discountApplied,
        effectiveFee,
        type:            voucher.type,
        usedAt:          now,
      });

      // W3: Update user's auction record with effective fee and voucher info
      transaction.update(userAuctionRef, {
        voucherUsed:     true,
        voucherId,
        voucherCode:     code,
        amount:          effectiveFee,        // overwrite with discounted amount
        discountApplied,
        updatedAt:       now,
      });

      // W4: Update participant record with voucher info
      transaction.update(participantRef, {
        voucherUsed:     true,
        voucherId,
        voucherCode:     code,
        discountApplied,
        updatedAt:       now,
      });

      return {
        effectiveFee,
        discountApplied,
        voucherId,
        voucherCode: code,
        type:        voucher.type,
        message:     "Voucher applied successfully.",
      };
    });

    // console.log(
    //   `[applyVoucher] uid=${userId} voucher=${voucherId} auction=${auctionId} ` +
    //   `discount=${result.discountApplied} effectiveFee=${result.effectiveFee}`,
    // );

    return result;
  },
);

// ─── Cloud Function: validateVoucher (read-only pre-flight check) ─────────────
//
// Called by the UI BEFORE the user submits, to show real-time feedback.
// Does NOT write anything. Does NOT increment usageCount.
// The actual enforcement happens in applyVoucher above.

export const validateVoucher = onCall(
  { timeoutSeconds: 10, memory: "128MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const userId = request.auth.uid;
    const { voucherCode, auctionId } = request.data as ApplyVoucherRequest;

    if (!voucherCode || !auctionId) {
      throw new HttpsError("invalid-argument", "voucherCode and auctionId are required.");
    }
    const code = voucherCode.trim().toUpperCase();

    // Parallel reads — no transaction needed (read-only)
    const voucherQuery = await db
      .collection("vouchers")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (voucherQuery.empty) {
      return { valid: false, reason: "Voucher code not found." };
    }

    const voucherDoc  = voucherQuery.docs[0];
    const voucherId   = voucherDoc.id;
    const voucher     = voucherDoc.data() as VoucherDoc;

    if (!voucher.isActive) {
      return { valid: false, reason: "This voucher is no longer active." };
    }

    const expiry: Date =
      voucher.expiryDate instanceof Timestamp
        ? voucher.expiryDate.toDate()
        : new Date(voucher.expiryDate);
    if (new Date() > expiry) {
      return { valid: false, reason: "This voucher has expired." };
    }

    if (voucher.usageCount >= voucher.maxUses) {
      return { valid: false, reason: "This voucher has reached its maximum usage limit." };
    }

    // Check if user already used it
    const usageSnap = await db
      .collection("vouchers").doc(voucherId)
      .collection("usages").doc(userId)
      .get();
    if (usageSnap.exists) {
      return { valid: false, reason: "You have already used this voucher." };
    }

    // Check if user has a voucher on this auction already
    const userAuctionSnap = await db
      .collection("users").doc(userId)
      .collection("auctions").doc(auctionId)
      .get();
    if (userAuctionSnap.exists && userAuctionSnap.data()?.voucherUsed === true) {
      return { valid: false, reason: "A voucher is already applied to this auction." };
    }

    // Auction applicability
    if (
      voucher.applicableAuctions.length > 0 &&
      !voucher.applicableAuctions.includes(auctionId)
    ) {
      return { valid: false, reason: "This voucher is not valid for this auction." };
    }

    // Compute preview discount
    const auctionSnap = await db.collection("auctions").doc(auctionId).get();
    const entryFee = auctionSnap.exists ? (auctionSnap.data()?.entryFee ?? 0) : 0;
    const entryType = auctionSnap.exists ? (auctionSnap.data()?.entryType ?? "free") : "free";

    if (
      (voucher.type === "entry_free" || voucher.type === "entry_discount") &&
      entryType === "free"
    ) {
      return { valid: false, reason: "This voucher only applies to paid-entry auctions." };
    }

    const { effectiveFee, discountApplied } = computeEffectiveFee(
      voucher.type,
      entryFee,
      voucher.discountAmount,
    );

    return {
      valid:           true,
      voucherId,
      type:            voucher.type,
      discountAmount:  voucher.discountAmount,
      effectiveFee,
      discountApplied,
      remainingUses:   voucher.maxUses - voucher.usageCount,
    };
  },
);