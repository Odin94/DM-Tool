import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Variable-height rows, without scaling or blurred transforms while scrolling.
export function VirtualList<T extends { id: string }>({
  items,
  render,
  estimate = 80,
}: {
  items: T[];
  render: (item: T) => ReactNode;
  estimate?: number;
}) {
  const [top, setTop] = useState(0);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const root = useRef<HTMLDivElement>(null);
  const offsets = [0];
  for (const item of items) offsets.push(offsets.at(-1)! + (sizes[item.id] ?? estimate));
  const height = 440;
  const total = offsets.at(-1)!;
  const scrollTop = Math.min(top, Math.max(0, total - height));
  const start = Math.max(0, offsets.findIndex((offset) => offset >= scrollTop) - 6);
  let end = offsets.findIndex((offset) => offset > scrollTop + height);
  if (end < 0) end = items.length;
  end = Math.min(items.length, end + 6);
  const virtual = items.length > 40;
  useLayoutEffect(() => {
    if (!virtual || !root.current) return;
    const observer = new ResizeObserver((entries) => {
      setSizes((current) => {
        const next = { ...current };
        let changed = false;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset["rowId"]!;
          const height = Math.ceil(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height);
          if (next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    });
    root.current.querySelectorAll("[data-row-id]").forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [virtual, start, end, items]);
  if (!virtual)
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>{render(item)}</div>
        ))}
      </div>
    );
  return (
    <div
      ref={root}
      className="relative overflow-auto"
      style={{ height }}
      onScroll={(e) => setTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: total, position: "relative" }}>
        {items.slice(start, end).map((item, index) => (
          <div
            key={item.id}
            data-row-id={item.id}
            className="absolute inset-x-0 pb-2"
            style={{ top: offsets[start + index] }}
          >
            {render(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
