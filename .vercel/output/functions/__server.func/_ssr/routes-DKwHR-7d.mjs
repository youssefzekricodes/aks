import { r as __toESM } from "../_runtime.mjs";
import { c as require_react, r as useSuspenseQuery, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as publicCarsQuery } from "./queries-DK4crW-I.mjs";
import { A as ChevronDown, D as Clock, O as ChevronRight, P as Banknote, a as Star, f as Phone, g as MapPin, k as ChevronLeft, l as Search, m as MessageCircle, n as Wrench, o as Ship, p as Navigation, s as ShieldCheck, u as Repeat } from "../_libs/lucide-react.mjs";
import { n as BtnLink, r as cn, t as Btn } from "./Btn-DYEvAKAi.mjs";
import { a as useSiteText, i as useSiteCollection, n as Reveal, r as SellCarBanner, t as Navbar } from "./Reveal-BE801ec-.mjs";
import { t as CarCard } from "./CarCard-pcXVBnLZ.mjs";
import { t as ContactFooter } from "./ContactFooter-D0VonlME.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DKwHR-7d.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Hero() {
	const text = useSiteText();
	const priceOptions = [
		{
			value: "all",
			label: text("hero.text_1", "Prix")
		},
		{
			value: "0-30000",
			label: text("hero.text_2", "0 - 30 000 DT")
		},
		{
			value: "30000-50000",
			label: text("hero.text_3", "30 000 - 50 000 DT")
		},
		{
			value: "50000-100000",
			label: text("hero.text_4", "50 000 - 100 000 DT")
		},
		{
			value: "100000-200000",
			label: text("hero.text_5", "100 000 - 200 000 DT")
		},
		{
			value: "200000+",
			label: text("hero.text_6", "200 000 DT +")
		}
	];
	const typeOptions = [
		{
			value: "all",
			label: text("hero.text_7", "Type")
		},
		{
			value: "SUV",
			label: text("hero.text_8", "SUV")
		},
		{
			value: "Berline",
			label: text("hero.text_9", "Berline")
		},
		{
			value: "Coupé",
			label: text("hero.text_10", "Coupé")
		},
		{
			value: "Citadine",
			label: text("hero.text_11", "Citadine")
		},
		{
			value: "Pick-up",
			label: text("hero.text_12", "Pick-up")
		}
	];
	const kmOptions = [
		{
			value: "all",
			label: text("hero.text_13", "Kilométrage")
		},
		{
			value: "0-50000",
			label: text("hero.text_14", "0 - 50 000 km")
		},
		{
			value: "50000-100000",
			label: text("hero.text_15", "50 000 - 100 000 km")
		},
		{
			value: "100000-200000",
			label: text("hero.text_16", "100 000 - 200 000 km")
		},
		{
			value: "200000+",
			label: text("hero.text_17", "200 000 km +")
		}
	];
	const countryOptions = [
		{
			value: "all",
			label: text("hero.text_18", "Pays")
		},
		{
			value: "Japan",
			label: text("hero.text_19", "Japon")
		},
		{
			value: "China",
			label: text("hero.text_20", "Chine")
		},
		{
			value: "Germany",
			label: text("hero.text_21", "Allemagne")
		},
		{
			value: "Italy",
			label: text("hero.text_22", "Italie")
		},
		{
			value: "France",
			label: text("hero.text_23", "France")
		}
	];
	const navigate = useNavigate({ from: "/" });
	const [price, setPrice] = (0, import_react.useState)("all");
	const [type, setType] = (0, import_react.useState)("all");
	const [km, setKm] = (0, import_react.useState)("all");
	const [country, setCountry] = (0, import_react.useState)("all");
	const handleSubmit = (e) => {
		e.preventDefault();
		navigate({
			to: "/recherche",
			search: {
				price,
				type,
				km,
				country
			}
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "top",
		className: "relative isolate min-h-[92vh]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: text("hero.image_1", "/images/aks-storefront.jpg"),
				alt: text("hero.text_24", "Façade du showroom Auto Kontor Sfax de nuit, enseigne AKS éclairée et véhicules premium en vitrine"),
				width: 1100,
				height: 1400,
				className: "absolute inset-0 h-full w-full object-cover object-center",
				style: { filter: "saturate(1.12) contrast(1.22) brightness(0.9)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"aria-hidden": true,
				className: "absolute inset-0 mix-blend-soft-light opacity-70",
				style: { background: "linear-gradient(200deg, oklch(0.55 0.23 28.5) 0%, oklch(0.3 0.12 28.5) 55%, oklch(0.12 0.02 28.5) 100%)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"aria-hidden": true,
				className: "absolute inset-0 mix-blend-multiply opacity-25",
				style: { background: "linear-gradient(200deg, oklch(0.4 0.14 28.5), oklch(0.1 0.01 28.5))" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"aria-hidden": true,
				className: "absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/30"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"aria-hidden": true,
				className: "absolute inset-0 bg-black/45",
				style: { background: "radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.62) 100%)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex min-h-[92vh] flex-col items-center justify-center px-6 py-24 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-muted-foreground",
						children: [
							text("hero.text_25", "Sfax · Tunisie"),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mx-auto mt-3 block h-px w-14 bg-primary" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "mt-10 max-w-4xl font-display text-[clamp(2.4rem,6vw,5rem)] font-bold uppercase leading-[0.95] tracking-[-0.03em] text-foreground",
						children: [
							text("hero.text_26", "Le showroom automobile"),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: text("hero.text_27", "premium de Sfax")
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base",
						children: text("hero.textarea_1", "Véhicules neufs et d'occasion sélectionnés avec exigence. Financement, reprise et garantie — accompagnés par une équipe qui connaît chaque voiture qu'elle vend.")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "glass-panel mt-12 w-full max-w-5xl rounded-2xl p-5 sm:p-7",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: handleSubmit,
							className: "flex flex-col gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
										label: text("hero.text_1", "Prix"),
										value: price,
										onChange: setPrice,
										options: priceOptions
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
										label: text("hero.text_7", "Type"),
										value: type,
										onChange: setType,
										options: typeOptions
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
										label: text("hero.text_13", "Kilométrage"),
										value: km,
										onChange: setKm,
										options: kmOptions
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchField, {
										label: text("hero.text_28", "Pays fabricant"),
										value: country,
										onChange: setCountry,
										options: countryOptions
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Btn, {
								type: "submit",
								size: "lg",
								className: "w-full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4" }), text("hero.text_29", "Rechercher")]
							})]
						})
					})
				]
			})
		]
	});
}
function SearchField({ label, value, onChange, options }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-1.5 text-left",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			className: "text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
				value,
				onChange: (e) => onChange(e.target.value),
				className: "input-depth h-12 w-full appearance-none rounded-md px-3 pr-10 text-sm font-medium text-foreground",
				children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: opt.value,
					children: opt.label
				}, opt.value))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" })]
		})]
	});
}
function Chip({ active, children, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick,
		className: cn("btn-3d px-4 py-2 text-xs font-semibold uppercase tracking-wider", active ? "btn-3d-chip-active" : "btn-3d-chip"),
		children
	});
}
function Inventory() {
	const { data: cars } = useSuspenseQuery(publicCarsQuery);
	const text = useSiteText();
	const budgetItems = useSiteCollection("inventory.budgets");
	const brands = (0, import_react.useMemo)(() => ["Toutes marques", ...new Set(cars.map((car) => car.brand))], [cars]);
	const bodies = (0, import_react.useMemo)(() => ["Toutes carrosseries", ...new Set(cars.map((car) => car.body))], [cars]);
	const states = (0, import_react.useMemo)(() => ["Tous", ...new Set(cars.map((car) => car.state))], [cars]);
	const budgets = [{
		label: text("inventory.all_budgets", "Tous budgets"),
		max: Infinity
	}, ...budgetItems];
	const [brand, setBrand] = (0, import_react.useState)(brands[0]);
	const [body, setBody] = (0, import_react.useState)(bodies[0]);
	const [state, setState] = (0, import_react.useState)(states[0]);
	const [budget, setBudget] = (0, import_react.useState)(budgets[0]);
	const filtered = (0, import_react.useMemo)(() => cars.filter((c) => (brand === brands[0] || c.brand === brand) && (body === bodies[0] || c.body === body) && (state === states[0] || c.state === state) && c.price <= budget.max), [
		cars,
		brand,
		body,
		state,
		budget,
		brands,
		bodies,
		states
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "inventaire",
		className: "relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Reveal, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-[0.3em] text-primary",
					children: text("inventory.text_1", "Inventaire")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 max-w-xl text-4xl font-bold sm:text-5xl",
					children: text("inventory_title", "Véhicules en vitrine")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 max-w-xl text-muted-foreground",
					children: text("inventory_subtitle", "Chaque véhicule est inspecté sur 120 points avant d'entrer dans notre showroom.")
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
				delay: 80,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-panel mt-10 flex flex-col gap-4 rounded-xl p-5",
					children: [[
						{
							items: brands,
							value: brand,
							set: setBrand
						},
						{
							items: bodies,
							value: body,
							set: setBody
						},
						{
							items: states,
							value: state,
							set: setState
						}
					].map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2.5",
						children: row.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: row.value === item,
							onClick: () => row.set(item),
							children: item === brands[0] ? text("inventory.all_brands", item) : item === bodies[0] ? text("inventory.all_bodies", item) : item === states[0] ? text("inventory.all_states", item) : item
						}, item))
					}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2.5",
						children: budgets.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
							active: budget.label === b.label,
							onClick: () => setBudget(b),
							children: b.max === Infinity ? text("inventory.all_budgets", b.label) : b.label
						}, b.label))
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
				children: filtered.map((car, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
					delay: i * 60,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CarCard, { car })
				}, car.name))
			}),
			filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-10 text-center text-muted-foreground",
				children: text("inventory.text_2", "Aucun véhicule ne correspond à ces filtres.")
			})
		]
	});
}
function Counter({ value, suffix }) {
	const ref = (0, import_react.useRef)(null);
	const [n, setN] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver((entries) => {
			if (!entries[0]?.isIntersecting) return;
			io.disconnect();
			const start = performance.now();
			const dur = 1600;
			const tick = (t) => {
				const p = Math.min((t - start) / dur, 1);
				setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
				if (p < 1) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});
		io.observe(el);
		return () => io.disconnect();
	}, [value]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		ref,
		className: "font-display text-4xl font-bold text-foreground sm:text-5xl",
		children: [n.toLocaleString("fr-FR"), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-primary",
			children: suffix
		})]
	});
}
function About() {
	const text = useSiteText();
	const stats = useSiteCollection("about.items");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "apropos",
		className: "relative overflow-hidden border-y border-border bg-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			"aria-hidden": true,
			className: "absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-[130px]"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-14 lg:grid-cols-2 lg:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Reveal, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold uppercase tracking-[0.3em] text-primary",
						children: text("about.text_1", "À propos")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
						className: "mt-4 text-4xl font-bold sm:text-5xl",
						children: [
							text("about.text_2", "Auto Kontor Sfax,"),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-chrome",
								children: text("about.text_3", "l'exigence automobile")
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 space-y-4 text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: text("about.textarea_1", "Depuis 2008, Auto Kontor Sfax accompagne les automobilistes de la région dans l'achat, la reprise et l'importation de véhicules haut de gamme. Notre showroom réunit berlines, SUV et sportives sélectionnés un par un.") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: text("about.textarea_2", "Transparence sur l'historique, garantie écrite, financement négocié avec nos partenaires bancaires : nous construisons des relations durables, pas des ventes rapides.") })]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
					delay: 120,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "glass-panel grid grid-cols-2 gap-px overflow-hidden rounded-2xl",
						children: stats.map((s, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-background/40 p-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Counter, {
								value: s.value,
								suffix: s.suffix
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: s.label
							})]
						}, index))
					})
				})]
			})
		})]
	});
}
function Services() {
	const text = useSiteText();
	const serviceItems = useSiteCollection("services.items");
	const icons = {
		Banknote,
		Repeat,
		Wrench,
		Ship,
		ShieldCheck
	};
	const services = serviceItems.map((item) => ({
		...item,
		icon: icons[item.icon] ?? ShieldCheck
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "services",
		className: "mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Reveal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-semibold uppercase tracking-[0.3em] text-primary",
			children: text("services.text_1", "Services")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-4 text-4xl font-bold sm:text-5xl",
			children: text("services.text_2", "Tout, sous le même toit")
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
			children: services.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
				delay: i * 70,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-panel h-full rounded-xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid h-12 w-12 place-items-center rounded-lg border border-primary/30 bg-primary/10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "h-5 w-5 text-primary" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-5 text-lg font-bold",
							children: s.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted-foreground",
							children: s.text
						})
					]
				})
			}, i))
		})]
	});
}
function Testimonials() {
	const text = useSiteText();
	const reviews = useSiteCollection("testimonials.items");
	const [i, setI] = (0, import_react.useState)(0);
	const r = reviews[i % reviews.length];
	if (!r) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "avis",
		className: "relative overflow-hidden border-y border-border bg-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			"aria-hidden": true,
			className: "absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/12 blur-[140px]"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative mx-auto max-w-4xl px-5 py-24 text-center lg:py-32",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Reveal, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-[0.3em] text-primary",
					children: text("testimonials.text_1", "Témoignages")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-4xl font-bold sm:text-5xl",
					children: text("testimonials.text_2", "Ils nous font confiance")
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-panel mt-12 rounded-2xl p-8 sm:p-12",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-center gap-1",
							children: Array.from({ length: 5 }).map((_, s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-4 w-4 ${s < r.stars ? "fill-primary text-primary" : "text-muted"}` }, s))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-6 text-lg leading-relaxed text-foreground sm:text-xl",
							children: [
								"“",
								r.text,
								"”"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 font-display text-sm font-bold uppercase tracking-widest",
							children: r.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: r.city
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex items-center justify-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							"aria-label": text("testimonials.text_3", "Précédent"),
							onClick: () => setI((v) => (v - 1 + reviews.length) % reviews.length),
							className: "btn-3d btn-3d-steel p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-2",
							children: reviews.map((_, d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								"aria-label": `Avis ${d + 1}`,
								onClick: () => setI(d),
								className: `h-2 rounded-full transition-all ${d === i % reviews.length ? "w-7 bg-primary" : "w-2 bg-border"}`
							}, d))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							"aria-label": text("testimonials.text_4", "Suivant"),
							onClick: () => setI((v) => (v + 1) % reviews.length),
							className: "btn-3d btn-3d-steel p-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
						})
					]
				})
			] })
		})]
	});
}
function Showroom() {
	const text = useSiteText();
	const hours = useSiteCollection("showroom.items");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		id: "showroom",
		className: "mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-32",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-10 lg:grid-cols-2 lg:items-stretch",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass-panel h-full rounded-2xl p-8 sm:p-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold uppercase tracking-[0.3em] text-primary",
						children: text("showroom.text_1", "Showroom")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-4 text-4xl font-bold",
						children: text("showroom.text_2", "Venez nous voir à Sfax")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 space-y-5 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-5 w-5 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground",
									children: text("showroom.text_3", "Route de Tunis km 4, Sfax 3000, Tunisie")
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "mt-0.5 h-5 w-5 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: text("identity.phone_link", "tel:+21674000000"),
									className: "text-muted-foreground hover:text-foreground",
									children: text("identity.phone", "+216 74 000 000")
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "mt-0.5 h-5 w-5 shrink-0 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "w-full space-y-1.5",
									children: hours.map(({ day: d, time: h }, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "flex justify-between gap-4 text-muted-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: d }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground",
											children: h
										})]
									}, index))
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-9 flex flex-wrap gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BtnLink, {
								href: text("showroom.link_1", "https://www.google.com/maps/search/?api=1&query=Sfax+Tunisie"),
								target: "_blank",
								rel: "noopener noreferrer",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "h-4 w-4" }),
									" ",
									text("showroom.text_4", "Itinéraire")
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BtnLink, {
								href: text("identity.whatsapp", "https://wa.me/21674000000"),
								target: "_blank",
								rel: "noopener noreferrer",
								variant: "steel",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4" }),
									" ",
									text("showroom.text_5", "WhatsApp")
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BtnLink, {
								href: text("identity.phone_link", "tel:+21674000000"),
								variant: "steel",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-4 w-4" }),
									" ",
									text("showroom.text_6", "Appeler")
								]
							})
						]
					})
				]
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reveal, {
				delay: 120,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "glass-panel h-full min-h-[380px] overflow-hidden rounded-2xl p-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						title: text("showroom.text_7", "Carte du showroom Auto Kontor Sfax"),
						src: text("showroom.map_1", "https://www.openstreetmap.org/export/embed.html?bbox=10.68%2C34.70%2C10.82%2C34.79&layer=mapnik"),
						loading: "lazy",
						className: "h-full min-h-[364px] w-full rounded-xl grayscale-[0.6] contrast-125"
					})
				})
			})]
		})
	});
}
function Index() {
	const text = useSiteText();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navbar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { children: [
			text("sections.hero", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hero, {}),
			text("sections.inventory", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inventory, {}),
			text("sections.sell", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SellCarBanner, { className: "pb-24 lg:pb-32" }),
			text("sections.about", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(About, {}),
			text("sections.services", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Services, {}),
			text("sections.testimonials", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Testimonials, {}),
			text("sections.showroom", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Showroom, {}),
			text("sections.contact", "true") === "true" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactFooter, {})
		] })]
	});
}
//#endregion
export { Index as component };
