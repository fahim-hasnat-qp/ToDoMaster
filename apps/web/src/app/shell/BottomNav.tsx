import { NavLink } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Layers, Sun } from 'lucide-react';
import { cn } from '@/components/utils/cn';

const items = [
  { to: '/app/today', label: 'Today', icon: Sun },
  { to: '/app/upcoming', label: 'Upcoming', icon: CalendarDays },
  { to: '/app/all', label: 'All', icon: Layers },
  { to: '/app/completed', label: 'Done', icon: CheckCircle2 },
];

/** Mobile bottom navigation. Shown below `sm`. */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur sm:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium',
              isActive ? 'text-accent' : 'text-muted',
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
