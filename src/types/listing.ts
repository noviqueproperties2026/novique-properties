export interface Listing {
  id: string;
  name: string;
  state: string;
  city: string;
  lga: string;
  estate_name: string | null;
  area_of_land: string | null;
  price: number;
  structure_category: string;
  building_category: string;
  nature_of_purchase: string;
  comment: string | null;
  image_urls: string[];
  video_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  listing_number: string;
  rank_order: number;
}

export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
