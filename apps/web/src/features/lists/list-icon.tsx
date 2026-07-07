import {
  Book,
  Briefcase,
  List as ListIcon,
  ShoppingCart,
  User,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  user: User,
  briefcase: Briefcase,
  'shopping-cart': ShoppingCart,
  book: Book,
  list: ListIcon,
};

/** Maps a list's stored icon slug to a Lucide component (falls back to list). */
export function listIcon(slug: string): LucideIcon {
  return ICONS[slug] ?? ListIcon;
}
