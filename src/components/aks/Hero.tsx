import { useSiteText } from "@/lib/site-content";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, ChevronDown } from "lucide-react";
import { Btn } from "./Btn";

export function Hero() {
  const text = useSiteText();

  const priceOptions = [
    { value: "all", label: text("hero.text_1", "Prix") },
    { value: "0-30000", label: text("hero.text_2", "0 - 30 000 DT") },
    { value: "30000-50000", label: text("hero.text_3", "30 000 - 50 000 DT") },
    { value: "50000-100000", label: text("hero.text_4", "50 000 - 100 000 DT") },
    { value: "100000-200000", label: text("hero.text_5", "100 000 - 200 000 DT") },
    { value: "200000+", label: text("hero.text_6", "200 000 DT +") },
  ];
  const typeOptions = [
    { value: "all", label: text("hero.text_7", "Type") },
    { value: "SUV", label: text("hero.text_8", "SUV") },
    { value: "Berline", label: text("hero.text_9", "Berline") },
    { value: "Coupé", label: text("hero.text_10", "Coupé") },
    { value: "Citadine", label: text("hero.text_11", "Citadine") },
    { value: "Pick-up", label: text("hero.text_12", "Pick-up") },
  ];
  const kmOptions = [
    { value: "all", label: text("hero.text_13", "Kilométrage") },
    { value: "0-50000", label: text("hero.text_14", "0 - 50 000 km") },
    { value: "50000-100000", label: text("hero.text_15", "50 000 - 100 000 km") },
    { value: "100000-200000", label: text("hero.text_16", "100 000 - 200 000 km") },
    { value: "200000+", label: text("hero.text_17", "200 000 km +") },
  ];
  const countryOptions = [
    { value: "all", label: text("hero.text_18", "Pays") },
    { value: "Japan", label: text("hero.text_19", "Japon") },
    { value: "China", label: text("hero.text_20", "Chine") },
    { value: "Germany", label: text("hero.text_21", "Allemagne") },
    { value: "Italy", label: text("hero.text_22", "Italie") },
    { value: "France", label: text("hero.text_23", "France") },
  ];

  const navigate = useNavigate({ from: "/" });
  const [price, setPrice] = useState("all");
  const [type, setType] = useState("all");
  const [km, setKm] = useState("all");
  const [country, setCountry] = useState("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/recherche",
      search: { price, type, km, country },
    });
  };

  return (
    <section id="top" className="relative isolate min-h-[92vh]">
      {/* Showroom photo — centered full-bleed background */}
      <img
        src={text("hero.image_1", "/images/aks-storefront.jpg")}
        alt={text(
          "hero.text_24",
          "Façade du showroom Auto Kontor Sfax de nuit, enseigne AKS éclairée et véhicules premium en vitrine",
        )}
        width={1100}
        height={1400}
        className="absolute inset-0 h-full w-full object-cover object-center"
        style={{ filter: "saturate(1.12) contrast(1.22) brightness(0.9)" }}
      />

      {/* Subtle red-black cinematic grade */}
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-soft-light opacity-70"
        style={{
          background:
            "linear-gradient(200deg, oklch(0.55 0.23 28.5) 0%, oklch(0.3 0.12 28.5) 55%, oklch(0.12 0.02 28.5) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 mix-blend-multiply opacity-25"
        style={{
          background: "linear-gradient(200deg, oklch(0.4 0.14 28.5), oklch(0.1 0.01 28.5))",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/30"
      />

      {/* Dark vignette overlay so text pops */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/45"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.62) 100%)",
        }}
      />

      {/* Centered content */}
      <div className="relative flex min-h-[92vh] flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-muted-foreground">
          {text("hero.text_25", "Sfax · Tunisie")}{" "}
          <span className="mx-auto mt-3 block h-px w-14 bg-primary" />
        </p>

        <h1 className="mt-10 max-w-4xl font-display text-[clamp(2.4rem,6vw,5rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em] text-foreground">
          {text("hero.text_26", "Le showroom automobile")}{" "}
          <span className="text-primary">{text("hero.text_27", "premium de Sfax")}</span>
        </h1>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {text(
            "hero.textarea_1",
            "Véhicules neufs et d'occasion sélectionnés avec exigence. Financement, reprise et garantie — accompagnés par une équipe qui connaît chaque voiture qu'elle vend.",
          )}
        </p>

        {/* Search bar */}
        <div className="glass-panel mt-12 w-full max-w-5xl rounded-2xl p-5 sm:p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchField
                label={text("hero.text_1", "Prix")}
                value={price}
                onChange={setPrice}
                options={priceOptions}
              />
              <SearchField
                label={text("hero.text_7", "Type")}
                value={type}
                onChange={setType}
                options={typeOptions}
              />
              <SearchField
                label={text("hero.text_13", "Kilométrage")}
                value={km}
                onChange={setKm}
                options={kmOptions}
              />
              <SearchField
                label={text("hero.text_28", "Pays fabricant")}
                value={country}
                onChange={setCountry}
                options={countryOptions}
              />
            </div>
            <Btn type="submit" size="lg" className="w-full">
              <Search className="h-4 w-4" />
              {text("hero.text_29", "Rechercher")}
            </Btn>
          </form>
        </div>
      </div>
    </section>
  );
}

function SearchField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-depth h-12 w-full appearance-none rounded-md px-3 pr-10 text-sm font-medium text-foreground"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}
