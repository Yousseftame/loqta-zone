/**
 * Live paymentAccounts collection for Finance UI.
 */

import { useEffect, useState, useCallback } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import {
  docToAccount,
  fetchPaymentAccounts,
  type PaymentAccount,
} from "@/service/finance/paymentAccounts";

export type { PaymentAccount } from "@/service/finance/paymentAccounts";
export {
  getDefaultAccountIdForMethod,
  getActiveAccounts,
  accountMatchesMethod,
  computeAccountBalance,
  computeUnassignedForMethod,
  computeReconciliation,
  accountNameById,
  validateAccountBalance,
  buildMethodDisplay,
  methodFromAccountId,
} from "@/service/finance/paymentAccounts";

export function usePaymentAccounts() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await fetchPaymentAccounts();
    setAccounts(list);
    return list;
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, "paymentAccounts"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAccounts(
          snap.docs.map((d) =>
            docToAccount(d.id, d.data() as Record<string, unknown>),
          ),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return { accounts, loading, refresh };
}
