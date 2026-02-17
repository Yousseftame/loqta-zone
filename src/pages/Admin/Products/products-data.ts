export type ProductStatus = "active" | "inactive" | "draft";
export type ProductCategory =
  | "Electronics"
  | "Clothing"
  | "Furniture"
  | "Accessories"
  | "Sports";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number;
  stock: number;
  status: ProductStatus;
  rating: number;
  description: string;
  createdAt: string;
}

export const STATIC_PRODUCTS: Product[] = [
  { id: "P001", name: "Wireless Noise-Cancelling Headphones", sku: "WNC-2024-BLK", category: "Electronics", price: 249.99, stock: 84, status: "active", rating: 4.8, description: "Premium over-ear headphones with 30-hour battery life.", createdAt: "2024-01-15" },
  { id: "P002", name: "Minimalist Leather Wallet", sku: "LW-SLIM-BRN", category: "Accessories", price: 59.99, stock: 210, status: "active", rating: 4.6, description: "Slim RFID-blocking wallet with 6 card slots.", createdAt: "2024-02-03" },
  { id: "P003", name: "Ergonomic Office Chair", sku: "CHAIR-ERG-GRY", category: "Furniture", price: 499.00, stock: 22, status: "active", rating: 4.7, description: "Lumbar support with adjustable armrests and 4D headrest.", createdAt: "2024-02-18" },
  { id: "P004", name: "Premium Running Shoes", sku: "RUN-PRO-42", category: "Sports", price: 189.99, stock: 0, status: "inactive", rating: 4.5, description: "Lightweight breathable mesh with carbon fibre plate.", createdAt: "2024-03-01" },
  { id: "P005", name: "Classic Oxford Shirt", sku: "OX-WHT-M", category: "Clothing", price: 79.99, stock: 145, status: "active", rating: 4.3, description: "100% Egyptian cotton with button-down collar.", createdAt: "2024-03-22" },
  { id: "P006", name: "Smart Home Hub", sku: "SMHUB-V3-WHT", category: "Electronics", price: 139.99, stock: 6, status: "draft", rating: 4.2, description: "Controls up to 200 smart devices, voice & app enabled.", createdAt: "2024-04-05" },
  { id: "P007", name: "Yoga Mat Pro", sku: "YM-PRO-6MM", category: "Sports", price: 44.99, stock: 320, status: "active", rating: 4.9, description: "Anti-slip surface, 6 mm thickness, eco-friendly TPE.", createdAt: "2024-04-19" },
  { id: "P008", name: "Wooden Bookshelf 5-Tier", sku: "BKSH-5T-OAK", category: "Furniture", price: 259.00, stock: 14, status: "active", rating: 4.4, description: "Solid oak with metal frame, holds up to 80 kg per shelf.", createdAt: "2024-05-02" },
  { id: "P009", name: "Slim-Fit Chino Pants", sku: "CHINO-NVY-32", category: "Clothing", price: 64.99, stock: 0, status: "inactive", rating: 4.1, description: "Stretch cotton blend for all-day comfort.", createdAt: "2024-05-14" },
  { id: "P010", name: "Stainless Steel Water Bottle", sku: "WB-SS-750ML", category: "Accessories", price: 34.99, stock: 540, status: "active", rating: 4.7, description: "Triple-wall insulation, keeps cold 48 h, hot 24 h.", createdAt: "2024-05-28" },
  { id: "P011", name: "4K Ultra HD Monitor 27\"", sku: "MON-4K-27-BLK", category: "Electronics", price: 699.99, stock: 11, status: "draft", rating: 4.6, description: "IPS panel, 144 Hz, HDR600, 99% sRGB coverage.", createdAt: "2024-06-10" },
  { id: "P012", name: "Denim Jacket Classic", sku: "DJ-CLX-INDIG-L", category: "Clothing", price: 119.99, stock: 57, status: "active", rating: 4.5, description: "Stonewashed denim with vintage distressed finish.", createdAt: "2024-06-25" },
];

export const CATEGORIES: ProductCategory[] = [
  "Electronics", "Clothing", "Furniture", "Accessories", "Sports",
];

export const STATUSES: ProductStatus[] = ["active", "inactive", "draft"];

export const colors = {
  primary: "#2A4863",
  primaryLight: "#2A4863",
  primaryDark: "#1E40AF",
  primaryBg: "#EFF6FF",
  primaryRing: "#DBEAFE",
  success: "#22C55E",
  successBg: "#DCFCE7",
  error: "#EF4444",
  errorBg: "#FEE2E2",
  warning: "#F97316",
  warningBg: "#FFEDD5",
  accent: "#F59E0B",
  accentBg: "#FEF3C7",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#F8FAFC",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
};

export const getCategoryColor = (cat: ProductCategory) => {
  const map: Record<ProductCategory, { bg: string; text: string }> = {
    Electronics:  { bg: "#EFF6FF", text: "#2A4863" },
    Clothing:     { bg: "#F3E8FF", text: "#7C3AED" },
    Furniture:    { bg: "#FEF3C7", text: "#92400E" },
    Accessories:  { bg: "#FCE7F3", text: "#BE185D" },
    Sports:       { bg: "#E0F2FE", text: "#0EA5E9" },
  };
  return map[cat];
};

export const getStatusStyle = (status: ProductStatus) => {
  switch (status) {
    case "active":   return { bg: "#DCFCE7", color: "#22C55E" };
    case "inactive": return { bg: "#FEE2E2", color: "#EF4444" };
    case "draft":    return { bg: "#FFEDD5", color: "#F97316" };
  }
};

export const avatarPalette = [
  "#2A4863","#7C3AED","#0EA5E9","#10B981",
  "#F59E0B","#EF4444","#EC4899","#8B5CF6",
];
export const getAvatarColor = (name: string) =>
  avatarPalette[name.charCodeAt(0) % avatarPalette.length];