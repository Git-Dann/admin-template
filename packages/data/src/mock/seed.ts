export const FIRST = ["Priya", "Tom", "Aisha", "Jack", "Sofia", "Liam", "Mia", "Noah", "Ella", "Oscar", "Grace", "Leo", "Amara", "Finn", "Zara", "Callum", "Isla", "Reuben", "Niamh", "Kwame", "Hannah", "Rory", "Yusuf", "Freya", "Dev", "Chloe", "Sean", "Imogen", "Arjun", "Bethan", "Kieran", "Maya"];
export const LAST = ["Kaur", "Ellis", "Bello", "Murphy", "Rossi", "Walsh", "Chen", "Patel", "Byrne", "Green", "Hall", "Wright", "Okafor", "Doyle", "Ahmed", "Fraser", "Jones", "Clarke", "O'Brien", "Mensah", "Evans", "McKenzie", "Hussain", "Taylor", "Shah", "Morgan", "Kelly", "Price", "Nair", "Hughes", "Burke", "Lewis"];

export const COUNTRIES: Array<{ code: string; country: string; weight: number }> = [
  { code: "GB", country: "United Kingdom", weight: 62 },
  { code: "IE", country: "Ireland", weight: 11 },
  { code: "US", country: "United States", weight: 9 },
  { code: "AU", country: "Australia", weight: 6 },
  { code: "CA", country: "Canada", weight: 4 },
  { code: "ES", country: "Spain", weight: 3 },
  { code: "AE", country: "United Arab Emirates", weight: 3 },
  { code: "NZ", country: "New Zealand", weight: 2 },
];

export type Flavour = "streaming" | "golf" | "generic";

export const FLAVOURS = {
  streaming: {
    collectionKind: "Series",
    itemNoun: "Episode",
    collections: ["Loaded Live", "The Sunday Sesh", "Lads on Tour", "Kitchen Nightmares UK", "Pub Quiz Royale", "Fellas Unfiltered", "Late Night Loaded", "The Group Chat", "Away Days", "Five-a-Side Legends", "Stand-Up Saturdays", "Road Trip Rejects"],
    tags: ["Comedy", "Sport", "Reality", "Talk", "Live", "Food", "Travel"],
    plans: ["Monthly", "Annual", "Trial"],
    metricNoun: "subscribers",
    revenueBase: 26000,
    themes: [
      { name: "Black Friday 2026", status: "live", start: -6, end: 20, key: "blackfriday" },
      { name: "Christmas 2026", status: "scheduled", start: 19, end: 45, key: "christmas" },
      { name: "Halloween 2026", status: "ended", start: -40, end: -11, key: "halloween" },
      { name: "Valentine's 2027", status: "draft", start: 94, end: 99, key: "valentines" },
      { name: "Summer Takeover", status: "ended", start: -140, end: -80, key: "summer" },
    ],
  },
  golf: {
    collectionKind: "Group",
    itemNoun: "Round",
    collections: ["Sunday Swingers", "Beginners' Academy", "Ladies' Medal", "Twilight Nine", "Junior Squad", "Seniors' Stableford", "Short Game Clinic", "Society Away Days", "Club Championship", "Winter League", "Pairs Matchplay", "Range Rats"],
    tags: ["Social", "Competition", "Coaching", "Juniors", "Seniors", "Ladies", "Matchplay"],
    plans: ["Pro", "Free", "Club"],
    metricNoun: "members",
    revenueBase: 14000,
    themes: [
      { name: "The Open Week", status: "ended", start: -120, end: -113, key: "open" },
      { name: "Winter Golf", status: "live", start: -12, end: 90, key: "winter" },
      { name: "Masters Sunday", status: "draft", start: 150, end: 154, key: "masters" },
    ],
  },
} as const;

export function flavourOf(f: Flavour) {
  return f === "golf" ? FLAVOURS.golf : FLAVOURS.streaming;
}
