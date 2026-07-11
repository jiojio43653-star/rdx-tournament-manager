export interface Tournament {
  id: string;
  name: string;
  gameName: string;
  imageUrl: string;
  entryFee: number;
  prizePool: number;
  matchDate: string; // ISO string or timestamp
  matchTime: string;
  matchType: 'Solo' | 'Duo' | 'Squad';
  category?: 'Classic' | 'CS';
  totalSlots: number;
  joinedCount: number;
  rules: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Live';
  createdAt: number;
  isFree?: boolean;
  roomId?: string;
  roomPassword?: string;
  winnerId?: string;
  winnerName?: string;
}

export interface PlayerProfile {
  uid: string;
  name: string;
  email?: string;
  upiId: string;
  gameUid?: string;
  photoUrl: string;
  banned?: boolean;
  createdAt: number;
}

export interface JoinRequest {
  id: string;
  tournamentId: string;
  tournamentName: string;
  playerId: string;
  playerName: string;
  paymentProofUrl: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: number;
  type?: 'Join' | 'Claim';
  upiId?: string;
}

export interface RoomDetails {
  tournamentId: string;
  title: string;
  roomId: string;
  roomPassword: string;
  matchInstructions: string;
  updatedAt: number;
}

export interface Winner {
  id: string;
  tournamentId: string;
  tournamentName: string;
  playerName: string;
  photoUrl: string;
  prizeDetails: string;
  createdAt: number;
}

export interface AppMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  hidden: boolean;
  order: number;
}

export interface AppSettings {
  banners: string[]; // Legacy
  videos: string[]; // Legacy
  mediaGallery?: AppMediaItem[];
  news: string;
  adminUpiId: string;
  adminAuth?: {
    email?: string;
    password?: string;
  };
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    telegram?: string;
    whatsapp?: string;
    website?: string;
  };
  homeLinks?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    telegram?: string;
    whatsapp?: string;
    website?: string;
  };
  visibility?: Record<string, boolean>;
}
