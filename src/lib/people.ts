import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";

export type Person = {
  id: string;
  name: string;
  age: number;
  area: string;
  band: string;
  photo: string;
  gallery: string[];
  bio: string;
  interests: string[];
  online: boolean;
  match: number;
  intent: "Dating" | "Friends";
  map: { x: number; y: number };
};

export const people: Person[] = [
  {
    id: "wanjiru",
    name: "Wanjiru",
    age: 26,
    area: "Kilimani, Nairobi",
    band: "Within 5 km",
    photo: p1,
    gallery: [p1, p3, p2, p4],
    bio: "Matatu art lover, weekend hiker, and always hunting the best nyama choma.",
    interests: ["Hiking", "Afrobeats", "Coffee", "Photography"],
    online: true,
    match: 92,
    intent: "Dating",
    map: { x: 32, y: 38 },
  },
  {
    id: "brian",
    name: "Brian",
    age: 29,
    area: "Westlands, Nairobi",
    band: "Within 10 km",
    photo: p2,
    gallery: [p2, p4, p1, p3],
    bio: "Software dev by day, rooftop sunsets by evening. Teach me Sheng slang.",
    interests: ["Tech", "Football", "Cooking"],
    online: false,
    match: 81,
    intent: "Friends",
    map: { x: 64, y: 24 },
  },
  {
    id: "amani",
    name: "Amani",
    age: 24,
    area: "Karen, Nairobi",
    band: "Within 25 km",
    photo: p3,
    gallery: [p3, p1, p4, p2],
    bio: "Plant mum. Book club host. Looking for good conversation first.",
    interests: ["Books", "Plants", "Yoga", "Art"],
    online: true,
    match: 88,
    intent: "Dating",
    map: { x: 22, y: 70 },
  },
  {
    id: "kevo",
    name: "Kevo",
    age: 27,
    area: "CBD, Nairobi",
    band: "Within 5 km",
    photo: p4,
    gallery: [p4, p2, p3, p1],
    bio: "Always laughing. Gengetone playlists and late-night chapati runs.",
    interests: ["Music", "Basketball", "Street food"],
    online: true,
    match: 76,
    intent: "Dating",
    map: { x: 70, y: 60 },
  },
];

export const me: Person = {
  id: "me",
  name: "Shadrack",
  age: 28,
  area: "Nairobi",
  band: "You",
  photo: p2,
  gallery: [p2, p4],
  bio: "Tell people a little about yourself.",
  interests: ["Travel", "Music", "Football"],
  online: true,
  match: 100,
  intent: "Dating",
  map: { x: 50, y: 50 },
};

export const conversations = [
  { id: "wanjiru", last: "Haha sawa, Saturday at Karura then?", time: "2m", unread: 2 },
  { id: "amani", last: "Which book are you reading now?", time: "1h", unread: 0 },
  { id: "kevo", last: "That playlist was fire 🔥", time: "Yesterday", unread: 0 },
];

export const byId = (id: string) => (id === "me" ? me : people.find((p) => p.id === id));
export const DISTANCE_BANDS = [5, 10, 25, 50] as const;
