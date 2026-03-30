/**
 * functions/src/Vouchers/migrateVouchers.ts
 *
 * ONE-TIME migration: converts existing voucher docs from the old `usedBy` array
 * to the new `usageCount` counter + `usages` subcollection.
 *
 * Run once after deploying the new system.
 * Safe to run multiple times (idempotent).
 *
 * Call via:
 *   const migrateVouchers = httpsCallable(functions, "migrateVouchers");
 *   await migrateVouchers({});
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore,  Timestamp } from "firebase-admin/firestore";

const db = getFirestore();

export const migrateVouchers = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");

    // Only superAdmins can run migrations
    const callerSnap = await db.collection("users").doc(request.auth.uid).get();
    if (callerSnap.data()?.role !== "superAdmin") {
      throw new HttpsError("permission-denied", "Only superAdmins can run migrations.");
    }

    // console.log("[migrateVouchers] Starting migration...");

    const vouchersSnap = await db.collection("vouchers").get();
    let migrated = 0;
    let skipped  = 0;

    for (const voucherDoc of vouchersSnap.docs) {
      const data = voucherDoc.data();

      // Skip already-migrated docs (they have usageCount but no usedBy array)
      if (typeof data.usageCount === "number" && !Array.isArray(data.usedBy)) {
        skipped++;
        continue;
      }

      const usedByArray: Array<{
        userId:    string;
        userName:  string;
        usedAt:    any;
        auctionIds?: string[];
      }> = Array.isArray(data.usedBy) ? data.usedBy : [];

      const batch = db.batch();

      // Set usageCount = usedBy.length
      batch.update(voucherDoc.ref, {
        usageCount: usedByArray.length,
        // Keep usedBy for now — remove after verifying migration worked
        // usedBy: FieldValue.delete(),  // uncomment after verification
      });

      // Create usages subcollection docs from usedBy entries
      for (const entry of usedByArray) {
        if (!entry.userId) continue;
        const usageRef = voucherDoc.ref.collection("usages").doc(entry.userId);

        // Check if already migrated
        const existing = await usageRef.get();
        if (existing.exists) continue;

        batch.set(usageRef, {
          userId:          entry.userId,
          auctionId:       entry.auctionIds?.[0] ?? "",   // best guess
          voucherCode:     data.code ?? "",
          discountApplied: data.discountAmount ?? 0,
          effectiveFee:    0,                             // unknown from old data
          type:            data.type ?? "entry_free",
          usedAt:
            entry.usedAt instanceof Timestamp
              ? entry.usedAt
              : Timestamp.now(),
        });
      }

      await batch.commit();
      migrated++;

      // console.log(`[migrateVouchers] Migrated voucher ${voucherDoc.id} (${usedByArray.length} usages)`);
    }

    // console.log(`[migrateVouchers] Done. Migrated: ${migrated}, Skipped: ${skipped}`);
    return { success: true, migrated, skipped };
  },
);