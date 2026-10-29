import { MatchCard, type MatchPerson } from "./MatchCard";
const people: MatchPerson[] = [
  {
    id: "1",
    name: "Betty",
    age: 22,
    city: "Nairobi, Kenya",
    match: 95,
    online: true,
    photo:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: "2",
    name: "Amina",
    age: 25,
    city: "Mombasa, Kenya",
    match: 91,
    photo:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: "3",
    name: "Njeri",
    age: 27,
    city: "Nakuru, Kenya",
    match: 88,
    online: true,
    photo:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: "4",
    name: "Zuri",
    age: 24,
    city: "Watamu, Kenya",
    match: 84,
    photo:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: "5",
    name: "Wanjiku",
    age: 28,
    city: "Kisumu, Kenya",
    match: 81,
    online: true,
    photo:
      "https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: "6",
    name: "Aisha",
    age: 26,
    city: "Malindi, Kenya",
    match: 79,
    photo:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=700&q=85",
  },
];
export function MatchGrid() {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8e8e93]">
            Good chemistry starts here
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-white">
            Matches <span className="text-[#ff4a6e]">15</span>
          </h2>
        </div>
        <span className="text-xs text-[#8e8e93]">Top picks</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {people.map((person) => (
          <MatchCard key={person.id} person={person} />
        ))}
      </div>
    </section>
  );
}
