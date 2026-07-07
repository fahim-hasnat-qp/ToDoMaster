import { Hammer, type LucideIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

/** Placeholder for features on the roadmap but not yet implemented. */
export function ComingSoon({
  feature,
  icon = Hammer,
}: Readonly<{ feature: string; icon?: LucideIcon }>) {
  return (
    <div className="grid h-full place-items-center">
      <EmptyState
        icon={icon}
        title={`${feature} — coming soon`}
        description="This feature is on the roadmap and will land in an upcoming milestone."
      />
    </div>
  );
}
