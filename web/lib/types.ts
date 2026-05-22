export type ContentCategory =
  | "history"
  | "architecture"
  | "culture"
  | "fauna"
  | "flora"
  | "geo"
  | "lore"
  | "funfacts"
  | "food"
  | "photography"
  | "practical";

export type GroupProfile = {
  mobility: "full" | "seniors" | "wheelchair" | "stroller";
  ages: "adults" | "school" | "toddlers" | "infants";
  pace: "relaxed" | "moderate" | "energetic";
};

export type TourStop = {
  id: string;
  order: number;
  name: string;
  duration: string;
  lat: number;
  lng: number;
  tags: string[];
  summary: string;
  narration: Partial<Record<ContentCategory, string>>;
  accessibilityNote?: string;
  practicalInfo?: {
    openingHours?: string;
    admissionFee?: string;
    nearestTransport?: string;
  };
};

export type Tour = {
  id: string;
  citySlug: string;
  cityName: string;
  title: string;
  tagline: string;
  duration: string;
  distance: string;
  stopCount: number;
  tier: "free" | "pro";
  categories: ContentCategory[];
  coverColor: string;
  stops: TourStop[];
};

export type City = {
  slug: string;
  name: string;
  country: string;
  emoji: string;
  tourCount: number;
  coverColor: string;
};
