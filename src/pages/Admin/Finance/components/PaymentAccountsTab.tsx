/**
 * src/pages/Admin/Finance/components/PaymentAccountsTab.tsx
 *
 * ─── What this does ───────────────────────────────────────────────────────────
 * Manages named payment accounts (e.g. "CIB Bank", "Vodafone Cash").
 * Each account has a method: "cash" | "bank" which maps to the EXISTING
 * cash/bank transaction aggregation. Zero changes to existing logic.
 *
 * ─── Integration with existing finance system ─────────────────────────────────
 * - Each account's balance = sum of transactions with matching accountId
 * - Transactions WITHOUT an accountId continue to work exactly as before
 * - The existing cashBalance / bankBalance totals are unaffected
 * - Accounts are stored in Firestore: paymentAccounts/{id}
 *
 * ─── New optional field on transactions ──────────────────────────────────────
 * transactions/{id}.accountId?: string   — links a transaction to an account
 * This field is OPTIONAL. All existing transactions without it still work.
 *
 * ─── Zero breaking changes ────────────────────────────────────────────────────
 * - finance-data.ts: unchanged
 * - finance.ts Cloud Function: unchanged
 * - useFinance.ts: unchanged
 * - FinancePage.tsx: add <PaymentAccountsTab /> as a new section only
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { colors } from "../../Products/products-data";
import type { Transaction } from "../finance-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountMethod = "cash" | "bank";
type AccountStatus = "active" | "archived";

interface PaymentAccount {
  id: string;
  name: string;
  method: AccountMethod;
  accountNumber?: string;
  notes?: string;
  isDefault: boolean;
  status: AccountStatus;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface AccountFormData {
  name: string;
  method: AccountMethod;
  accountNumber: string;
  notes: string;
  isDefault: boolean;
  color: string;
  icon: string;
}

const EMPTY_FORM: AccountFormData = {
  name: "",
  method: "bank",
  accountNumber: "",
  notes: "",
  isDefault: false,
  color: "#2A4863",
  icon: "🏦",
};

const ICONS = ["🏦", "💵", "💳", "🏧", "📱", "💰", "🏪", "🔐", "🏛️", "💎"];

const PRESET_COLORS = [
  "#2A4863",
  "#3D6A8A",
  "#059669",
  "#DC2626",
  "#7C3AED",
  "#D97706",
  "#0EA5E9",
  "#0D9488",
];

// ─── Firestore helpers ────────────────────────────────────────────────────────

function docToAccount(id: string, data: Record<string, any>): PaymentAccount {
  return {
    id,
    name: data.name ?? "",
    method: data.method ?? "bank",
    accountNumber: data.accountNumber ?? "",
    notes: data.notes ?? "",
    isDefault: data.isDefault ?? false,
    status: data.status ?? "active",
    color: data.color ?? "#2A4863",
    icon: data.icon ?? "🏦",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    updatedAt:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate()
        : new Date(),
    createdBy: data.createdBy ?? "",
  };
}

async function fetchAccounts(): Promise<PaymentAccount[]> {
  const q = query(
    collection(db, "paymentAccounts"),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToAccount(d.id, d.data()));
}

// ─── Account balance computation ──────────────────────────────────────────────
// Reads accountId from transactions (optional field). Transactions without
// accountId are counted in "Unassigned" totals only — never in account totals.

function computeAccountBalance(
  accountId: string,
  transactions: Transaction[],
): { balance: number; income: number; expenses: number; txCount: number } {
  let income = 0,
    expenses = 0;
  let txCount = 0;

  for (const tx of transactions) {
    // Only count transactions explicitly linked to this account
    if ((tx as any).accountId !== accountId) continue;
    txCount++;
    if (tx.type === "income" || tx.type === "owner_return") {
      income += tx.amount;
    } else if (tx.type === "expense" || tx.type === "owner_withdrawal") {
      expenses += tx.amount;
    }
    // transfers are balance-neutral — not counted
  }

  return { balance: income - expenses, income, expenses, txCount };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[];
  loading?: boolean;
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  balance,
  income,
  expenses,
  txCount,
  onEdit,
  onArchive,
  onSetDefault,
}: {
  account: PaymentAccount;
  balance: number;
  income: number;
  expenses: number;
  txCount: number;
  onEdit: (a: PaymentAccount) => void;
  onArchive: (a: PaymentAccount) => void;
  onSetDefault: (a: PaymentAccount) => void;
}) {
  const isNeg = balance < 0;
  const isArchived = account.status === "archived";

  const cardBg = `linear-gradient(135deg, ${account.color}ee 0%, ${account.color}cc 100%)`;
  const baseShadow = `0 12px 40px ${account.color}40, 0 0 0 1px rgba(255,255,255,0.1)`;
  const hoverShadow = `0 20px 60px ${account.color}55, 0 0 0 1px rgba(255,255,255,0.15)`;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        background: isArchived ? "#94A3B820" : cardBg,
        padding: "22px 24px 20px",
        overflow: "hidden",
        boxShadow: isArchived ? "0 2px 8px rgba(0,0,0,0.08)" : baseShadow,
        opacity: isArchived ? 0.6 : 1,
        transition: "transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s",
        cursor: "default",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        border: isArchived ? `1px solid #E2E8F0` : "none",
      }}
      onMouseEnter={(e) => {
        if (isArchived) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-3px) scale(1.01)";
        el.style.boxShadow = hoverShadow;
      }}
      onMouseLeave={(e) => {
        if (isArchived) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = baseShadow;
      }}
    >
      {/* Glass sheen */}
      {!isArchived && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Decorative circle */}
      {!isArchived && (
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Top row ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: isArchived ? "#E2E8F0" : "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
              backdropFilter: "blur(4px)",
            }}
          >
            {account.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: isArchived ? "#64748B" : "#fff",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.2,
              }}
            >
              {account.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 3,
              }}
            >
              <span
                style={{
                  background: isArchived ? "#E2E8F0" : "rgba(255,255,255,0.2)",
                  color: isArchived ? "#64748B" : "rgba(255,255,255,0.9)",
                  borderRadius: 5,
                  padding: "1px 7px",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {account.method === "cash" ? "💵 Cash" : "🏦 Bank"}
              </span>
              {account.isDefault && (
                <span
                  style={{
                    background: isArchived
                      ? "#FEF3C7"
                      : "rgba(255,255,255,0.25)",
                    color: isArchived ? "#D97706" : "#fff",
                    borderRadius: 5,
                    padding: "1px 7px",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  DEFAULT
                </span>
              )}
              {isArchived && (
                <span
                  style={{
                    background: "#FEE2E2",
                    color: "#DC2626",
                    borderRadius: 5,
                    padding: "1px 7px",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                  }}
                >
                  ARCHIVED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {!account.isDefault && !isArchived && (
            <button
              onClick={() => onSetDefault(account)}
              title="Set as default"
              style={actionBtnStyle(isArchived)}
            >
              ⭐
            </button>
          )}
          <button
            onClick={() => onEdit(account)}
            title="Edit"
            style={actionBtnStyle(isArchived)}
          >
            ✏️
          </button>
          <button
            onClick={() => onArchive(account)}
            title={isArchived ? "Restore" : "Archive"}
            style={actionBtnStyle(isArchived)}
          >
            {isArchived ? "♻️" : "📦"}
          </button>
        </div>
      </div>

      {/* ── Account number ── */}
      {account.accountNumber && (
        <div
          style={{
            fontSize: "0.75rem",
            color: isArchived ? "#94A3B8" : "rgba(255,255,255,0.6)",
            fontFamily: "monospace",
            marginTop: 8,
            letterSpacing: "0.12em",
          }}
        >
          {account.accountNumber.length > 4
            ? `•••• ${account.accountNumber.slice(-4)}`
            : account.accountNumber}
        </div>
      )}

      {/* ── Balance ── */}
      <div style={{ position: "relative", marginTop: 12 }}>
        <div
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: isArchived ? "#94A3B8" : "rgba(255,255,255,0.5)",
            marginBottom: 4,
          }}
        >
          Running Balance
        </div>
        <div
          style={{
            fontSize: "clamp(1.3rem, 2.5vw, 1.6rem)",
            fontWeight: 800,
            color: isArchived
              ? isNeg
                ? "#DC2626"
                : "#1E293B"
              : isNeg
                ? "#FCA5A5"
                : "#fff",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {isNeg ? "−" : "+"}
          {Math.abs(balance).toLocaleString("en-EG")} EGP
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ position: "relative", marginTop: 14 }}>
        <div
          style={{
            height: 2,
            borderRadius: 999,
            background: isArchived ? "#E2E8F0" : "rgba(255,255,255,0.25)",
            marginBottom: 10,
          }}
        />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <MiniStat
            label="In"
            value={income}
            color={isArchived ? "#059669" : "rgba(255,255,255,0.8)"}
          />
          <MiniStat
            label="Out"
            value={expenses}
            color={isArchived ? "#DC2626" : "rgba(255,255,255,0.6)"}
          />
          <MiniStat
            label="Txns"
            value={txCount}
            color={isArchived ? "#64748B" : "rgba(255,255,255,0.5)"}
            isCount
          />
        </div>
      </div>
    </div>
  );
}

function actionBtnStyle(isArchived: boolean) {
  return {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: `1px solid ${isArchived ? "#E2E8F0" : "rgba(255,255,255,0.2)"}`,
    background: isArchived ? "#F8FAFC" : "rgba(255,255,255,0.12)",
    backdropFilter: "blur(4px)",
    cursor: "pointer",
    fontSize: "0.75rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    flexShrink: 0,
  } as React.CSSProperties;
}

function MiniStat({
  label,
  value,
  color,
  isCount,
}: {
  label: string;
  value: number;
  color: string;
  isCount?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span
        style={{
          fontSize: "0.58rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color,
          fontFamily: "system-ui",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color,
          fontFamily: "system-ui",
        }}
      >
        {isCount ? value : `${value.toLocaleString("en-EG")} EGP`}
      </span>
    </div>
  );
}

// ─── Unassigned Balance Card ──────────────────────────────────────────────────

function UnassignedCard({
  method,
  balance,
  txCount,
}: {
  method: AccountMethod;
  balance: number;
  txCount: number;
}) {
  const isNeg = balance < 0;
  return (
    <div
      style={{
        borderRadius: 18,
        background: "#F8FAFC",
        border: "2px dashed #CBD5E1",
        padding: "22px 24px 20px",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: 0.85,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "#E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {method === "cash" ? "💵" : "🏦"}
        </div>
        <div>
          <div
            style={{ fontSize: "0.9rem", fontWeight: 700, color: "#64748B" }}
          >
            Unassigned ({method === "cash" ? "Cash" : "Bank"})
          </div>
          <div style={{ fontSize: "0.65rem", color: "#94A3B8", marginTop: 2 }}>
            Transactions without an account
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#94A3B8",
            marginBottom: 4,
          }}
        >
          Balance
        </div>
        <div
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: isNeg ? "#DC2626" : "#1E293B",
            fontFamily: "system-ui",
          }}
        >
          {isNeg ? "−" : "+"}
          {Math.abs(balance).toLocaleString("en-EG")} EGP
        </div>
      </div>

      <div>
        <div
          style={{
            height: 2,
            borderRadius: 999,
            background: "#E2E8F0",
            marginBottom: 8,
          }}
        />
        <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 500 }}>
          {txCount} unlinked transaction{txCount !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}

