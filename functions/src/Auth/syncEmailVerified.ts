/**
 * syncEmailVerified — callable
 * Sets users/{uid}.verified = true ONLY when Firebase Auth email is verified.
 * Clients can no longer write `verified` directly.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const syncEmailVerified = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const uid = request.auth.uid;
  const user = await getAuth().getUser(uid);

  if (!user.emailVerified) {
    throw new HttpsError(
      "failed-precondition",
      "Email is not verified yet.",
    );
  }

  await db.collection("users").doc(uid).set(
    {
      verified: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { success: true, verified: true };
});
