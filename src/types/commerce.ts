export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  cans_per_case: number;
  price_cents: number;
  currency: "cad";
  active: boolean;
  is_placeholder: boolean;
}
export interface OrderItem {
  product_id: string;
  name: string;
  price_cents: number;
  quantity: number;
  cans_per_case: number;
  is_placeholder: boolean;
}
export interface Order {
  id: string;
  checkout_key: string;
  items: OrderItem[];
  cases: number;
  total_cents: number;
  currency: "cad";
  payment_status: "pending" | "paid" | "expired" | "refunded";
  fulfillment_status: "received" | "processing" | "shipped" | "delivered";
  tracking_number: string;
  tracking_url: string;
  carrier: string;
  created_at: string;
  shipping_details: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  } | null;
  customers?: { email: string };
}
export interface Profile {
  full_name: string;
  company: string;
  phone: string;
  email: string;
}
export interface DashboardData {
  products: Product[];
  orders: Order[];
  profile: Profile;
}
export const money = (cents: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
    cents / 100,
  );
