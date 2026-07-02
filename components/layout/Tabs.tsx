"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
  children: ReactNode;
};

type TabsProps = {
  ariaLabel: string;
  items: TabItem[];
};

export function Tabs({ ariaLabel, items }: TabsProps): ReactElement {
  const idPrefix = useId();
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  if (!activeItem) {
    return <div />;
  }

  function activateTab(tabId: string): void {
    setActiveId(tabId);
    window.requestAnimationFrame(() => {
      document.getElementById(`${idPrefix}-${tabId}-tab`)?.focus();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    const activeIndex = items.findIndex((item) => item.id === activeItem.id);
    if (activeIndex < 0) return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      activateTab(items[(activeIndex + 1) % items.length].id);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      activateTab(items[(activeIndex - 1 + items.length) % items.length].id);
    } else if (event.key === "Home") {
      event.preventDefault();
      activateTab(items[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      activateTab(items[items.length - 1].id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-md border border-border bg-surface-elevated p-2 shadow-card">
        <div role="tablist" aria-label={ariaLabel} className="flex min-w-max gap-2">
          {items.map((item) => {
            const active = item.id === activeItem.id;

            return (
              <button
                key={item.id}
                id={`${idPrefix}-${item.id}-tab`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${idPrefix}-${item.id}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveId(item.id)}
                onKeyDown={handleKeyDown}
                className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground shadow-card"
                    : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={`${idPrefix}-${item.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-${item.id}-tab`}
          hidden={item.id !== activeItem.id}
        >
          {item.children}
        </div>
      ))}
    </div>
  );
}
