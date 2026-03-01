import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import type {
  ContactMessage,
  ContactStatus,
  FeedbackMessage,
  FeedbackStatus,
} from "@/pages/Admin/ContactUs/contact-feedback-data";
import {
  fetchContactMessages,
  fetchContactMessage,
  updateContactStatus,
  fetchFeedbackMessages,
  fetchFeedbackMessage,
  updateFeedbackStatus,
} from "@/service/contactFeedback/contactFeedbackService";
import { useAuth } from "@/store/AuthContext/AuthContext";

interface ContactFeedbackContextType {
  // Contact
  contacts: ContactMessage[];
  contactLoading: boolean;
  contactError: string | null;
  contactNewCount: number;
  refreshContacts: () => Promise<void>;
  getContact: (id: string) => Promise<ContactMessage | null>;
  changeContactStatus: (id: string, status: ContactStatus) => Promise<void>;

  // Feedback
  feedbacks: FeedbackMessage[];
  feedbackLoading: boolean;
  feedbackError: string | null;
  feedbackNewCount: number;
  refreshFeedbacks: () => Promise<void>;
  getFeedback: (id: string) => Promise<FeedbackMessage | null>;
  changeFeedbackStatus: (id: string, status: FeedbackStatus) => Promise<void>;
}

const ContactFeedbackContext = createContext<
  ContactFeedbackContextType | undefined
>(undefined);

export const useContactFeedback = () => {
  const ctx = useContext(ContactFeedbackContext);
  if (!ctx)
    throw new Error(
      "useContactFeedback must be used within ContactFeedbackProvider",
    );
  return ctx;
};

export const ContactFeedbackProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { user, role, loading: authLoading } = useAuth();

  // ── Contact state ──────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [contactLoading, setContactLoading] = useState(true);
  const [contactError, setContactError] = useState<string | null>(null);

  // ── Feedback state ─────────────────────────────────────────────────────────
  const [feedbacks, setFeedbacks] = useState<FeedbackMessage[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const isAdmin = role === "admin" || role === "superAdmin";

  // ── Derived badge counts ────────────────────────────────────────────────────
  const contactNewCount = contacts.filter((c) => c.status === "new").length;
  const feedbackNewCount = feedbacks.filter((f) => f.status === "new").length;

  // ── Refresh contacts ───────────────────────────────────────────────────────
  const refreshContacts = useCallback(async () => {
    setContactLoading(true);
    setContactError(null);
    try {
      const data = await fetchContactMessages();
      setContacts(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load contact messages";
      setContactError(msg);
      toast.error(msg);
    } finally {
      setContactLoading(false);
    }
  }, []);

  // ── Refresh feedbacks ──────────────────────────────────────────────────────
  const refreshFeedbacks = useCallback(async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      const data = await fetchFeedbackMessages();
      setFeedbacks(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load feedback messages";
      setFeedbackError(msg);
      toast.error(msg);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  // ── Load on auth ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      setContactLoading(false);
      setFeedbackLoading(false);
      return;
    }
    refreshContacts();
    refreshFeedbacks();
  }, [authLoading, user, isAdmin, refreshContacts, refreshFeedbacks]);

  // ── Get single contact ─────────────────────────────────────────────────────
  const getContact = useCallback(async (id: string) => {
    try {
      return await fetchContactMessage(id);
    } catch {
      toast.error("Failed to fetch contact message");
      return null;
    }
  }, []);

  // ── Change contact status ──────────────────────────────────────────────────
  const changeContactStatus = useCallback(
    async (id: string, status: ContactStatus) => {
      try {
        await updateContactStatus(id, status);
        setContacts((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, status, updatedAt: new Date() } : c,
          ),
        );
        toast.success(`Marked as ${status}`);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update status");
        throw err;
      }
    },
    [],
  );

  // ── Get single feedback ────────────────────────────────────────────────────
  const getFeedback = useCallback(async (id: string) => {
    try {
      return await fetchFeedbackMessage(id);
    } catch {
      toast.error("Failed to fetch feedback");
      return null;
    }
  }, []);

  // ── Change feedback status ─────────────────────────────────────────────────
  const changeFeedbackStatus = useCallback(
    async (id: string, status: FeedbackStatus) => {
      try {
        await updateFeedbackStatus(id, status);
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status, updatedAt: new Date() } : f,
          ),
        );
        toast.success(`Marked as ${status}`);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update status");
        throw err;
      }
    },
    [],
  );

  return (
    <ContactFeedbackContext.Provider
      value={{
        contacts,
        contactLoading,
        contactError,
        contactNewCount,
        refreshContacts,
        getContact,
        changeContactStatus,
        feedbacks,
        feedbackLoading,
        feedbackError,
        feedbackNewCount,
        refreshFeedbacks,
        getFeedback,
        changeFeedbackStatus,
      }}
    >
      {children}
    </ContactFeedbackContext.Provider>
  );
};
