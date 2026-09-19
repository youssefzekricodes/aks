import { r as __toESM } from "../_runtime.mjs";
import { c as require_react, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { r as createLead } from "./queries-DK4crW-I.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as Facebook, _ as Mail } from "../_libs/lucide-react.mjs";
import { t as Btn } from "./Btn-DYEvAKAi.mjs";
import { a as useSiteText, i as useSiteCollection, n as Reveal } from "./Reveal-BE801ec-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ContactFooter-D0VonlME.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ContactFooter() {
	const text = useSiteText();
	const quickLinks = useSiteCollection("contact.items");
	const [sending, setSending] = (0, import_react.useState)(false);
	const [message, setMessage] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const prefillMessage = (event) => {
			const detail = event.detail;
			if (detail?.message) setMessage(detail.message);
		};
		window.addEventListener("prefill-contact-message", prefillMessage);
		return () => window.removeEventListener("prefill-contact-message", prefillMessage);
	}, []);
	const onSubmit = async (e) => {
		e.preventDefault();
		if (sending) return;
		const form = e.currentTarget;
		const values = new FormData(form);
		setSending(true);
		try {
			await createLead({
				name: String(values.get("name")),
				phone: String(values.get("phone")),
				message: String(values.get("message"))
			});
			toast.success(text("contact.success", "Message enregistré. Notre équipe vous contactera."));
			form.reset();
			setMessage("");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Envoi impossible.");
		} finally {
			setSending(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		id: "contact",
		className: "relative overflow-hidden border-t border-border bg-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			"aria-hidden": true,
			className: "absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary/15 blur-[140px]"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative mx-auto max-w-3xl px-5 py-24 lg:py-32",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Reveal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold uppercase tracking-[0.3em] text-primary",
						children: text("contact.text_1", "Contact")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-4 text-4xl font-bold sm:text-5xl",
						children: text("contact.text_2", "Parlons de votre projet")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-muted-foreground",
						children: text("contact.text_3", "Essai, reprise ou commande spécifique — écrivez-nous, on vous répond vite.")
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "glass-panel mt-10 space-y-5 rounded-2xl p-7 sm:p-9",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-5 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "name",
							className: "mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
							children: text("contact.text_4", "Nom")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "name",
							name: "name",
							required: true,
							placeholder: text("contact.text_5", "Votre nom"),
							className: "input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "phone",
							className: "mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
							children: text("contact.text_6", "Téléphone")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "phone",
							name: "phone",
							type: "tel",
							required: true,
							placeholder: text("contact.text_7", "+216 ..."),
							className: "input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						htmlFor: "message",
						className: "mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
						children: text("contact.text_8", "Message")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "message",
						name: "message",
						rows: 5,
						required: true,
						placeholder: text("contact.text_9", "Quel véhicule vous intéresse ?"),
						value: message,
						onChange: (event) => setMessage(event.target.value),
						className: "input-depth w-full resize-none rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
						type: "submit",
						size: "lg",
						className: "w-full",
						disabled: sending,
						children: sending ? text("contact.sending", "Envoi…") : text("contact.submit", "Envoyer le message")
					})
				]
			})] })
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "border-t border-border bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "sm:col-span-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: text("identity.logo", "/images/aks-logo.png"),
								alt: text("contact.text_10", "Auto Kontor Sfax"),
								width: 132,
								height: 44,
								loading: "lazy",
								className: "h-11 w-[132px] object-contain"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-display text-sm font-bold uppercase tracking-[0.22em]",
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-sm text-sm text-muted-foreground",
							children: text("contact.text_12", "Showroom automobile premium à Sfax. Vente, reprise, financement et importation de véhicules sélectionnés.")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: text("contact.link_1", "https://www.facebook.com/profile.php?id=61560475294948"),
								target: "_blank",
								rel: "noopener noreferrer",
								"aria-label": text("contact.text_13", "Facebook"),
								className: "btn-3d btn-3d-steel p-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Facebook, { className: "h-4 w-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: text("contact.link_2", "https://mail.google.com/mail/?view=cm&fs=1&to=autokontorsfax@gmail.com"),
								target: "_blank",
								rel: "noopener noreferrer",
								"aria-label": text("contact.text_14", "Gmail"),
								className: "btn-3d btn-3d-steel p-2.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4" })
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-semibold uppercase tracking-widest text-foreground",
					children: text("contact.text_15", "Navigation")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 space-y-2.5 text-sm",
					children: quickLinks.map((l, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: l.href,
						className: "text-muted-foreground hover:text-foreground",
						children: l.label
					}) }, index))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xs font-semibold uppercase tracking-widest text-foreground",
					children: text("contact.text_16", "Coordonnées")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-4 space-y-2.5 text-sm text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: text("contact.text_17", "Route de Tunis km 4, Sfax 3000") }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: text("identity.phone_link", "tel:+21674000000"),
							className: "hover:text-foreground",
							children: text("identity.phone", "+216 74 000 000")
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: text("identity.email_link", "mailto:contact@autokontorsfax.tn"),
							className: "hover:text-foreground",
							children: text("identity.email", "contact@autokontorsfax.tn")
						}) })
					]
				})] })
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-t border-border py-6 text-center text-xs text-muted-foreground",
			children: [
				"© ",
				(/* @__PURE__ */ new Date()).getFullYear(),
				" ",
				text("contact.text_18", "Auto Kontor Sfax. Tous droits réservés.")
			]
		})]
	})] });
}
//#endregion
export { ContactFooter as t };
