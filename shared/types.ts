export interface Order {
  id: string;
  title: string;
  subtitle: string;
  host_id: string | null;
  locked: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  guest_name: string;
  dish: string;
  price: number | null;
  notes: string;
  created_at: string;
}

export type OrderWithItems = Order & { items: OrderItem[] };
