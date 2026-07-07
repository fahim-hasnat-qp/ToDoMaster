import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Flag,
  Inbox,
  Layers,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { SmartListId } from '@todomaster/shared';

export interface SmartListMeta {
  id: SmartListId;
  label: string;
  icon: LucideIcon;
  path: string;
}

/** Order shown in the sidebar. */
export const SMART_LISTS: readonly SmartListMeta[] = [
  { id: SmartListId.TODAY, label: 'Today', icon: Sun, path: '/app/today' },
  { id: SmartListId.UPCOMING, label: 'Upcoming', icon: CalendarDays, path: '/app/upcoming' },
  { id: SmartListId.OVERDUE, label: 'Overdue', icon: CalendarClock, path: '/app/overdue' },
  { id: SmartListId.HIGH_PRIORITY, label: 'High Priority', icon: Flag, path: '/app/priority' },
  { id: SmartListId.NO_DATE, label: 'No Due Date', icon: Inbox, path: '/app/no-date' },
  { id: SmartListId.ALL, label: 'All Tasks', icon: Layers, path: '/app/all' },
  { id: SmartListId.COMPLETED, label: 'Completed', icon: CheckCircle2, path: '/app/completed' },
];