// ─── Account Form Modal ───────────────────────────────────────────────────────

function AccountModal({
  open,
  saving,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  saving: boolean;
  editing: PaymentAccount | null;
  onClose: () => void;
  onSave: (data: AccountFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<AccountFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (editing) {
        setForm({
          name: editing.name,
          method: editing.method,
          accountNumber: editing.accountNumber ?? "",
          notes: editing.notes ?? "",
          isDefault: editing.isDefault,
          color: editing.color,
          icon: editing.icon,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, editing]);

  const set = <K extends keyof AccountFormData>(k: K, v: AccountFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Account name is required.");
      return;
    }
    try {
      await onSave(form);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save account.");
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(5px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#fff",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.8)",
            width: "100%",
            maxWidth: 480,
            maxHeight: "90vh",
            overflowY: "auto",
            animation: "am-in 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: `1px solid ${colors.border}`,
              background: colors.primaryBg,
            }}
          >
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: colors.primaryDark,
              }}
            >
              {editing ? "✏️ Edit Account" : "➕ New Payment Account"}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: colors.textMuted,
                marginTop: 4,
              }}
            >
              {editing
                ? "Update account details"
                : "Add a bank account or cash wallet"}
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  fontSize: "0.82rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Preview card */}
            <div
              style={{
                borderRadius: 14,
                background: `linear-gradient(135deg, ${form.color}ee, ${form.color}cc)`,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: `0 8px 24px ${form.color}40`,
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {form.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  {form.name || "Account Name"}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.7)",
                    marginTop: 2,
                  }}
                >
                  {form.method === "cash"
                    ? "💵 Cash wallet"
                    : "🏦 Bank account"}
                  {form.accountNumber
                    ? ` · ****${form.accountNumber.slice(-4)}`
                    : ""}
                </div>
              </div>
            </div>

            {/* Name */}
            <FieldGroup label="Account Name *">
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. CIB Bank, Vodafone Cash"
                style={inputStyle}
              />
            </FieldGroup>

            {/* Method */}
            <FieldGroup label="Type">
              <div style={{ display: "flex", gap: 8 }}>
                {(["bank", "cash"] as AccountMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => set("method", m)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 10,
                      border: `2px solid ${form.method === m ? colors.primary : colors.border}`,
                      background: form.method === m ? colors.primaryBg : "#fff",
                      color:
                        form.method === m
                          ? colors.primary
                          : colors.textSecondary,
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {m === "bank" ? "🏦 Bank" : "💵 Cash"}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Account number */}
            <FieldGroup label="Account / Identifier (optional)">
              <input
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                placeholder="Last 4 digits, phone number, etc."
                style={inputStyle}
              />
            </FieldGroup>

            {/* Icon */}
            <FieldGroup label="Icon">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => set("icon", ic)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      border: `2px solid ${form.icon === ic ? colors.primary : colors.border}`,
                      background: form.icon === ic ? colors.primaryBg : "#fff",
                      fontSize: 18,
                      cursor: "pointer",
                      transition: "all 0.1s",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Color */}
            <FieldGroup label="Card Color">
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("color", c)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: c,
                      border: `3px solid ${form.color === c ? "#fff" : "transparent"}`,
                      outline: form.color === c ? `2px solid ${c}` : "none",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Custom color"
                />
              </div>
            </FieldGroup>

            {/* Notes */}
            <FieldGroup label="Notes (optional)">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                placeholder="Any internal notes about this account..."
                style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
              />
            </FieldGroup>

            {/* Default toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 10,
                border: `1.5px solid ${form.isDefault ? colors.primary : colors.border}`,
                background: form.isDefault ? colors.primaryBg : "#FAFAFA",
                transition: "all 0.15s",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: colors.primaryDark,
                  }}
                >
                  Set as Default
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: colors.textMuted,
                    marginTop: 2,
                  }}
                >
                  Used as the pre-selected account when adding transactions
                </div>
              </div>
              <button
                onClick={() => set("isDefault", !form.isDefault)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: form.isDefault ? colors.primary : "#CBD5E1",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: form.isDefault ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: `1px solid ${colors.border}`,
              display: "flex",
              gap: 10,
            }}
          >
            <button onClick={onClose} disabled={saving} style={cancelBtnStyle}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                ...saveBtnStyle,
                background: form.color,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : editing ? "Update Account" : "Add Account"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes am-in { from { opacity:0; transform:translateY(16px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }`}</style>
    </>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: colors.textMuted,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1.5px solid #E2E8F0`,
  background: "#F8FAFC",
  fontSize: "0.85rem",
  color: "#1E293B",
  outline: "none",
  transition: "border-color 0.15s",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "11px 0",
  borderRadius: 10,
  border: `1.5px solid #E2E8F0`,
  background: "#F8FAFC",
  color: "#475569",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "system-ui",
};

const saveBtnStyle: React.CSSProperties = {
  flex: 2,
  padding: "11px 0",
  borderRadius: 10,
  border: "none",
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "system-ui",
  transition: "opacity 0.15s",
};

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  account,
  onConfirm,
  onCancel,
}: {
  account: PaymentAccount | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!account) return null;
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#fff",
            borderRadius: 16,
            padding: 28,
            maxWidth: 380,
            width: "100%",
            boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
            animation: "am-in 0.2s ease forwards",
          }}
        >
          <div
            style={{ fontSize: "2rem", marginBottom: 12, textAlign: "center" }}
          >
            📦
          </div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1rem",
              color: "#0F172A",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Archive "{account.name}"?
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "#64748B",
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            The account will be hidden but its transaction history is preserved.
            You can restore it at any time.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} style={cancelBtnStyle}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                ...saveBtnStyle,
                background: "#DC2626",
                flex: 1,
              }}
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({
  accounts,
  transactions,
}: {
  accounts: PaymentAccount[];
  transactions: Transaction[];
}) {
  const active = accounts.filter((a) => a.status === "active");

  const totals = useMemo(() => {
    let totalCash = 0,
      totalBank = 0;
    for (const acc of active) {
      const { balance } = computeAccountBalance(acc.id, transactions);
      if (acc.method === "cash") totalCash += balance;
      else totalBank += balance;
    }
    return { totalCash, totalBank, total: totalCash + totalBank };
  }, [active, transactions]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {[
        {
          label: "Total Tracked (Cash)",
          value: totals.totalCash,
          color: "#2A4863",
          icon: "💵",
        },
        {
          label: "Total Tracked (Bank)",
          value: totals.totalBank,
          color: "#059669",
          icon: "🏦",
        },
        {
          label: "Combined Balance",
          value: totals.total,
          color: "#7C3AED",
          icon: "💰",
        },
        {
          label: "Active Accounts",
          value: active.length,
          color: "#D97706",
          icon: "🗂️",
          isCount: true,
        },
      ].map((item) => (
        <div
          key={item.label}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: "14px 16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {item.label}
            </span>
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: (item as any).isCount
                ? item.color
                : item.value < 0
                  ? "#DC2626"
                  : item.color,
              fontFamily: "system-ui",
            }}
          >
            {(item as any).isCount
              ? item.value
              : `${item.value < 0 ? "−" : ""}${Math.abs(item.value).toLocaleString("en-EG")} EGP`}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentAccountsTab({
  transactions,
  loading = false,
}: Props) {
  const { user } = useAuth();

  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentAccount | null>(null);
  const [archiving, setArchiving] = useState<PaymentAccount | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Load accounts from Firestore
  const load = useCallback(async () => {
    setFetching(true);
    try {
      const list = await fetchAccounts();
      setAccounts(list);
    } catch (err) {
      console.error("[PaymentAccounts] fetch failed:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Compute per-account balances (from linked transactions only)
  const accountBalances = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeAccountBalance>> = {};
    for (const acc of accounts) {
      map[acc.id] = computeAccountBalance(acc.id, transactions);
    }
    return map;
  }, [accounts, transactions]);

  // Compute unassigned balances (transactions without accountId per method)
  const unassigned = useMemo(() => {
    const linkedIds = new Set(
      transactions.map((tx) => (tx as any).accountId).filter(Boolean),
    );
    let cashBalance = 0,
      bankBalance = 0;
    let cashCount = 0,
      bankCount = 0;

    for (const tx of transactions) {
      if ((tx as any).accountId) continue; // linked — skip
      if (tx.type === "income" || tx.type === "owner_return") {
        if (tx.method === "cash") {
          cashBalance += tx.amount;
          cashCount++;
        } else {
          bankBalance += tx.amount;
          bankCount++;
        }
      } else if (tx.type === "expense" || tx.type === "owner_withdrawal") {
        if (tx.method === "cash") {
          cashBalance -= tx.amount;
          cashCount++;
        } else {
          bankBalance -= tx.amount;
          bankCount++;
        }
      }
    }
    return { cashBalance, bankBalance, cashCount, bankCount };
  }, [transactions]);

  // CRUD handlers
  const handleSave = async (data: AccountFormData) => {
    setSaving(true);
    try {
      if (editing) {
        // If setting as default, clear other defaults of same method first
        if (data.isDefault) {
          const sameMethod = accounts.filter(
            (a) =>
              a.method === data.method && a.isDefault && a.id !== editing.id,
          );
          for (const a of sameMethod) {
            await updateDoc(doc(db, "paymentAccounts", a.id), {
              isDefault: false,
            });
          }
        }
        await updateDoc(doc(db, "paymentAccounts", editing.id), {
          name: data.name.trim(),
          method: data.method,
          accountNumber: data.accountNumber.trim(),
          notes: data.notes.trim(),
          isDefault: data.isDefault,
          color: data.color,
          icon: data.icon,
          updatedAt: serverTimestamp(),
        });
      } else {
        // New account
        if (data.isDefault) {
          const sameMethod = accounts.filter(
            (a) => a.method === data.method && a.isDefault,
          );
          for (const a of sameMethod) {
            await updateDoc(doc(db, "paymentAccounts", a.id), {
              isDefault: false,
            });
          }
        }
        await addDoc(collection(db, "paymentAccounts"), {
          name: data.name.trim(),
          method: data.method,
          accountNumber: data.accountNumber.trim(),
          notes: data.notes.trim(),
          isDefault: data.isDefault,
          status: "active",
          color: data.color,
          icon: data.icon,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user?.uid ?? "",
        });
      }
      await load();
      setModalOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiving) return;
    const newStatus = archiving.status === "archived" ? "active" : "archived";
    await updateDoc(doc(db, "paymentAccounts", archiving.id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    setArchiving(null);
    await load();
  };

  const handleSetDefault = async (account: PaymentAccount) => {
    // Clear existing defaults of same method
    const sameMethod = accounts.filter(
      (a) => a.method === account.method && a.isDefault,
    );
    for (const a of sameMethod) {
      await updateDoc(doc(db, "paymentAccounts", a.id), { isDefault: false });
    }
    await updateDoc(doc(db, "paymentAccounts", account.id), {
      isDefault: true,
    });
    await load();
  };

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const archivedAccounts = accounts.filter((a) => a.status === "archived");

  return (
    <div>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 3,
              height: 18,
              background: colors.primary,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              color: colors.textMuted,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Payment Accounts
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: colors.textMuted,
              opacity: 0.6,
            }}
          >
            · Named bank accounts &amp; cash wallets
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {archivedAccounts.length > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: showArchived ? "#FEF3C7" : "#fff",
                color: showArchived ? "#D97706" : colors.textSecondary,
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {showArchived
                ? "Hide Archived"
                : `Show Archived (${archivedAccounts.length})`}
            </button>
          )}
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: colors.primary,
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ＋ Add Account
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {!fetching && activeAccounts.length > 0 && (
        <SummaryBar accounts={activeAccounts} transactions={transactions} />
      )}

      {/* Empty state */}
      {!fetching && accounts.length === 0 && (
        <div
          style={{
            padding: "56px 24px",
            textAlign: "center",
            background: "#F8FAFC",
            borderRadius: 16,
            border: `2px dashed ${colors.border}`,
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏦</div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: colors.primaryDark,
              marginBottom: 8,
            }}
          >
            No Payment Accounts Yet
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: colors.textMuted,
              lineHeight: 1.6,
              maxWidth: 380,
              margin: "0 auto 20px",
            }}
          >
            Add your bank accounts and cash wallets to track running balances
            per account. Existing transactions work exactly as before — this is
            purely additive.
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            style={{
              ...saveBtnStyle,
              background: colors.primary,
              padding: "10px 24px",
              flex: "none",
            }}
          >
            Add Your First Account
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {fetching && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                borderRadius: 18,
                minHeight: 200,
                background: "linear-gradient(135deg, #E2E8F0, #F1F5F9)",
                animation: "pa-pulse 1.4s ease infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Active accounts grid */}
      {!fetching && activeAccounts.length > 0 && (
        <>
          {/* Cash accounts */}
          {activeAccounts.filter((a) => a.method === "cash").length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: colors.textMuted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#2A4863",
                    display: "inline-block",
                  }}
                />
                Cash Wallets
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {activeAccounts
                  .filter((a) => a.method === "cash")
                  .map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      {...accountBalances[acc.id]}
                      onEdit={(a) => {
                        setEditing(a);
                        setModalOpen(true);
                      }}
                      onArchive={(a) => setArchiving(a)}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                {/* Unassigned cash card */}
                {unassigned.cashCount > 0 && (
                  <UnassignedCard
                    method="cash"
                    balance={unassigned.cashBalance}
                    txCount={unassigned.cashCount}
                  />
                )}
              </div>
            </div>
          )}

          {/* Bank accounts */}
          {activeAccounts.filter((a) => a.method === "bank").length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: colors.textMuted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#059669",
                    display: "inline-block",
                  }}
                />
                Bank Accounts
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {activeAccounts
                  .filter((a) => a.method === "bank")
                  .map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      {...accountBalances[acc.id]}
                      onEdit={(a) => {
                        setEditing(a);
                        setModalOpen(true);
                      }}
                      onArchive={(a) => setArchiving(a)}
                      onSetDefault={handleSetDefault}
                    />
                  ))}
                {/* Unassigned bank card */}
                {unassigned.bankCount > 0 && (
                  <UnassignedCard
                    method="bank"
                    balance={unassigned.bankBalance}
                    txCount={unassigned.bankCount}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Archived accounts */}
      {!fetching && showArchived && archivedAccounts.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: colors.textMuted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#94A3B8",
                display: "inline-block",
              }}
            />
            Archived Accounts
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {archivedAccounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                {...accountBalances[acc.id]}
                onEdit={(a) => {
                  setEditing(a);
                  setModalOpen(true);
                }}
                onArchive={(a) => setArchiving(a)}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        </div>
      )}

      {/* Note about integration */}
      {!fetching && activeAccounts.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            borderRadius: 10,
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            fontSize: "0.75rem",
            color: "#1E40AF",
            lineHeight: 1.6,
          }}
        >
          💡 <strong>Tip:</strong> To link a transaction to an account, add the{" "}
          <code
            style={{
              background: "#DBEAFE",
              padding: "1px 5px",
              borderRadius: 4,
            }}
          >
            accountId
          </code>{" "}
          field when creating transactions. Unlinked transactions continue to
          appear in your total Cash/Bank balances as before — this feature is
          fully backwards-compatible.
        </div>
      )}

      {/* Modals */}
      <AccountModal
        open={modalOpen}
        saving={saving}
        editing={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
      <DeleteConfirm
        account={archiving}
        onConfirm={handleArchive}
        onCancel={() => setArchiving(null)}
      />

      <style>{`
        @keyframes pa-pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }
      `}</style>
    </div>
  );
}
