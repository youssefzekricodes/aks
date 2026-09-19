import { r as __toESM } from "../_runtime.mjs";
import { c as require_react, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Route } from "./router-D3oCTAsw.mjs";
import { o as carImage } from "./cars-bbHZOFrw.mjs";
import { L as ArrowLeft, N as Calendar, O as ChevronRight, S as Fuel, T as Earth, b as Images, c as Settings2, i as Tag, j as Check, k as ChevronLeft, m as MessageCircle, t as X, x as Gauge } from "../_libs/lucide-react.mjs";
import { a as useSiteText, i as useSiteCollection, r as SellCarBanner, t as Navbar } from "./Reveal-BE801ec-.mjs";
import { t as ContactFooter } from "./ContactFooter-D0VonlME.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/vehicule._slug-CE2kWZii.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function VehiculePage() {
	const benefits = useSiteCollection("vehicle.items");
	const text = useSiteText();
	const { car } = Route.useLoaderData();
	const [activeImage, setActiveImage] = (0, import_react.useState)(0);
	const [isGalleryOpen, setIsGalleryOpen] = (0, import_react.useState)(false);
	const sideImages = car.images.slice(1, 4);
	const hasMoreImages = car.images.length > 4;
	const specs = [
		{
			icon: Calendar,
			label: text("vehicle.text_1", "Année"),
			value: String(car.year)
		},
		{
			icon: Gauge,
			label: text("vehicle.text_2", "Kilométrage"),
			value: car.km
		},
		{
			icon: Fuel,
			label: text("vehicle.text_3", "Carburant"),
			value: car.fuel
		},
		{
			icon: Settings2,
			label: text("vehicle.text_4", "Boîte"),
			value: car.gearbox
		},
		{
			icon: Tag,
			label: text("vehicle.text_5", "Carrosserie"),
			value: car.body
		},
		{
			icon: Earth,
			label: text("vehicle.text_6", "Origine"),
			value: car.country
		}
	];
	const prefillContactMessage = (message) => {
		window.dispatchEvent(new CustomEvent("prefill-contact-message", { detail: { message } }));
	};
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
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), text("vehicle.text_7", "Retour à l'inventaire")]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-8 grid gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(260px,1fr)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative min-h-[320px] overflow-hidden rounded-lg border border-border bg-card sm:min-h-[520px] lg:min-h-[640px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: carImage(car, activeImage),
								alt: `${car.brand} ${car.name} — vue ${activeImage + 1}`,
								width: 1536,
								height: 1024,
								className: "h-full w-full object-cover"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-foreground backdrop-blur-lg",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Images, { className: "h-4 w-4 text-primary" }),
									activeImage + 1,
									" / ",
									car.images.length
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-3 gap-3 lg:grid-cols-1 lg:grid-rows-3",
							children: sideImages.map((image, index) => {
								const imageIndex = index + 1;
								const isMoreTile = hasMoreImages && index === sideImages.length - 1;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-label": isMoreTile ? `Afficher les ${car.images.length - 3} photos supplémentaires` : `Afficher la vue ${imageIndex + 1}`,
									"aria-pressed": activeImage === imageIndex,
									onClick: () => {
										if (isMoreTile) {
											setActiveImage(imageIndex);
											setIsGalleryOpen(true);
										} else setActiveImage(imageIndex);
									},
									className: `relative min-h-28 overflow-hidden rounded-lg border bg-card transition-colors sm:min-h-40 lg:min-h-0 ${activeImage === imageIndex ? "border-primary" : "border-border hover:border-primary/60"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: image,
										alt: `${car.brand} ${car.name} — miniature ${imageIndex + 1}`,
										width: 512,
										height: 1024,
										loading: "lazy",
										className: "absolute inset-0 h-full w-full object-cover"
									}), isMoreTile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "absolute inset-0 flex items-center justify-center gap-2 bg-primary/75 text-xl font-bold text-primary-foreground backdrop-blur-[1px]",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Images, { className: "h-6 w-6" }),
											"+",
											car.images.length - 3
										]
									})]
								}, image);
							})
						})]
					}),
					isGalleryOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						role: "dialog",
						"aria-modal": "true",
						"aria-label": `Galerie photos de ${car.brand} ${car.name}`,
						className: "fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4",
						onClick: () => setIsGalleryOpen(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex h-full w-full max-w-6xl flex-col justify-center",
							onClick: (event) => event.stopPropagation(),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setIsGalleryOpen(false),
									className: "absolute right-0 top-0 z-10 rounded-full bg-background/90 p-3 text-foreground transition-colors hover:bg-background",
									"aria-label": "Fermer la galerie",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: carImage(car, activeImage),
									alt: `${car.brand} ${car.name} — vue ${activeImage + 1}`,
									className: "mx-auto max-h-[78vh] max-w-full rounded-lg object-contain"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 flex items-center justify-center gap-4 text-sm font-semibold text-white",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setActiveImage((current) => (current - 1 + car.images.length) % car.images.length),
											className: "rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25",
											"aria-label": "Photo précédente",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-5 w-5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											activeImage + 1,
											" / ",
											car.images.length
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setActiveImage((current) => (current + 1) % car.images.length),
											className: "rounded-full bg-white/15 p-2 transition-colors hover:bg-white/25",
											"aria-label": "Photo suivante",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-5 w-5" })
										})
									]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "border-b border-border py-8 sm:flex sm:items-end sm:justify-between sm:gap-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "inline-flex w-fit items-center rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground",
								children: car.state
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "mt-4 text-4xl font-bold sm:text-5xl",
								children: [
									car.brand,
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-primary",
										children: car.name
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: text("vehicle.text_8", "Disponible dans notre showroom à Sfax")
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-5 shrink-0 font-display text-3xl font-bold text-primary sm:mt-0 sm:text-4xl",
							children: [
								car.price.toLocaleString("fr-FR"),
								" ",
								text("vehicle.text_9", "DT")
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-bold uppercase tracking-[0.22em] text-primary",
									children: text("vehicle.text_10", "Présentation")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-3 text-2xl font-bold sm:text-3xl",
									children: text("vehicle.text_11", "Description du véhicule")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-5 max-w-3xl text-base leading-8 text-muted-foreground",
									children: car.description
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-4 max-w-3xl text-base leading-8 text-muted-foreground",
									children: text("vehicle.textarea_1", "Le véhicule est visible sur rendez-vous chez Auto Kontor Sfax. Notre équipe peut vous accompagner pour l'essai, la reprise de votre ancien véhicule et les solutions de financement.")
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "mt-12 border-t border-border pt-10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-2xl font-bold",
									children: text("vehicle.text_12", "Caractéristiques")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3",
									children: specs.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "bg-card p-5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "h-5 w-5 text-primary" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
												children: s.label
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1 font-semibold text-foreground",
												children: s.value
											})
										]
									}, s.label))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "mt-12 border-t border-border pt-10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-2xl font-bold",
									children: text("vehicle.text_13", "Services inclus")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-5 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2",
									children: benefits.map(({ text: item }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "flex items-center gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 shrink-0 text-primary" }), item]
									}, item))
								})]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
							className: "h-fit rounded-lg border border-border bg-card p-6 lg:sticky lg:top-28",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-7 w-7 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-4 text-2xl font-bold",
									children: text("vehicle.text_14", "Ce véhicule vous intéresse ?")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 text-sm leading-6 text-muted-foreground",
									children: text("vehicle.text_15", "Échangez avec notre équipe pour vérifier sa disponibilité ou organiser un essai.")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-7 grid gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: text("vehicle.link_1", "#contact"),
										onClick: () => prefillContactMessage(`Bonjour, je souhaite réserver un essai pour la ${car.brand} ${car.name} (${car.year}). Pouvez-vous me communiquer vos disponibilités ?`),
										className: "btn-3d btn-3d-primary px-7 py-4 text-base",
										children: text("vehicle.text_16", "Réserver un essai")
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: text("vehicle.link_1", "#contact"),
										onClick: () => prefillContactMessage(`Bonjour, je souhaite recevoir une offre pour la ${car.brand} ${car.name} (${car.year}). Merci de me recontacter.`),
										className: "btn-3d btn-3d-steel px-7 py-4 text-base",
										children: text("vehicle.text_17", "Demander une offre")
									})]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SellCarBanner, { className: "mt-16 px-0" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactFooter, {})
		]
	});
}
//#endregion
export { VehiculePage as component };
