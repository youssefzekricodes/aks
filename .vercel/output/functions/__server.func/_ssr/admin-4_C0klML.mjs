import { r as __toESM } from "../_runtime.mjs";
import { c as require_react, i as useQuery, o as useQueryClient, s as require_jsx_runtime, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { g as Link, l as useBlocker, v as useNavigate, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as listAllCars, c as saveCar, d as setLeadHandled, i as deleteCar, l as saveSiteContent, o as listLeads, s as listSiteContent, u as setCarPublished } from "./queries-DK4crW-I.mjs";
import { a as CONTENT_GROUPS, c as validateContentValue, i as CONTENT_FIELDS, n as COLLECTION_LABELS, o as SERVICE_ICONS, t as COLLECTION_DEFAULTS } from "./definition-BxYhf0sv.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as signOut } from "./router-D3oCTAsw.mjs";
import { a as CAR_STATES, i as CAR_GEARBOXES, n as CAR_COUNTRIES, o as carImage, r as CAR_FUELS, t as CAR_BODIES } from "./cars-bbHZOFrw.mjs";
import { E as CloudUpload, F as ArrowUp, L as ArrowLeft, R as ArrowDown, d as Plus, l as Search, r as Trash2, v as LogOut, w as ExternalLink, y as LoaderCircle } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-4_C0klML.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function readFileAsDataUrl(file) {
	if (![
		"image/jpeg",
		"image/png",
		"image/webp"
	].includes(file.type) || file.size > 2e6) return Promise.reject(/* @__PURE__ */ new Error("Choisissez une image JPG, PNG ou WebP de moins de 2 Mo."));
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Lecture impossible."));
		reader.readAsDataURL(file);
	});
}
/** Crop vehicle photos to the catalog's 4:3 format before they are stored. */
async function readVehicleImageAsDataUrl(file) {
	if (![
		"image/jpeg",
		"image/png",
		"image/webp"
	].includes(file.type) || file.size > 2e6) throw new Error("Choisissez une image JPG, PNG ou WebP de moins de 2 Mo.");
	const sourceUrl = URL.createObjectURL(file);
	try {
		const image = await new Promise((resolve, reject) => {
			const element = new Image();
			element.onload = () => resolve(element);
			element.onerror = () => reject(/* @__PURE__ */ new Error("Lecture impossible."));
			element.src = sourceUrl;
		});
		const targetRatio = 4 / 3;
		const sourceRatio = image.naturalWidth / image.naturalHeight;
		const sourceWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
		const sourceHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
		const sourceX = (image.naturalWidth - sourceWidth) / 2;
		const sourceY = (image.naturalHeight - sourceHeight) / 2;
		const width = Math.min(1600, Math.round(sourceWidth));
		const height = Math.round(width / targetRatio);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Traitement de l’image impossible.");
		context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
		return canvas.toDataURL("image/jpeg", .88);
	} finally {
		URL.revokeObjectURL(sourceUrl);
	}
}
var inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal";
var hiddenGroups = /* @__PURE__ */ new Set([
	"navbar",
	"card",
	"vehicle",
	"search"
]);
var editorFields = CONTENT_FIELDS.filter((field) => !hiddenGroups.has(field.group) && field.key !== "contact.items");
var editorGroups = Object.entries(CONTENT_GROUPS).filter(([key]) => !hiddenGroups.has(key));
function ContentEditor() {
	const client = useQueryClient();
	const router = useRouter();
	const content = useQuery({
		queryKey: ["admin-site-content"],
		queryFn: () => listSiteContent()
	});
	const [group, setGroup] = (0, import_react.useState)("identity");
	const [search, setSearch] = (0, import_react.useState)("");
	const [draft, setDraft] = (0, import_react.useState)({});
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const saved = Object.fromEntries((content.data ?? []).map((row) => [row.key, row.value]));
	const entries = Object.entries(draft).map(([key, value]) => ({
		key,
		value
	}));
	const valueOf = (field) => draft[field.key] ?? saved[field.key] ?? field.value;
	const errors = editorFields.map((field) => validateContentValue(field, valueOf(field))).filter(Boolean);
	const save = useMutation({
		mutationFn: () => saveSiteContent({ data: { entries } }),
		onSuccess: async () => {
			await Promise.all([client.invalidateQueries({ queryKey: ["admin-site-content"] }), client.invalidateQueries({ queryKey: ["site-content"] })]);
			setDraft({});
			await router.invalidate();
			toast.success("Les modifications sont publiées sur le site.");
		},
		onError: (error) => toast.error(error.message)
	});
	useBlocker({
		shouldBlockFn: ({ next }) => entries.length > 0 && next.pathname !== "/auth" && !window.confirm("Des modifications ne sont pas publiées. Quitter cette page et les abandonner ?"),
		enableBeforeUnload: entries.length > 0
	});
	function change(field, value) {
		setDraft((current) => {
			const next = { ...current };
			if (value === (saved[field.key] ?? field.value)) delete next[field.key];
			else next[field.key] = value;
			return next;
		});
	}
	const visible = editorFields.filter((field) => search.trim() ? `${CONTENT_GROUPS[field.group]} ${field.label} ${field.type === "image" ? "" : valueOf(field)}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr").trim()) : field.group === group);
	if (content.isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "status",
		children: "Chargement du contenu…"
	});
	if (content.isError) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "alert",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Impossible de charger le contenu." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: () => content.refetch(),
			className: "mt-3 underline",
			children: "Réessayer"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl font-bold",
					children: "Gérer le contenu du site"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm text-muted-foreground",
					children: "Modifiez chaque rubrique, puis publiez vos changements. Les véhicules et leurs photos se gèrent dans l’onglet Véhicules."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: "/",
					target: "_blank",
					rel: "noopener noreferrer",
					className: "inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-4 w-4" }), "Voir le site"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-3 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					"aria-label": "Rechercher un contenu",
					placeholder: "Rechercher un texte ou une rubrique…",
					className: `${inputClass} pl-10`,
					value: search,
					onChange: (event) => setSearch(event.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					"aria-label": "Rubriques de contenu",
					className: "flex gap-2 overflow-x-auto md:block md:space-y-1",
					children: editorGroups.map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => {
							setGroup(key);
							setSearch("");
						},
						"aria-current": group === key && !search ? "page" : void 0,
						className: `block shrink-0 rounded-lg px-3 py-2.5 text-left text-sm md:w-full ${group === key && !search ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`,
						children: [label, editorFields.some((field) => field.group === key && draft[field.key] !== void 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							"aria-label": "Modifications non publiées",
							children: " •"
						})]
					}, key))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
					disabled: save.isPending || uploading,
					className: "min-w-0 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-semibold",
								children: search ? `${visible.length} résultat(s)` : CONTENT_GROUPS[group]
							}), !search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => visible.forEach((field) => change(field, field.value)),
								className: "text-xs text-muted-foreground underline",
								children: "Rétablir les valeurs initiales de cette rubrique"
							})]
						}),
						visible.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentInput, {
							field,
							value: valueOf(field),
							onChange: (value) => change(field, value),
							onUploading: setUploading
						}, field.key)),
						!visible.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Aucun contenu trouvé."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "sticky bottom-3 z-20 rounded-xl border border-border bg-background/95 p-4 shadow-xl backdrop-blur",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						"aria-live": "polite",
						className: "text-sm",
						children: [entries.length ? `${entries.length} modification(s) non publiée(s)` : "Toutes les modifications sont publiées.", uploading && " Chargement de l’image…"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !entries.length || save.isPending || uploading,
							onClick: () => setDraft({}),
							className: "rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40",
							children: "Annuler les modifications"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !entries.length || save.isPending || uploading || errors.length > 0,
							onClick: () => save.mutate(),
							className: "btn-3d btn-3d-primary px-5 py-2 text-sm disabled:opacity-40",
							children: save.isPending ? "Publication…" : "Publier les modifications"
						})]
					})]
				}), errors.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					className: "mt-3 text-sm text-destructive",
					children: errors[0]
				})]
			})
		]
	});
}
function ContentInput({ field, value, onChange, onUploading }) {
	const id = `content-${field.key}`;
	const error = validateContentValue(field, value);
	if (field.type === "collection") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CollectionInput, {
		field,
		value,
		onChange
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2 rounded-xl border border-border bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				htmlFor: id,
				className: "block text-sm font-semibold",
				children: field.label
			}),
			field.type === "boolean" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					id,
					type: "checkbox",
					checked: value === "true",
					onChange: (event) => onChange(String(event.target.checked))
				}), "Visible sur la page d’accueil"]
			}) : field.type === "textarea" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				id,
				rows: 4,
				value,
				onChange: (event) => onChange(event.target.value),
				className: inputClass
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id,
				value,
				onChange: (event) => onChange(event.target.value),
				className: inputClass,
				type: "text"
			}),
			field.type === "image" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [value && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: value,
					alt: `Aperçu — ${field.label}`,
					className: "max-h-44 max-w-full rounded-lg border border-border object-contain"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block text-xs text-muted-foreground",
					children: ["Choisir une image JPG, PNG ou WebP (2 Mo maximum)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						"aria-label": `Importer — ${field.label}`,
						type: "file",
						accept: "image/jpeg,image/png,image/webp",
						className: "mt-2 block w-full text-sm",
						onChange: async (event) => {
							const file = event.target.files?.[0];
							if (!file) return;
							onUploading(true);
							try {
								onChange(await readFileAsDataUrl(file));
							} catch (error) {
								toast.error(error instanceof Error ? error.message : "Import impossible.");
							} finally {
								onUploading(false);
							}
						}
					})]
				})]
			}),
			field.type === "map" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Collez l’URL d’intégration Google Maps ou OpenStreetMap, sans code HTML."
			}),
			field.type === "link" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Lien web, ancre (#contact), chemin (/recherche), téléphone (tel:) ou e-mail (mailto:)."
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				role: "alert",
				className: "text-xs text-destructive",
				children: error
			})
		]
	});
}
function CollectionInput({ field, value, onChange }) {
	const template = COLLECTION_DEFAULTS[field.key][0];
	let rows;
	try {
		rows = JSON.parse(value);
	} catch {
		rows = [];
	}
	const update = (next) => onChange(JSON.stringify(next));
	const move = (index, by) => {
		const next = [...rows];
		[next[index], next[index + by]] = [next[index + by], next[index]];
		update(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-4 rounded-xl border border-border bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
				className: "font-semibold",
				children: field.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: "Ajoutez, supprimez ou déplacez les éléments. Une liste vide n’affiche aucun élément."
			})] }),
			rows.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
				className: "space-y-3 rounded-lg border border-border p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("legend", {
						className: "px-2 text-sm font-medium",
						children: ["Élément ", index + 1]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-end gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: index === 0,
								onClick: () => move(index, -1),
								"aria-label": `Monter l’élément ${index + 1}`,
								className: "rounded border p-2 disabled:opacity-30",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: index === rows.length - 1,
								onClick: () => move(index, 1),
								"aria-label": `Descendre l’élément ${index + 1}`,
								className: "rounded border p-2 disabled:opacity-30",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => update(rows.filter((_, i) => i !== index)),
								"aria-label": `Supprimer l’élément ${index + 1}`,
								className: "rounded border p-2 text-destructive",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})
						]
					}),
					Object.entries(template).map(([key, example]) => {
						const change = (next) => update(rows.map((item, i) => i === index ? {
							...item,
							[key]: next
						} : item));
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block space-y-1 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: COLLECTION_LABELS[key] ?? key }), key === "icon" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: row[key],
								onChange: (event) => change(event.target.value),
								className: inputClass,
								children: SERVICE_ICONS.map((icon, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: icon,
									children: [
										"Financement",
										"Reprise",
										"Atelier",
										"Importation",
										"Garantie"
									][i]
								}, icon))
							}) : key === "text" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: row[key],
								onChange: (event) => change(event.target.value),
								rows: 3,
								className: inputClass
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: typeof example === "number" ? "number" : "text",
								min: key === "stars" ? 1 : 0,
								max: key === "stars" ? 5 : 1e8,
								step: 1,
								value: row[key],
								onChange: (event) => change(typeof example === "number" ? Number(event.target.value) : event.target.value),
								className: inputClass
							})]
						}, key);
					})
				]
			}, index)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				disabled: rows.length >= 30,
				onClick: () => update([...rows, Object.fromEntries(Object.entries(template).map(([key, example]) => [key, typeof example === "number" ? key === "stars" ? 5 : 0 : key === "icon" ? "ShieldCheck" : ""]))]),
				className: "inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "Ajouter un élément"]
			})
		]
	});
}
var emptyCar = {
	slug: "",
	name: "",
	brand: "",
	country: "Germany",
	year: (/* @__PURE__ */ new Date()).getFullYear(),
	price: 0,
	km: "0 km",
	km_value: 0,
	fuel: "Essence",
	gearbox: "Auto",
	body: "Berline",
	state: "Occasion",
	images: [],
	description: "",
	published: false,
	sort_order: 0
};
function slugify(value) {
	return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
var tabs = [
	{
		id: "cars",
		label: "Véhicules"
	},
	{
		id: "content",
		label: "Contenu du site"
	},
	{
		id: "leads",
		label: "Demandes"
	}
];
function AdminPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [tab, setTab] = (0, import_react.useState)("cars");
	async function signOut$1() {
		try {
			await signOut();
		} catch {
			toast.error("Déconnexion impossible. Veuillez réessayer.");
			return;
		}
		await queryClient.cancelQueries();
		queryClient.clear();
		navigate({
			to: "/auth",
			replace: true
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b border-border",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 lg:px-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), "Voir le site"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: signOut$1,
					className: "inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), "Déconnexion"]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-6xl px-5 py-10 lg:px-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-bold sm:text-4xl",
					children: "Tableau de bord"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 flex flex-wrap gap-2 border-b border-border",
					children: tabs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTab(t.id),
						className: `-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
						children: t.label
					}, t.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8",
					children: [
						tab === "cars" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CarsTab, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							hidden: tab !== "content",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContentEditor, {})
						}),
						tab === "leads" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeadsTab, {})
					]
				})
			]
		})]
	});
}
function CarsTab() {
	const queryClient = useQueryClient();
	const [editing, setEditing] = (0, import_react.useState)(null);
	const cars = useQuery({
		queryKey: ["admin-cars"],
		queryFn: () => listAllCars()
	});
	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["admin-cars"] });
		queryClient.invalidateQueries({ queryKey: ["public-cars"] });
	};
	const save = useMutation({
		mutationFn: (data) => saveCar({ data }),
		onSuccess: () => {
			toast.success("Véhicule enregistré.");
			setEditing(null);
			invalidate();
		},
		onError: (e) => toast.error(e.message)
	});
	const publish = useMutation({
		mutationFn: (data) => setCarPublished({ data }),
		onSuccess: invalidate,
		onError: (e) => toast.error(e.message)
	});
	const remove = useMutation({
		mutationFn: (id) => deleteCar({ data: { id } }),
		onSuccess: () => {
			toast.success("Véhicule supprimé.");
			invalidate();
		},
		onError: (e) => toast.error(e.message)
	});
	if (editing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CarForm, {
		value: editing,
		onChange: setEditing,
		onCancel: () => setEditing(null),
		onSave: () => save.mutate(editing),
		saving: save.isPending
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => setEditing({ ...emptyCar }),
		className: "btn-3d btn-3d-primary inline-flex items-center gap-2 px-6 py-3 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "Ajouter un véhicule"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-8 grid gap-4",
		children: [(cars.data ?? []).map((car) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: carImage(car),
					alt: car.name,
					className: "h-16 w-24 rounded object-cover"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-40 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-semibold",
						children: [
							car.brand,
							" ",
							car.name
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted-foreground",
						children: [
							car.year,
							" · ",
							car.km,
							" · ",
							car.price.toLocaleString("fr-FR"),
							" DT"
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `rounded-full px-3 py-1 text-xs font-semibold ${car.published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`,
					children: car.published ? "Publié" : "Brouillon"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => publish.mutate({
						id: car.id,
						published: !car.published
					}),
					className: "rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary",
					children: car.published ? "Dépublier" : "Publier"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setEditing({ ...car }),
					className: "rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary",
					children: "Modifier"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						if (confirm(`Supprimer ${car.brand} ${car.name} ?`)) remove.mutate(car.id);
					},
					className: "rounded-md border border-border p-2 text-muted-foreground hover:border-destructive hover:text-destructive",
					"aria-label": "Supprimer",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
				})
			]
		}, car.id)), cars.data?.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: "Aucun véhicule pour le moment."
		})]
	})] });
}
function CarForm({ value, onChange, onCancel, onSave, saving }) {
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const photoInput = (0, import_react.useRef)(null);
	const set = (key, v) => onChange({
		...value,
		[key]: v
	});
	async function handleFiles(files) {
		if (!files?.length) return;
		if (value.images.length + files.length > 12) {
			toast.error("Maximum 12 photos par véhicule.");
			return;
		}
		setUploading(true);
		try {
			const urls = [];
			for (const file of Array.from(files)) urls.push(await readVehicleImageAsDataUrl(file));
			onChange({
				...value,
				images: [...value.images, ...urls]
			});
			toast.success("Photos ajoutées.");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Envoi impossible.");
		} finally {
			setUploading(false);
		}
	}
	const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => {
			e.preventDefault();
			onSave();
		},
		className: "grid gap-5 rounded-lg border border-border bg-card p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Marque", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							value: value.brand,
							onChange: (e) => set("brand", e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Modèle", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							value: value.name,
							onChange: (e) => {
								const name = e.target.value;
								onChange({
									...value,
									name,
									slug: value.slug || slugify(`${value.brand} ${name}`)
								});
							},
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Identifiant d'URL", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: inputClass,
							value: value.slug,
							onChange: (e) => set("slug", slugify(e.target.value)),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Prix (DT)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							className: inputClass,
							value: value.price,
							onChange: (e) => set("price", Number(e.target.value)),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Année", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							className: inputClass,
							value: value.year,
							onChange: (e) => set("year", Number(e.target.value)),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Kilométrage (km)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							className: inputClass,
							value: value.km_value,
							onChange: (e) => {
								const km_value = Number(e.target.value);
								onChange({
									...value,
									km_value,
									km: `${km_value.toLocaleString("fr-FR")} km`
								});
							}
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Origine", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: inputClass,
							value: value.country,
							onChange: (e) => set("country", e.target.value),
							children: CAR_COUNTRIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Carrosserie", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: inputClass,
							value: value.body,
							onChange: (e) => set("body", e.target.value),
							children: CAR_BODIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Carburant", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: inputClass,
							value: value.fuel,
							onChange: (e) => set("fuel", e.target.value),
							children: CAR_FUELS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Boîte", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: inputClass,
							value: value.gearbox,
							onChange: (e) => set("gearbox", e.target.value),
							children: CAR_GEARBOXES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["État", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: inputClass,
							value: value.state,
							onChange: (e) => set("state", e.target.value),
							children: CAR_STATES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: c,
								children: c
							}, c))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "grid gap-2 text-sm font-semibold",
						children: ["Ordre d'affichage", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "number",
							className: inputClass,
							value: value.sort_order,
							onChange: (e) => set("sort_order", Number(e.target.value))
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "grid gap-2 text-sm font-semibold",
				children: ["Description", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					rows: 5,
					className: inputClass,
					value: value.description,
					onChange: (e) => set("description", e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: "Photos du véhicule"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-muted-foreground",
							"aria-live": "polite",
							children: [value.images.length, " / 12 photos"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-3",
						children: value.images.map((img, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: img,
								alt: `Photo ${i + 1}`,
								className: "h-20 w-28 rounded object-cover"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Retirer la photo",
								onClick: () => set("images", value.images.filter((x) => x !== img)),
								className: "absolute -right-2 -top-2 rounded-full border border-border bg-background p-1",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" })
							})]
						}, img))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: photoInput,
						type: "file",
						accept: "image/jpeg,image/png,image/webp",
						multiple: true,
						onChange: async (e) => {
							const input = e.currentTarget;
							await handleFiles(input.files);
							input.value = "";
						},
						disabled: uploading || saving || value.images.length >= 12,
						className: "hidden",
						"aria-label": "Choisir les photos du véhicule"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => photoInput.current?.click(),
						disabled: uploading || saving || value.images.length >= 12,
						"aria-busy": uploading,
						className: "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-8 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
						children: [
							uploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, {
								className: "h-8 w-8 animate-spin text-primary",
								"aria-hidden": "true"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudUpload, {
								className: "h-8 w-8 text-primary",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold",
								children: uploading ? "Ajout des photos…" : value.images.length >= 12 ? "Limite de 12 photos atteinte" : "Cliquez ici pour ajouter des photos"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: "JPG, PNG ou WebP · 2 Mo maximum par photo · Recadrage automatique au format 4:3"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-3 text-sm font-semibold",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: value.published,
					onChange: (e) => set("published", e.target.checked)
				}), "Publier sur le site"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: saving || uploading,
					className: "btn-3d btn-3d-primary px-6 py-3 text-sm",
					children: saving ? "Enregistrement…" : "Enregistrer"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onCancel,
					className: "rounded-md border border-border px-6 py-3 text-sm font-semibold",
					children: "Annuler"
				})]
			})
		]
	});
}
function LeadsTab() {
	const queryClient = useQueryClient();
	const leads = useQuery({
		queryKey: ["admin-leads"],
		queryFn: () => listLeads()
	});
	const handled = useMutation({
		mutationFn: (data) => setLeadHandled({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-leads"] }),
		onError: (e) => toast.error(e.message)
	});
	if (leads.data?.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted-foreground",
		children: "Aucune demande reçue pour l'instant."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-4",
		children: (leads.data ?? []).map((lead) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-border bg-card p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: lead.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => handled.mutate({
							id: lead.id,
							handled: !lead.handled
						}),
						className: "rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-primary",
						children: lead.handled ? "Marquer à traiter" : "Marquer traitée"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: [
						lead.phone,
						" ",
						lead.email && `· ${lead.email}`,
						" ·",
						" ",
						new Date(lead.created_at).toLocaleString("fr-FR")
					]
				}),
				lead.car_slug && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-primary",
					children: ["Véhicule : ", lead.car_slug]
				}),
				lead.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 whitespace-pre-line text-sm",
					children: lead.message
				})
			]
		}, lead.id))
	});
}
var SplitComponent = AdminPage;
//#endregion
export { SplitComponent as component };
