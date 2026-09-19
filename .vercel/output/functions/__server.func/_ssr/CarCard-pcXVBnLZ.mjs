import { s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as carImage } from "./cars-bbHZOFrw.mjs";
import { S as Fuel, c as Settings2, x as Gauge } from "../_libs/lucide-react.mjs";
import { a as useSiteText } from "./Reveal-BE801ec-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CarCard-pcXVBnLZ.js
var import_jsx_runtime = require_jsx_runtime();
function CarCard({ car }) {
	const text = useSiteText();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "group glass-panel h-full overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-[0_0_50px_-12px_var(--primary)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative aspect-[4/3] overflow-hidden bg-black",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: carImage(car),
				alt: `${car.brand} ${car.name}`,
				width: 1024,
				height: 768,
				loading: "lazy",
				className: "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute left-3 top-3 rounded-full border border-border bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground backdrop-blur",
				children: car.state
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "truncate text-lg font-bold",
							children: [
								car.brand,
								" ",
								car.name
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: car.year
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "shrink-0 font-display text-lg font-bold text-primary",
						children: [
							car.price.toLocaleString("fr-FR"),
							" ",
							text("card.text_1", "DT")
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-xs text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "h-3.5 w-3.5 shrink-0 text-steel" }), car.km]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fuel, { className: "h-3.5 w-3.5 shrink-0 text-steel" }), car.fuel]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "h-3.5 w-3.5 shrink-0 text-steel" }), car.gearbox]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/vehicule/$slug",
					params: { slug: car.slug },
					className: "btn-3d btn-3d-primary mt-4 flex w-full items-center justify-center px-4 py-2 text-xs uppercase tracking-wider",
					children: text("card.text_2", "Voir les détails")
				})
			]
		})]
	});
}
//#endregion
export { CarCard as t };
