import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { publicCarsQuery } from "@/lib/queries";
import { useSiteText, useSiteCollection } from "@/lib/site-content";
import { CarCard } from "./CarCard";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "btn-3d px-4 py-2 text-xs font-semibold uppercase tracking-wider",
        active ? "btn-3d-chip-active" : "btn-3d-chip",
      )}
    >
      {children}
    </button>
  );
}

export function Inventory() {
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const text = useSiteText();
  const budgetItems = useSiteCollection("inventory.budgets");
  const bodies = useMemo(
    () => ["Toutes carrosseries", ...new Set(cars.map((car) => car.body))],
    [cars],
  );
  const states = useMemo(() => ["Tous", ...new Set(cars.map((car) => car.state))], [cars]);
  const budgets = [
    { label: text("inventory.all_budgets", "Tous budgets"), max: Infinity },
    ...budgetItems,
  ];
  const [body, setBody] = useState(bodies[0]!);
  const [state, setState] = useState(states[0]!);
  const [budget, setBudget] = useState(budgets[0]!);

  const filtered = useMemo(
    () =>
      cars.filter(
        (c) =>
          (body === bodies[0] || c.body === body) &&
          (state === states[0] || c.state === state) &&
          (budget.max === Infinity || (c.price_on_request !== true && c.price <= budget.max)),
      ),
    [cars, body, state, budget, bodies, states],
  );

  return (
    <section id="inventaire" className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          {text("inventory.text_1", "Inventaire")}
        </p>
        <h2 className="mt-4 max-w-xl text-4xl font-bold sm:text-5xl">
          {text("inventory_title", "Véhicules en vitrine")}
        </h2>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {text(
            "inventory_subtitle",
            "Chaque véhicule est inspecté sur 120 points avant d'entrer dans notre showroom.",
          )}
        </p>
      </Reveal>

      <Reveal delay={80}>
        <div className="glass-panel mt-10 flex flex-col gap-4 rounded-xl p-5">
          {[
            { items: bodies, value: body, set: setBody },
            { items: states, value: state, set: setState },
          ].map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2.5">
              {row.items.map((item) => (
                <Chip key={item} active={row.value === item} onClick={() => row.set(item)}>
                  {item === bodies[0]
                    ? text("inventory.all_bodies", item)
                    : item === states[0]
                      ? text("inventory.all_states", item)
                      : item}
                </Chip>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap gap-2.5">
            {budgets.map((b) => (
              <Chip key={b.label} active={budget.label === b.label} onClick={() => setBudget(b)}>
                {b.max === Infinity ? text("inventory.all_budgets", b.label) : b.label}
              </Chip>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((car, i) => (
          <Reveal key={car.name} delay={i * 60}>
            <CarCard car={car} />
          </Reveal>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-muted-foreground">
          {text("inventory.text_2", "Aucun véhicule ne correspond à ces filtres.")}
        </p>
      )}
    </section>
  );
}
