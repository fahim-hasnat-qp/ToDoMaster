import { NavLink } from 'react-router-dom';
import { CalendarDays, CheckSquare, Search, Settings, Settings2, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/components/utils/cn';
import { SMART_LISTS } from '@/features/smart-lists/smart-list-config';
import { useListStore } from '@/features/lists/list-store';
import { listIcon } from '@/features/lists/list-icon';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-text',
  );

/** Desktop sidebar: smart lists + custom lists. Hidden below `sm`. */
export function Sidebar() {
  const lists = useListStore((s) => s.lists);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface sm:flex">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-fg">
          <CheckSquare className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-text">ToDoMaster</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        <NavLink to="/app/search" className={linkClass}>
          <Search className="h-4 w-4" />
          Search
        </NavLink>
        <NavLink to="/app/calendar" className={linkClass}>
          <CalendarDays className="h-4 w-4" />
          Calendar
        </NavLink>

        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Smart Lists
        </p>
        {SMART_LISTS.map((sl) => (
          <NavLink key={sl.id} to={sl.path} className={linkClass}>
            <sl.icon className="h-4 w-4" />
            {sl.label}
          </NavLink>
        ))}

        <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Lists
        </p>
        {lists.map((list) => {
          const Icon = listIcon(list.icon);
          return (
            <NavLink key={list.id} to={`/app/list/${list.id}`} className={linkClass}>
              <Icon className="h-4 w-4" style={{ color: list.color }} />
              {list.name}
            </NavLink>
          );
        })}

        <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
          Manage
        </p>
        <NavLink to="/app/lists" className={linkClass}>
          <Settings2 className="h-4 w-4" />
          Lists
        </NavLink>
        <NavLink to="/app/tags" className={linkClass}>
          <TagIcon className="h-4 w-4" />
          Tags
        </NavLink>
        <NavLink to="/app/settings" className={linkClass}>
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
