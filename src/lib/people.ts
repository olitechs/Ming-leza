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
  bio: string;
  interests: string[];
  online: boolean;
};

export const people: Person[] = [
  { id: "wanjiru", name: "Wanjiru", age: 26, area: "Kilimani, Nairobi", band: "Within 5 km", photo: p1, bio: "Matatu art lover, weekend hiker, and always hunting the best nyama choma.", interests: ["Hiking", "Afrobeats", "Coffee", "Photography"], online: true },
  { id: "brian", name: "Brian", age: 29, area: "Westlands, Nairobi", band: "Within 10 km", photo: p2, bio: "Software dev by day, rooftop sunsets by evening. Teach me Sheng slang.", interests: ["Tech", "Football", "Cooking"], online: false },
  { id: "amani", name: "Amani", age: 24, area: "Karen, Nairobi", band: "Within 25 km", photo: p3, bio: "Plant mum. Book club host. Looking for good conversation first.", interests: ["Books", "Plants", "Yoga", "Art"], online: true },
  { id: "kevo", name: "Kevo", age: 27, area: "CBD, Nairobi", band: "Within 5 km", photo: p4, bio: "Always laughing. Gengetone playlists and late-night chapati runs.", interests: ["Music", "Basketball", "Street food"], online: true },
];

export const conversations = [
  { id: "wanjiru", last: "Haha sawa, Saturday at Karura then?", time: "2m", unread: 2 },
  { id: "amani", last: "Which book are you reading now?", time: "1h", unread: 0 },
  { id: "kevo", last: "That playlist was fire 🔥", time: "Yesterday", unread: 0 },
];

export const byId = (id: string) => people.find((p) => p.id === id)!;
