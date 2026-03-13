export interface Shop {
  id: string;
  slug?: string;
  name: string;
  category: string;
  image: string;
  bannerImage?: string;
  rating: number;
  reviewCount: number;
  distance: string;
  address: string;
  city: string;
  isOpen: boolean;
  pickupToday: boolean;
  openSunday: boolean;
  delivery: boolean;
  hours: string;
  todayHours?: string;
  openingHours?: Record<string, { open?: boolean; openTime?: string; closeTime?: string }>;
  phone: string;
  description: string;
  lat: number;
  lng: number;
}

export interface Product {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  price: number;
  image: string;
  category: string;
  availableToday: boolean;
  stock: number;
  description: string;
  pickup: boolean;
  delivery: boolean;
  addedAt: string;
  isPublished?: boolean;
  soldCount?: number;
  status?: "published" | "draft" | "disabled";
}
