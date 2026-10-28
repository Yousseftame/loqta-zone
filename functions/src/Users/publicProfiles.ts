/**
 * publicProfiles — safe public mirror of users/{uid}
 * Only: fullName, firstName, lastName, profileImage
 *
 * Synced by Admin SDK whenever a user doc is written.
 * Clients never write this collection.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

function publicPayload(data: FirebaseFirestore.DocumentData) {
  return {
    fullName: data.fullName ?? "",
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    profileImage: data.profileImage ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function getCallerRole(uid: string): Promise<string> {
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return "user";
  return (snap.data()?.role as string) ?? "user";
}

export const onUserWrittenPublicProfile = onDocumentWritten(
  {
    document: "users/{uid}",
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (event) => {
    const uid = event.params.uid as string;
    const after = event.data?.after;

    if (!after?.exists) {
      try {
        await db.collection("publicProfiles").doc(uid).delete();
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      await db
        .collection("publicProfiles")
        .doc(uid)
        .set(publicPayload(after.data()!), { merge: true });
    } catch (err) {
      console.error(`[onUserWrittenPublicProfile] uid=${uid}:`, err);
    }
  },
);

/** Any signed-in user can refresh THEIR OWN public profile mirror. */
export const ensureMyPublicProfile = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Signed in required.");
  }
  const uid = request.auth.uid;
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "User not found.");
  }
  await db
    .collection("publicProfiles")
    .doc(uid)
    .set(publicPayload(snap.data()!), { merge: true });
  return { success: true };
});

/** Admin one-time backfill for existing users. */
export const backfillPublicProfiles = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Signed in required.");
    }
    const role = await getCallerRole(request.auth.uid);
    if (role !== "admin" && role !== "superAdmin") {
      throw new HttpsError("permission-denied", "Admin only.");
    }

    const usersSnap = await db.collection("users").get();
    let written = 0;
    let batch = db.batch();
    let ops = 0;

    for (const docSnap of usersSnap.docs) {
      batch.set(
        db.collection("publicProfiles").doc(docSnap.id),
        publicPayload(docSnap.data()),
        { merge: true },
      );
      ops++;
      written++;
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();

    return { success: true, written };
  },
);
