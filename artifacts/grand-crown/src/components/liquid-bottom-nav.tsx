import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type LiquidNavItem = { id: string; label: string; icon: LucideIcon };

export function LiquidBottomNav({ items, active, onSelect }: { items: LiquidNavItem[]; active: string; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 30, mass: 0.9 };
  return (
    <nav aria-label="Member navigation" className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="liquid-bar relative mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] p-1.5">
        {items.map(item => {
          const selected = active === item.id;
          const label = item.id === 'products' ? 'Plans' : item.label.replace('My ', '');
          return (
            <motion.button
              key={item.id}
              data-testid={`button-bottom-nav-${item.id}`}
              type="button"
              aria-current={selected ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => onSelect(item.id)}
              whileTap={reduce ? undefined : { scale: 0.88 }}
              transition={spring}
              className={`relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-[1.35rem] text-[10px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? 'text-primary' : 'text-sidebar-foreground/60'}`}
            >
              {selected && <motion.span layoutId="liquid-blob" transition={spring} className="liquid-blob absolute inset-0 rounded-[1.35rem]" />}
              <motion.span className="relative" animate={reduce ? undefined : { y: selected ? -2 : 0, scale: selected ? 1.1 : 1 }} transition={spring}>
                <item.icon className="size-5" strokeWidth={selected ? 2.5 : 2} />
              </motion.span>
              <span className="relative">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
