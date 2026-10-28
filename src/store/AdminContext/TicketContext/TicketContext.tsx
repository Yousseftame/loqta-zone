import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
} from "@/pages/Admin/Tickets/ticket-data";
import {
  fetchTicket,
  updateTicketStatus,
  updateTicketPriority,
  updateTicketAdminNote,
  deleteTicket,
} from "@/service/tickets/ticketService";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { usePermissions } from "@/permissions/usePermissions";
import { isPermissionDenied } from "@/lib/permissionErrors";

const COLLECTION = "auctionSupportTickets";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketContextType {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;
  openCount: number;
  refreshTickets: () => Promise<void>;
  getTicket: (id: string) => Promise<SupportTicket | null>;
  changeTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  changeTicketPriority: (id: string, priority: TicketPriority) => Promise<void>;
  saveAdminNote: (id: string, note: string) => Promise<void>;
  removeTicket: (id: string) => Promise<void>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be used within TicketProvider");
  return ctx;
};

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
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const { user, role, loading: authLoading } = useAuth();
  const { can, loading: permLoading } = usePermissions();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "superAdmin";
  const canRead =
    role === "superAdmin" || (!permLoading && can("tickets", "read"));

  // Derived badge count — updates instantly when tickets array changes
  const openCount = tickets.filter((t) => t.status === "open").length;

  // ── Real-time listener (onSnapshot) ─────────────────────────────────────────
  useEffect(() => {
    if (authLoading || permLoading) return;
    if (!user || !isAdmin || !canRead) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => docToTicket(d.id, d.data()));
        setTickets(data);
        setLoading(false);
      },
      (err) => {
        setTickets([]);
        if (isPermissionDenied(err)) {
          setError(null);
        } else {
          const msg = err?.message ?? "Failed to load tickets";
          setError(msg);
          toast.error(msg);
        }
        setLoading(false);
      },
    );

    return () => unsub();
  }, [authLoading, permLoading, user, isAdmin, canRead]);

  // ── refreshTickets (manual, kept for API compat) ──────────────────────────
  const refreshTickets = useCallback(async () => {
    // onSnapshot handles live updates; this is a no-op kept for API compat
  }, []);

  // ── Get single ────────────────────────────────────────────────────────────
  const getTicket = useCallback(async (id: string) => {
    try {
      return await fetchTicket(id);
    } catch {
      toast.error("Failed to fetch ticket");
      return null;
    }
  }, []);

  // ── Change status ─────────────────────────────────────────────────────────
  const changeTicketStatus = useCallback(
    async (id: string, status: TicketStatus) => {
      try {
        await updateTicketStatus(id, status);
        // Optimistic update (onSnapshot will also sync)
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status, updatedAt: new Date() } : t,
          ),
        );
        toast.success(`Ticket marked as ${status}`);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update status");
        throw err;
      }
    },
    [],
  );

  // ── Change priority ───────────────────────────────────────────────────────
  const changeTicketPriority = useCallback(
    async (id: string, priority: TicketPriority) => {
      try {
        await updateTicketPriority(id, priority);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, priority, updatedAt: new Date() } : t,
          ),
        );
        toast.success(`Priority set to ${priority}`);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update priority");
        throw err;
      }
    },
    [],
  );

  // ── Save admin note ───────────────────────────────────────────────────────
  const saveAdminNote = useCallback(async (id: string, note: string) => {
    try {
      await updateTicketAdminNote(id, note);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, adminNote: note, updatedAt: new Date() } : t,
        ),
      );
      toast.success("Admin note saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save note");
      throw err;
    }
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const removeTicket = useCallback(async (id: string) => {
    try {
      await deleteTicket(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      toast.success("Ticket deleted");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete ticket");
      throw err;
    }
  }, []);

  return (
    <TicketContext.Provider
      value={{
        tickets,
        loading,
        error,
        openCount,
        refreshTickets,
        getTicket,
        changeTicketStatus,
        changeTicketPriority,
        saveAdminNote,
        removeTicket,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};
