export type Product = {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  cost: number;
  price: number;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
};

export type MovementType = "entrada" | "salida" | "ajuste";

export type InventoryMovement = {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  note: string | null;
  sale_id: string | null;
  created_at: string;
};

export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta";

export type Sale = {
  id: string;
  sold_at: string;
  total: number;
  note: string | null;
  payment_method: PaymentMethod;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
};

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  created_at: string;
};

export type Settings = {
  id: number;
  business_name: string;
  currency: string;
  default_min_stock: number;
  product_categories: string[];
  expense_categories: string[];
};
