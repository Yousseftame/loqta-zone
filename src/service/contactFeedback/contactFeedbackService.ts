import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  ContactMessage,
  ContactStatus,
  FeedbackMessage,
  FeedbackStatus,
} from "@/pages/Admin/ContactUs/contact-feedback-data";

const CONTACT_COLLECTION = "contactMessages";
const FEEDBACK_COLLECTION = "feedbackMessages";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docToContact(id: string, data: Record<string, any>): ContactMessage {
  return {
    id,
    name: data.name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    subject: data.subject ?? "",
    message: data.message ?? "",
    status: data.status ?? "new",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
  };
}

function docToFeedback(id: string, data: Record<string, any>): FeedbackMessage {
  return {
    id,
    name: data.name ?? "",
    email: data.email ?? "",
    category: data.category ?? "",
    rating: data.rating ?? 0,
    title: data.title ?? "",
    feedback: data.feedback ?? "",
    recommend: data.recommend ?? "",
    status: data.status ?? "new",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
  };
}

// ─── CONTACT — Submit (public) ────────────────────────────────────────────────

export async function submitContactMessage(data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<void> {
  await addDoc(collection(db, CONTACT_COLLECTION), {
    ...data,
    status: "new",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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

export async function fetchContactMessage(
  id: string,
): Promise<ContactMessage | null> {
  const snap = await getDoc(doc(db, CONTACT_COLLECTION, id));
  if (!snap.exists()) return null;
  return docToContact(snap.id, snap.data());
}

// ─── CONTACT — Update Status ──────────────────────────────────────────────────

export async function updateContactStatus(
  id: string,
  status: ContactStatus,
): Promise<void> {
  await updateDoc(doc(db, CONTACT_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
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
  name: string;
  email: string;
  category: string;
  rating: number;
  title: string;
  feedback: string;
  recommend: string;
}): Promise<void> {
  await addDoc(collection(db, FEEDBACK_COLLECTION), {
    ...data,
    status: "new",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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

export async function fetchFeedbackMessage(
  id: string,
): Promise<FeedbackMessage | null> {
  const snap = await getDoc(doc(db, FEEDBACK_COLLECTION, id));
  if (!snap.exists()) return null;
  return docToFeedback(snap.id, snap.data());
}

// ─── FEEDBACK — Update Status ─────────────────────────────────────────────────

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<void> {
  await updateDoc(doc(db, FEEDBACK_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
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