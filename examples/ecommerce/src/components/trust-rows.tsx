import { ArrowLeftRightIcon, TruckIcon, Undo2Icon } from "lucide-react";

const ROWS = [
  { icon: TruckIcon, title: "Free shipping over $100", body: "Otherwise a flat $8, anywhere." },
  { icon: ArrowLeftRightIcon, title: "Free size exchanges", body: "Wrong fit? We send the right one." },
  { icon: Undo2Icon, title: "30-day returns", body: "Unworn and unwashed, no questions." },
];

export function TrustRows() {
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {ROWS.map(({ icon: Icon, title, body }) => (
        <li key={title} className="flex items-start gap-3 p-4">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-0.5 text-sm">
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground">{body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
