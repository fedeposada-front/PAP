export interface Shop {
  id: string;
  name: string;
  category: string;
  image: string;
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
}
