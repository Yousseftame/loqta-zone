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
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  AuctionStatus,
} from "@/pages/Admin/Tickets/ticket-data";

const COLLECTION = "auctionSupportTickets";

// ─── Helper ───────────────────────────────────────────────────────────────────

function docToTicket(id: string, data: Record<string, any>): SupportTicket {
  return {
    id,
    auctionId:     data.auctionId     ?? "",
    auctionNumber: data.auctionNumber ?? 0,
    auctionStatus: data.auctionStatus ?? "upcoming",
    productId:     data.productId     ?? "",
    productName:   data.productName   ?? "",
    userId:        data.userId        ?? "",
    userName:      data.userName      ?? "",
    userEmail:     data.userEmail     ?? "",
    userPhone:     data.userPhone     ?? "",
    category:      data.category      ?? "other",
    subject:       data.subject       ?? "",
    description:   data.description   ?? "",
    deviceInfo:    data.deviceInfo    ?? "",
    screenshotUrl: data.screenshotUrl ?? "",
    status:        data.status        ?? "open",
    priority:      data.priority      ?? "medium",
    adminNote:     data.adminNote     ?? "",
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

// ─── Submit (user) ────────────────────────────────────────────────────────────

export async function submitTicket(data: {
  auctionId:     string;
  auctionNumber: number;
  auctionStatus: AuctionStatus;
  productId?:    string;
  productName?:  string;
  userId:        string;
  userName:      string;
  userEmail:     string;
  userPhone?:    string;
  category:      TicketCategory;
  priority:      TicketPriority;
  subject:       string;
  description:   string;
  deviceInfo?:   string;
}): Promise<string> {
  // Strip undefined optional fields — Firestore rejects undefined values
  const payload: Record<string, any> = {
    auctionId:     data.auctionId,
    auctionNumber: data.auctionNumber,
    auctionStatus: data.auctionStatus,
    productId:     data.productId  || "",
    productName:   data.productName || "",
    userId:        data.userId,
    userName:      data.userName,
    userEmail:     data.userEmail,
    userPhone:     data.userPhone  || "",
    category:      data.category,
    priority:      data.priority,
    subject:       data.subject,
    description:   data.description,
    deviceInfo:    data.deviceInfo || "",
    status:        "open",
    adminNote:     "",
    screenshotUrl: "",
    createdAt:     serverTimestamp(),
    updatedAt:     serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

// ─── Fetch All (admin) ────────────────────────────────────────────────────────

export async function fetchTickets(): Promise<SupportTicket[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTicket(d.id, d.data()));
}

// ─── Fetch by auction (admin) ─────────────────────────────────────────────────

export async function fetchTicketsByAuction(
  auctionId: string,
): Promise<SupportTicket[]> {
  const q = query(
    collection(db, COLLECTION),
    where("auctionId", "==", auctionId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTicket(d.id, d.data()));
}

// ─── Fetch by user ────────────────────────────────────────────────────────────

export async function fetchTicketsByUser(
  userId: string,
): Promise<SupportTicket[]> {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToTicket(d.id, d.data()));
}

// ─── Fetch One ────────────────────────────────────────────────────────────────

export async function fetchTicket(
  id: string,
): Promise<SupportTicket | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return docToTicket(snap.id, snap.data());
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// ─── Update Priority ──────────────────────────────────────────────────────────

export async function updateTicketPriority(
  id: string,
  priority: TicketPriority,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    priority,
    updatedAt: serverTimestamp(),
  });
}

// ─── Update Admin Note ────────────────────────────────────────────────────────

export async function updateTicketAdminNote(
  id: string,
  adminNote: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    adminNote,
    updatedAt: serverTimestamp(),
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTicket(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// ─── Open Count (for badge) ───────────────────────────────────────────────────

export async function fetchOpenTicketCount(): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "open"),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
