// ─── Supplier types ───────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  notes: string;
}

export const DEFAULT_SUPPLIER_FORM: SupplierFormData = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  isActive: true,
  notes: "",
};