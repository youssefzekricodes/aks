import { r as __toESM } from "../_runtime.mjs";
import { c as require_react, r as useSuspenseQuery, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as siteContentQuery } from "./queries-DK4crW-I.mjs";
import { s as resolveContent, t as COLLECTION_DEFAULTS } from "./definition-BxYhf0sv.mjs";
import { I as ArrowRight, M as Car, h as Menu, t as X } from "../_libs/lucide-react.mjs";
import { n as BtnLink, r as cn } from "./Btn-DYEvAKAi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Reveal-BE801ec-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Returns a getter for editable site texts, falling back to the built-in copy
* when the key has not been customised in the dashboard yet.
*/
function useSiteText() {
	const { data } = useSuspenseQuery(siteContentQuery);
	return (key, fallback) => {
		return resolveContent(data, key, fallback);
	};
}
function useSiteCollection(key) {
	const { data } = useSuspenseQuery(siteContentQuery);
	try {
		return data[key] === void 0 ? COLLECTION_DEFAULTS[key] : JSON.parse(data[key]);
	} catch {
		return COLLECTION_DEFAULTS[key];
	}
}
function Navbar() {
	const text = useSiteText();
	const links = useSiteCollection("navbar.items");
	const [scrolled, setScrolled] = (0, import_react.useState)(false);
	const [open, setOpen] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const onScroll = () => setScrolled(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 lg:px-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: text("navbar.link_1", "#top"),
					className: "flex min-w-0 items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: text("identity.logo", "/images/aks-logo.png"),
						alt: text("navbar.text_1", "Auto Kontor Sfax"),
						width: 132,
						height: 44,
						className: "h-11 w-[132px] shrink-0 object-contain"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 truncate font-display text-sm font-bold uppercase tracking-[0.22em] text-foreground",
						children: [
							text("identity.brand", "Auto Kontor"),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: text("identity.brand_suffix", "Sfax")
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "hidden items-center gap-8 lg:flex",
					children: [links.map((l, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: l.href,
						className: "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
						children: l.label
					}, index)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BtnLink, {
						href: text("navbar.link_2", "#contact"),
						size: "sm",
						children: text("navbar.text_3", "Nous contacter")
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					"aria-label": text("navbar.text_4", "Menu"),
					onClick: () => setOpen((v) => !v),
					className: "btn-3d btn-3d-steel p-2.5 lg:hidden",
					children: open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
				})
			]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-t border-border bg-background/98 px-5 py-4 lg:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "flex flex-col gap-1",
				children: [links.map((l, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: l.href,
					onClick: () => setOpen(false),
					className: "rounded-md px-2 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
					children: l.label
				}, index)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BtnLink, {
					href: text("navbar.link_2", "#contact"),
					size: "sm",
					className: "mt-3",
					onClick: () => setOpen(false),
					children: text("navbar.text_3", "Nous contacter")
				})]
			})
		})]
	});
}
function SellCarBanner({ className = "" }) {
	const text = useSiteText();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: `mx-auto w-full max-w-7xl px-5 lg:px-8 ${className}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sell-banner relative flex min-h-44 flex-col items-start justify-between gap-8 overflow-hidden rounded-lg border border-border bg-background px-7 py-8 sm:flex-row sm:items-center sm:px-10 lg:min-h-52 lg:px-14",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sell-banner-pattern",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sell-banner-sweep",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sell-banner-cut",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10 max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Car, { className: "h-4 w-4" }), text("sell.text_1", "Reprise automobile")]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-4 text-3xl font-bold text-foreground sm:text-4xl",
							children: text("sell.text_2", "Vous voulez vendre votre voiture ?")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm font-semibold text-foreground sm:text-base",
							children: text("sell.text_3", "Recevez une estimation claire et rapide de votre véhicule par notre équipe.")
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: text("sell.destination", "/#contact"),
					className: "btn-3d btn-3d-primary relative z-10 shrink-0 px-7 py-4 text-sm uppercase",
					children: [text("sell.text_4", "Évaluer gratuitement"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
				})
			]
		})
	});
}
function Reveal({ children, delay = 0, className }) {
	const ref = (0, import_react.useRef)(null);
	const [shown, setShown] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				setShown(true);
				io.disconnect();
			}
		}, { threshold: .15 });
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: cn("reveal", shown && "reveal-in", className),
		style: { transitionDelay: `${delay}ms` },
		children
	});
}
//#endregion
export { useSiteText as a, useSiteCollection as i, Reveal as n, SellCarBanner as r, Navbar as t };
