export type Genre = 'Pop' | 'Rock' | 'Hip-Hop' | 'R&B' | 'Electronic' | 'Latin';

export type Song = {
  id: string;
  title: string;
  artist: string;
  tokens: number;
  albumArt: string;
  genre: Genre;
};

export type QueueSong = Song & {
  waitMinutes: number;
  requestedBy?: string;
};

export const browseSongs: Song[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop',
  },
  {
    id: '2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
  },
  {
    id: '3',
    title: 'Peaches',
    artist: 'Justin Bieber',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&h=100&fit=crop',
  },
  {
    id: '4',
    title: 'Save Your Tears',
    artist: 'The Weeknd',
    tokens: 1,
    genre: 'R&B',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop',
  },
  {
    id: '5',
    title: 'Kiss Me More',
    artist: 'Doja Cat',
    tokens: 1,
    genre: 'R&B',
    albumArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop',
  },
  {
    id: '6',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    tokens: 1,
    genre: 'Rock',
    albumArt: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop',
  },
  {
    id: '7',
    title: 'Watermelon Sugar',
    artist: 'Harry Styles',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop',
  },
  {
    id: '8',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    tokens: 1,
    genre: 'Hip-Hop',
    albumArt: 'https://images.unsplash.com/photo-1571974599782-87624638275e?w=100&h=100&fit=crop',
  },
  {
    id: '9',
    title: 'Montero',
    artist: 'Lil Nas X',
    tokens: 1,
    genre: 'Hip-Hop',
    albumArt: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&h=100&fit=crop',
  },
  {
    id: '10',
    title: 'drivers license',
    artist: 'Olivia Rodrigo',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop',
  },
  {
    id: '11',
    title: 'Bam Bam',
    artist: 'Camila Cabello',
    tokens: 1,
    genre: 'Latin',
    albumArt: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=100&h=100&fit=crop',
  },
  {
    id: '12',
    title: 'Con Calma',
    artist: 'Daddy Yankee',
    tokens: 1,
    genre: 'Latin',
    albumArt: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=100&h=100&fit=crop',
  },
  {
    id: '13',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    tokens: 1,
    genre: 'Rock',
    albumArt: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=100&h=100&fit=crop',
  },
  {
    id: '14',
    title: 'Essence',
    artist: 'Wizkid ft. Tems',
    tokens: 1,
    genre: 'R&B',
    albumArt: 'https://images.unsplash.com/photo-1617957718587-60a442884bee?w=100&h=100&fit=crop',
  },
  {
    id: '15',
    title: 'Midnight City',
    artist: 'M83',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=100&h=100&fit=crop',
  },
  {
    id: '16',
    title: 'Strobe',
    artist: 'deadmau5',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=100&h=100&fit=crop',
  },
];

export const nowPlaying: Song & { currentTime: string; totalTime: string; progress: number } = {
  id: '2',
  title: 'Levitating',
  artist: 'Dua Lipa',
  tokens: 1,
  genre: 'Pop',
  albumArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  currentTime: '2:14',
  totalTime: '3:23',
  progress: 66,
};

export const queueSongs: QueueSong[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop',
    waitMinutes: 3,
  },
  {
    id: '7',
    title: 'Watermelon Sugar',
    artist: 'Harry Styles',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop',
    waitMinutes: 7,
  },
  {
    id: '6',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    tokens: 1,
    genre: 'Rock',
    albumArt: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop',
    waitMinutes: 11,
  },
  {
    id: '4',
    title: 'Save Your Tears',
    artist: 'The Weeknd & Ariana Grande',
    tokens: 1,
    genre: 'R&B',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop',
    waitMinutes: 15,
  },
  {
    id: '8',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    tokens: 1,
    genre: 'Hip-Hop',
    albumArt: 'https://images.unsplash.com/photo-1571974599782-87624638275e?w=100&h=100&fit=crop',
    waitMinutes: 18,
  },
  {
    id: '5',
    title: 'Kiss Me More',
    artist: 'Doja Cat',
    tokens: 1,
    genre: 'R&B',
    albumArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop',
    waitMinutes: 22,
  },
  {
    id: '9',
    title: 'Montero',
    artist: 'Lil Nas X',
    tokens: 1,
    genre: 'Hip-Hop',
    albumArt: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&h=100&fit=crop',
    waitMinutes: 26,
  },
  {
    id: '3',
    title: 'Peaches',
    artist: 'Justin Bieber',
    tokens: 1,
    genre: 'Pop',
    albumArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&h=100&fit=crop',
    waitMinutes: 30,
  },
];

export type TokenPackage = {
  id: string;
  name: string;
  tokens: number;
  price: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
};

export const tokenPackages: TokenPackage[] = [
  {
    id: 'single',
    name: 'Single Token',
    tokens: 1,
    price: '50 ₺',
    icon: 'music_note',
    iconColor: 'text-primary',
    iconBg: 'bg-white/5',
    features: [{ text: '1 şarkı kuyruğa ekle', included: true }],
  },
  {
    id: 'bundle',
    name: 'Token Paketi',
    tokens: 5,
    price: '200 ₺',
    icon: 'local_fire_department',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/20',
    popular: true,
    features: [
      { text: '5 şarkı kuyruğa ekle', included: true },
      { text: '50 ₺ tasarruf', included: true },
    ],
  },
];

export type UserProfile = {
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  tokens: number;
  totalRequests: number;
  songsAdded: number;
  favoriteVenue: string;
  memberSince: string;
  isPremium: boolean;
  recentActivity: { songTitle: string; artist: string; venue: string; date: string }[];
};

export const mockUser: UserProfile = {
  username: 'username360',
  displayName: 'Mock User',
  email: 'tester@gmail.com',
  avatarUrl: '',
  tokens: 14,
  totalRequests: 47,
  songsAdded: 12,
  favoriteVenue: 'The Neon Lounge',
  memberSince: 'March 2024',
  isPremium: false,
  recentActivity: [
    { songTitle: 'Blinding Lights', artist: 'The Weeknd', venue: 'The Neon Lounge', date: 'Today' },
    { songTitle: 'Levitating', artist: 'Dua Lipa', venue: 'Skybar', date: 'Yesterday' },
    { songTitle: 'Good 4 U', artist: 'Olivia Rodrigo', venue: 'The Neon Lounge', date: 'Apr 14' },
    { songTitle: 'Stay', artist: 'The Kid LAROI', venue: 'Club Nova', date: 'Apr 12' },
    { songTitle: 'Montero', artist: 'Lil Nas X', venue: 'The Neon Lounge', date: 'Apr 10' },
  ],
};

export const trendingSongs: Song[] = [
  {
    id: 't1',
    title: 'Gecenin Ritmi',
    artist: 'DJ Kıvılcım',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1571974599782-87624638275e?w=100&h=100&fit=crop',
  },
  {
    id: 't2',
    title: 'Yıldızlar Altında',
    artist: 'DJ Kıvılcım',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&h=100&fit=crop',
  },
  {
    id: 't3',
    title: 'Ateşli Dans',
    artist: 'DJ Kıvılcım',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop',
  },
  {
    id: 't4',
    title: 'Gizemli Gece',
    artist: 'DJ Kıvılcım',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop',
  },
  {
    id: 't5',
    title: 'Sonsuz Yolculuk',
    artist: 'DJ Kıvılcım',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1619983081563-430f63602796?w=100&h=100&fit=crop',
  },
  {
    id: 't6',
    title: 'Neon Rüyalar',
    artist: 'DJ Kıvılcım',
    tokens: 1,
    genre: 'Electronic',
    albumArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop',
  },
];
