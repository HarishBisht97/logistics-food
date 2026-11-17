export type MenuItem = {
  id: number;
  cat: string;
  sub: string;
  name: string;
  price: number;
  veg: boolean;
};

export type QtyMap = Record<string, number>;

export type ListName = "items" | "extras";

export type OrderDraft = {
  members: string[];
  items: QtyMap;
  extras: QtyMap;
  note: string;
  placed: boolean;
  placedAt: number | null;
};

export type StoredOrder = OrderDraft & { id: string };

export type VegFilter = "all" | "veg" | "nonveg";

export type OrderMode = "main" | "extra";
