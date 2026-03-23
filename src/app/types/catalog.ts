export interface ShopTeamMember {
  name: string;
  role: string;
  imageUrl?: string;
}

export interface Shop {
  id: string;
  slug?: string;
  name: string;
  postalCode?: string;
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
  story?: string;
  teamMembers?: ShopTeamMember[];
  lat: number;
  lng: number;
}

export interface Product {
  id: string;
  shopId: string;
  collectionId?: string;
  shopName: string;
  shopSlug?: string;
  title: string;
  price: number;
  image: string;
  imageUrls?: string[];
  category: string;
  categories?: string[];
  availableToday: boolean;
  stock: number;
  description: string;
  features?: string;
  composition?: string;
  returnConditions?: string;
  color?: string;
  colors?: string[];
  pickup: boolean;
  delivery: boolean;
  addedAt: string;
  isPublished?: boolean;
  soldCount?: number;
  status?: "published" | "draft" | "disabled";
}
