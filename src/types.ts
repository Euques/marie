export type AppRoute = 'home' | 'casal' | 'presentes' | 'login' | 'noiva' | 'superadmin';

export interface GuestAuthSession {
  name: string;
  email: string;
  provider: 'google' | 'email';
}

export type GiftCategory = 
  | 'Cozinha'
  | 'Mesa e Banho'
  | 'Eletrodomésticos'
  | 'Servir e Decoração'
  | 'Organização e Limpeza'
  | 'Mimos e Outros';

export interface EventInfo {
  id?: string;
  brideName: string;
  groomName: string;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  googleMapsUrl?: string;
  pixKey: string;
  pixName: string;
  pixCity?: string;
  welcomeMessage?: string;
  description?: string;
  coverImage?: string;
  adminPassword?: string;
  adminEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoupleProfile {
  id: string;
  eventInfo: EventInfo;
  gifts: Gift[];
  guests: Guest[];
  createdAt?: string;
  updatedAt?: string;
}

export type RsvpStatus = 'confirmed' | 'declined' | 'pending';

export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companions: number; // Number of additional guests (e.g., +1, family)
  status: RsvpStatus;
  dietaryNotes?: string;
  message?: string;
  updatedAt: string;
}

export interface Gift {
  id: string;
  name: string;
  category: GiftCategory;
  description?: string;
  priceRange?: string;
  suggestedUrl?: string;
  imageUrl?: string;
  isClaimed: boolean;
  claimedByGuestName?: string;
  claimedByGuestEmail?: string;
  claimedByGuestPhone?: string;
  claimedAt?: string;
  notes?: string;
  isCustom?: boolean;
}

export interface AppData {
  eventInfo: EventInfo;
  guests: Guest[];
  gifts: Gift[];
}
