/**
 * src/pages/Admin/Purchases/purchases-data.ts
 *
 * Types and constants for the Purchase Orders module.
 * A Purchase links a Supplier → Product with quantity, unit cost, status, etc.
 * Zero coupling to existing Finance/Voucher/Auction modules.
 */

export type PurchaseStatus = "pending" | "received" | "cancelled";

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;       // denormalized for display
  productId: string;
  productTitle: string;       // denormalized for display (EN)
  quantity: number;
  unitCost: number;           // cost per unit in EGP
  totalCost: number;          // quantity * unitCost
  status: PurchaseStatus;
  notes: string;
  purchaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface PurchaseFormData {
  supplierId: string;
  productId: string;
  quantity: string;
  unitCost: string;
  status: PurchaseStatus;
  notes: string;
  purchaseDate: string;       // ISO date string "YYYY-MM-DD"
}

export const DEFAULT_PURCHASE_FORM: PurchaseFormData = {
  supplierId: "",
  productId: "",
  quantity: "",
  unitCost: "",
  status: "pending",
  notes: "",
  purchaseDate: new Date().toISOString().split("T")[0],
};

export const STATUS_CONFIG: Record<
  PurchaseStatus,
  { label: string; bg: string; color: string; border: string; emoji: string }
> = {
  pending:   { label: "Pending",   bg: "#FEF3C7", color: "#92400E", border: "#FCD34D", emoji: "⏳" },
  received:  { label: "Received",  bg: "#DCFCE7", color: "#14532D", border: "#86EFAC", emoji: "✅" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#7F1D1D", border: "#FCA5A5", emoji: "❌" },
};