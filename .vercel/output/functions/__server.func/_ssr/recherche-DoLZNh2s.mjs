import { r as useSuspenseQuery, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as publicCarsQuery } from "./queries-DK4crW-I.mjs";
import { r as Route$2 } from "./router-D3oCTAsw.mjs";
import { L as ArrowLeft } from "../_libs/lucide-react.mjs";
import { a as useSiteText, n as Reveal, r as SellCarBanner, t as Navbar } from "./Reveal-BE801ec-.mjs";
import { t as CarCard } from "./CarCard-pcXVBnLZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/recherche-DoLZNh2s.js
var import_jsx_runtime = require_jsx_runtime();
function matchesPrice(price, car) {
	if (price === "all") return true;
	if (price === "0-30000") return car.price >= 0 && car.price < 3e4;
	if (price === "30000-50000") return car.price >= 3e4 && car.price < 5e4;
	if (price === "50000-100000") return car.price >= 5e4 && car.price < 1e5;
	if (price === "100000-200000") return car.price >= 1e5 && car.price < 2e5;
	if (price === "200000+") return car.price >= 2e5;
	return true;
}
function matchesKm(km, car) {
	if (km === "all") return true;
	if (km === "0-50000") return car.km_value >= 0 && car.km_value < 5e4;
	if (km === "50000-100000") return car.km_value >= 5e4 && car.km_value < 1e5;
	if (km === "100000-200000") return car.km_value >= 1e5 && car.km_value < 2e5;
	if (km === "200000+") return car.km_value >= 2e5;
	return true;
}
function RecherchePage() {
	const text = useSiteText();
	const { price, type, km, country } = Route$2.useSearch();
	const { data: cars } = useSuspenseQuery(publicCarsQuery);
	const filtered = cars.filter((car) => matchesPrice(price, car) && (type === "all" || car.body === type) && matchesKm(km, car) && (country === "all" || car.country === country));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navbar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						className: "inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), text("search.text_1", "Retour à l'accueil")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-8 text-4xl font-bold sm:text-5xl",
						children: text("search.text_2", "Résultats de recherche")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-muted-foreground",
						children: text(filtered.length === 1 ? "search.results_one" : "search.results_many", "{count} véhicules trouvés").replaceAll("{count}", String(filtered.length))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
						children: filtered.map((car, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
							delay: i * 60,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CarCard, { car })
						}, car.name))
					}),
					filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-16 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-lg text-foreground",
							children: text("search.text_5", "Aucun véhicule ne correspond à ces critères.")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/recherche",
							search: {
								price: "all",
								type: "all",
								km: "all",
								country: "all"
							},
							className: "btn-3d btn-3d-primary mt-6 inline-flex",
							children: text("search.text_6", "Voir tout l'inventaire")
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SellCarBanner, { className: "pb-24" })
		]
	});
}
//#endregion
export { RecherchePage as component };
