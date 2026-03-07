import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import type { Participant } from "@/pages/Admin/Participants/Participants-data";
import {
  fetchParticipantsForAuction,
  deleteParticipant,
} from "@/service/Participantservice/Participantservice";

interface ParticipantContextType {
  participants: Participant[];
  loading: boolean;
  error: string | null;
  currentAuctionId: string | null;
  loadParticipants: (auctionId: string) => Promise<void>;
  removeParticipant: (
    auctionId: string,
    participantId: string,
  ) => Promise<void>;
  clearParticipants: () => void;
}

const ParticipantContext = createContext<ParticipantContextType | undefined>(
  undefined,
);

export const useParticipants = () => {
  const ctx = useContext(ParticipantContext);
  if (!ctx)
    throw new Error("useParticipants must be used within ParticipantProvider");
  return ctx;
};

export const ParticipantProvider = ({ children }: { children: ReactNode }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAuctionId, setCurrentAuctionId] = useState<string | null>(null);

  const loadParticipants = useCallback(async (auctionId: string) => {
    setLoading(true);
    setError(null);
    setCurrentAuctionId(auctionId);
    try {
      const data = await fetchParticipantsForAuction(auctionId);
      setParticipants(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load participants";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeParticipant = useCallback(
    async (auctionId: string, participantId: string) => {
      try {
        await deleteParticipant(auctionId, participantId);
        setParticipants((prev) => prev.filter((p) => p.id !== participantId));
        toast.success("Participant removed");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to remove participant");
        throw err;
      }
    },
    [],
  );

  const clearParticipants = useCallback(() => {
    setParticipants([]);
    setCurrentAuctionId(null);
    setError(null);
  }, []);

  return (
    <ParticipantContext.Provider
      value={{
        participants,
        loading,
        error,
        currentAuctionId,
        loadParticipants,
        removeParticipant,
        clearParticipants,
      }}
    >
      {children}
    </ParticipantContext.Provider>
  );
};
