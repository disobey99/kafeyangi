export type DeliveryAppTab = "home" | "menu" | "cart" | "orders" | "profile";

export type DeliveryOrderType = "TAKEAWAY" | "DELIVERY";

export type DeliveryPromo = {
  id?: string;
  name: string;
  label: string;
  type?: "PERCENT" | "FIXED";
  value?: number;
  imageUrl?: string | null;
  productId?: string | null;
  slot?: number | null;
};

export type DeliveryCategory = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: DeliveryProduct[];
};

export type DeliveryProduct = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  imageUrl: string | null;
  menuTag?: string | null;
  isAvailable: boolean;
  modifierGroups?: {
    id: string;
    name: string;
    nameRu?: string | null;
    nameEn?: string | null;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: {
      id: string;
      name: string;
      nameRu?: string | null;
      nameEn?: string | null;
      priceDelta: number;
    }[];
  }[];
};

export type SavedDeliveryOrder = {
  id: string;
  orderNumber: number;
  createdAt: string;
};

export type DeliveryProfile = {
  name: string;
  phone: string;
  address: string;
  email?: string;
  lat?: number | null;
  lng?: number | null;
};
