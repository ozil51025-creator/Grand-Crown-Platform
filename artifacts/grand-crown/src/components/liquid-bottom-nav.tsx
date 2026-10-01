import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type LiquidNavItem = { id: string; label: string; icon: LucideIcon };

export function LiquidBottomNav({ items, active, onSelect }: { items: LiquidNavItem[]; active: string; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 420, damping: 30, mass: 0.9 };
  return (
    <nav aria-label="Member navigation" className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="liquid-bar relative mx-auto grid h-[4.25rem] max-w-[25rem] grid-cols-5 rounded-[1.15rem] px-1.5 pt-1">
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
              className={`relative flex min-w-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? 'text-white' : 'text-white/70 transition-colors hover:text-white'}`}
            >
              {selected && <>
                <motion.span layoutId="liquid-active" transition={spring} className="liquid-active-orb absolute -top-[1.35rem] left-1/2 grid size-[3.5rem] -translate-x-1/2 place-items-center rounded-full" />
                <motion.span initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { duration: .18, delay: .06 }} className="absolute inset-x-0 bottom-[.38rem] truncate text-center text-[9px] font-semibold leading-none text-white">
                  {label}
                </motion.span>
              </>}
              <motion.span
                className={`relative z-[1] flex items-center justify-center ${selected ? 'size-[3.5rem] -translate-y-[1.65rem] text-slate-950' : 'size-full'}`}
                animate={reduce ? undefined : { scale: selected ? 1 : 0.96 }}
                transition={spring}
              >
                <item.icon className="size-[1.35rem]" strokeWidth={selected ? 2.3 : 1.9} />
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
