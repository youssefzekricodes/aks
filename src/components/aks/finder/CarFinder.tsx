import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Calendar,
  Check,
  Fuel,
  Gauge,
  RotateCcw,
  ClipboardList,
  Compass,
} from "@/components/icons";
import { publicCarsQuery } from "@/lib/queries";
import {
  answersToFilters,
  describeAnswers,
  finderResults,
  nextStep,
  remainingSteps,
  type FinderAnswers,
  type FinderOption,
  type FinderStep,
  type FinderStepId,
} from "@/features/catalog/finder";
import { sortCars } from "@/features/catalog/search";
import { BodyIcon } from "../BodyIcon";
import { BrandLogo } from "../BrandLogo";
import { CarCard } from "../CarCard";

/*
 * "Trouver ma voiture": one question per screen, big choices with what they
 * mean and how many cars each leaves, a live count at the bottom (see the cars
 * at any time), back and "peu importe" everywhere. Ends on a short selection of
 * the matching cars and the link to all of them.
 */

const plural = (n: number) => `${n} voiture${n > 1 ? "s" : ""}`;

type History = { step: FinderStepId; answers: FinderAnswers }[];

export function CarFinder() {
  const { data: cars } = useSuspenseQuery(publicCarsQuery);
  const [answers, setAnswers] = useState<FinderAnswers>({});
  const [done, setDone] = useState<FinderStepId[]>([]);
  const [history, setHistory] = useState<History>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const step = useMemo(() => nextStep(cars, answers, done), [cars, answers, done]);
  const results = useMemo(() => sortCars(finderResults(cars, answers)), [cars, answers]);
  const total = history.length + 1 + (step ? remainingSteps(cars, answers, [...done, step.id]) : 0);

  const answer = (id: FinderStepId, value: FinderAnswers[FinderStepId] | undefined) => {
    setHistory((h) => [...h, { step: id, answers }]);
    setAnswers((a) => ({ ...a, [id]: value }));
    setDone((d) => [...d, id]);
    setPicked([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setAnswers(last.answers);
    setDone((d) => d.filter((id) => id !== last.step));
    setPicked(last.step === "marque" ? (answers.marque ?? []) : []);
  };
  const restart = () => {
    setAnswers({});
    setDone([]);
    setHistory([]);
    setPicked([]);
  };

  const filters = answersToFilters(answers);
  const summary = describeAnswers(cars, answers);

  return (
    <main className="container-page flex min-h-[calc(100dvh-4rem)] max-w-3xl flex-col pb-6 pt-6 sm:pt-10">
      {/* Where we are. */}
      <div className="flex items-center gap-3">
        {history.length > 0 ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Retour
          </button>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Compass className="size-4" aria-hidden />
            Trouver ma voiture
          </p>
        )}
        {step && (
          <div className="ms-auto flex items-center gap-3">
            <span className="text-sm tabular-nums text-muted">
              {history.length + 1} / {total}
            </span>
            <span
              className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface-secondary sm:block"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${((history.length + 1) / total) * 100}%` }}
              />
            </span>
          </div>
        )}
      </div>

      {step ? (
        <Question
          key={step.id + history.length}
          step={step}
          picked={picked}
          onPick={(value) =>
            step.multiple
              ? setPicked((list) =>
                  list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
                )
              : answer(step.id, value)
          }
          onSkip={() => answer(step.id, undefined)}
          onContinue={() => answer(step.id, picked.length ? picked : undefined)}
        />
      ) : (
        <Selection
          count={results.length}
          summary={summary}
          cars={results.slice(0, 3)}
          filters={filters}
          onRestart={restart}
        />
      )}

      {/* The cars matching so far: visible at every step, one tap to see them. */}
      {step && (
        // Phones: room on the right for the WhatsApp button.
        <div className="sticky bottom-0 -mx-4 mt-auto border-t border-border bg-background/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pe-24 ps-4 pt-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-base font-semibold tabular-nums text-foreground"
                aria-live="polite"
              >
                {plural(results.length)}
              </p>
              <p className="truncate text-xs text-muted">
                {summary || "Toutes les voitures en vente"}
              </p>
            </div>
            <Link
              to="/recherche"
              search={filters}
              className={buttonVariants({ variant: "secondary", className: "shrink-0" })}
            >
              Voir
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function OptionVisual({ step, option }: { step: FinderStepId; option: FinderOption }) {
  const box = "grid h-14 w-20 shrink-0 place-items-center rounded-xl bg-surface-secondary";
  switch (step) {
    case "carrosserie":
      return (
        <span className={box}>
          <BodyIcon body={option.label} active className="h-auto w-16" />
        </span>
      );
    case "marque":
      return (
        <span className={box}>
          <BrandLogo brand={option.label} wordmark={false} size={30} />
        </span>
      );
    default: {
      const Icon =
        step === "budget"
          ? Banknote
          : step === "energie"
            ? Fuel
            : step === "annee"
              ? Calendar
              : Gauge;
      return (
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Icon className="size-5" aria-hidden />
        </span>
      );
    }
  }
}

function Question({
  step,
  picked,
  onPick,
  onSkip,
  onContinue,
}: {
  step: FinderStep;
  picked: string[];
  onPick: (value: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="mt-6 animate-in fade-in-0 slide-in-from-right-4 duration-300 sm:mt-10">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {step.question}
      </h1>
      <p className="mt-2 text-muted">{step.help}</p>

      <ul
        className={`mt-6 grid gap-3 ${step.multiple ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {step.options.map((option) => {
          const selected = picked.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => onPick(option.value)}
                aria-pressed={step.multiple ? selected : undefined}
                className={`relative flex w-full items-center gap-4 rounded-2xl border bg-surface p-3 text-left outline-none transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-focus ${
                  selected
                    ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]"
                    : "border-border hover:border-[color-mix(in_oklab,var(--border)_50%,var(--foreground)_30%)] hover:shadow-md"
                } ${step.multiple ? "flex-col items-start gap-2" : ""}`}
              >
                <OptionVisual step={step.id} option={option} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-semibold text-foreground">{option.label}</span>
                  {option.hint && <span className="text-sm text-muted">{option.hint}</span>}
                  <span className="text-xs font-medium tabular-nums text-accent">
                    {plural(option.count)}
                  </span>
                </span>
                {step.multiple ? (
                  <span
                    aria-hidden
                    className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full border ${
                      selected ? "border-accent bg-accent text-white" : "border-border bg-surface"
                    }`}
                  >
                    {selected && <Check className="size-4" />}
                  </span>
                ) : (
                  <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3 pb-6">
        {step.multiple && (
          <Button size="lg" onPress={onContinue} isDisabled={!picked.length}>
            Continuer
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
        <Button size="lg" variant="ghost" onPress={onSkip}>
          Peu importe, question suivante
        </Button>
      </div>
    </section>
  );
}

function Selection({
  count,
  summary,
  cars,
  filters,
  onRestart,
}: {
  count: number;
  summary: string;
  cars: ReturnType<typeof sortCars>;
  filters: ReturnType<typeof answersToFilters>;
  onRestart: () => void;
}) {
  return (
    <section className="mt-6 animate-in fade-in-0 duration-300 sm:mt-10">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
        <ClipboardList className="size-4" aria-hidden />
        Votre sélection
      </p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {count ? `${plural(count)} pour vous` : "Rien en stock pour ces critères… pour l’instant"}
      </h1>
      {summary && <p className="mt-2 text-muted">{summary}</p>}

      {cars.length > 0 && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car, i) => (
            <li key={car.id}>
              <CarCard car={car} priority={i === 0} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
        {count > 0 && (
          <Link to="/recherche" search={filters} className={buttonVariants({ size: "lg" })}>
            {count > cars.length ? `Voir les ${plural(count)}` : "Voir dans le stock"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <Button size="lg" variant="secondary" onPress={onRestart}>
          <RotateCcw className="size-4" aria-hidden />
          Recommencer
        </Button>
        <Link to="/contact" className={buttonVariants({ size: "lg", variant: "ghost" })}>
          Pas trouvé ? Décrivez-nous votre voiture
        </Link>
      </div>
    </section>
  );
}
