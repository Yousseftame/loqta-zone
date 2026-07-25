import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { getAuth } from "firebase/auth";
import { auditLogger } from "@/service/audit/auditLogger";
import type {
  ContactMessage,
  ContactStatus,
  FeedbackMessage,
  FeedbackStatus,
} from "@/pages/Admin/ContactUs/contact-feedback-data";

const CONTACT_COLLECTION  = "contactMessages";
const FEEDBACK_COLLECTION = "feedbackMessages";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToContact(id: string, data: Record<string, any>): ContactMessage {
  return {
    id,
    name:    data.name    ?? "",
    email:   data.email   ?? "",
    phone:   data.phone   ?? "",
    subject: data.subject ?? "",
    message: data.message ?? "",
    status:  data.status  ?? "new",
    userId:  data.userId  ?? null,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

function docToFeedback(id: string, data: Record<string, any>): FeedbackMessage {
  return {
    id,
    name:      data.name      ?? "",
    email:     data.email     ?? "",
    phone:     data.phone     ?? "",
    category:  data.category  ?? "",
    rating:    data.rating    ?? 0,
    title:     data.title     ?? "",
    feedback:  data.feedback  ?? "",
    recommend: data.recommend ?? "",
    status:    data.status    ?? "new",
    userId:    data.userId    ?? null,
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

// ─── Resolve the currently signed-in user (if any) ───────────────────────────
// contactFeedbackService runs in a plain service file (no React hooks), so we
// read the current user directly from the Firebase Auth SDK instead of useAuth().

function getCurrentUser() {
  try {
    return getAuth().currentUser;
  } catch {
    return null;
  }
}

// ─── CONTACT — Submit (public) ────────────────────────────────────────────────

export async function submitContactMessage(data: {
  name:    string;
  email:   string;
  phone:   string;
  subject: string;
  message: string;
}): Promise<void> {
  const currentUser = getCurrentUser();

  // Logged-in users: use registered profile phone (same as feedback).
  // Guests: use the phone they entered on the form.
  let phone = data.phone;
  if (currentUser?.uid) {
    try {
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (userSnap.exists()) {
        phone = (userSnap.data().phone as string) ?? "";
      }
    } catch {
      // Leave phone as provided / empty — don't block contact submit.
    }
  }

  await addDoc(collection(db, CONTACT_COLLECTION), {
    ...data,
    phone,
    // Only logged-in users get status-change notifications (guests have no userId).
    userId:    currentUser?.uid ?? null,
    status:    "new",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 🔥 AUDIT LOG — fire-and-forget after the write succeeds
  auditLogger.contactSubmitted(
    data.name,
    data.email,
    data.subject,
    currentUser?.uid ?? null,
    currentUser ? "user" : "guest",
  );
}

// ─── CONTACT — Fetch All (admin) ──────────────────────────────────────────────

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  const q = query(
    collection(db, CONTACT_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToContact(d.id, d.data()));
}

// ─── CONTACT — Fetch One ──────────────────────────────────────────────────────

export async function fetchContactMessage(id: string): Promise<ContactMessage | null> {
  const snap = await getDoc(doc(db, CONTACT_COLLECTION, id));
  if (!snap.exists()) return null;
  return docToContact(snap.id, snap.data());
}

// ─── CONTACT — Update Status ──────────────────────────────────────────────────

export async function updateContactStatus(id: string, status: ContactStatus): Promise<void> {
  await updateDoc(doc(db, CONTACT_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── CONTACT — Delete ─────────────────────────────────────────────────────────

export async function deleteContactMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, CONTACT_COLLECTION, id));
}

// ─── CONTACT — New Count ──────────────────────────────────────────────────────

export async function fetchContactNewCount(): Promise<number> {
  const q = query(
    collection(db, CONTACT_COLLECTION),
    where("status", "==", "new"),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

// ─── FEEDBACK — Submit (public) ───────────────────────────────────────────────

export async function submitFeedbackMessage(data: {
  name:      string;
  email:     string;
  category:  string;
  rating:    number;
  title:     string;
  feedback:  string;
  recommend: string;
}): Promise<void> {
  // Resolve phone from the registered user profile (same source as email/name).
  const currentUser = getCurrentUser();
  let phone = "";
  if (currentUser?.uid) {
    try {
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (userSnap.exists()) {
        phone = (userSnap.data().phone as string) ?? "";
      }
    } catch {
      // Leave phone empty if profile lookup fails — don't block feedback submit.
    }
  }

  await addDoc(collection(db, FEEDBACK_COLLECTION), {
    ...data,
    phone,
    // Feedback form is login-only; always attach uid when available.
    userId:    currentUser?.uid ?? null,
    status:    "new",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 🔥 AUDIT LOG — fire-and-forget after the write succeeds
  auditLogger.feedbackSubmitted(
    data.name,
    data.email,
    data.category,
    data.rating,
    currentUser?.uid ?? null,
    currentUser ? "user" : "guest",
  );
}

// ─── FEEDBACK — Fetch All (admin) ─────────────────────────────────────────────

export async function fetchFeedbackMessages(): Promise<FeedbackMessage[]> {
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToFeedback(d.id, d.data()));
}

// ─── FEEDBACK — Fetch One ─────────────────────────────────────────────────────

export async function fetchFeedbackMessage(id: string): Promise<FeedbackMessage | null> {
  const snap = await getDoc(doc(db, FEEDBACK_COLLECTION, id));
  if (!snap.exists()) return null;
  return docToFeedback(snap.id, snap.data());
}

// ─── FEEDBACK — Update Status ─────────────────────────────────────────────────

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── FEEDBACK — Delete ────────────────────────────────────────────────────────

export async function deleteFeedbackMessage(id: string): Promise<void> {
  await deleteDoc(doc(db, FEEDBACK_COLLECTION, id));
}

// ─── FEEDBACK — New Count ─────────────────────────────────────────────────────

export async function fetchFeedbackNewCount(): Promise<number> {
  const q = query(
    collection(db, FEEDBACK_COLLECTION),
    where("status", "==", "new"),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}