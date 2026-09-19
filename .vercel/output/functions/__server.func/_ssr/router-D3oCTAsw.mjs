import { r as __toESM } from "../_runtime.mjs";
import { a as QueryClientProvider, c as require_react, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { F as notFound, M as redirect, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { f as __exportAll, i as createServerFn } from "./server-B7tKpuFj.mjs";
import { a as objectType, o as stringType } from "../_libs/zod.mjs";
import { f as createSsrRpc, n as siteContentQuery, t as publicCarsQuery } from "./queries-DK4crW-I.mjs";
import { s as resolveContent } from "./definition-BxYhf0sv.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-D3oCTAsw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-CpVw23-l.css";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		console.error(error);
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$6 = createRootRouteWithContext()({
	loader: async ({ context }) => ({ content: await context.queryClient.ensureQueryData(siteContentQuery) }),
	head: ({ loaderData }) => {
		const favicon = resolveContent(loaderData?.content ?? {}, "identity.favicon");
		const faviconHref = favicon.startsWith("data:") ? favicon : `${favicon}${favicon.includes("?") ? "&" : "?"}v=20260919-3`;
		return {
			meta: [
				{ charSet: "utf-8" },
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1"
				},
				{ title: resolveContent(loaderData?.content ?? {}, "seo.home_title") },
				{
					name: "description",
					content: "Showroom automobile premium à Sfax, Tunisie."
				},
				{
					name: "author",
					content: resolveContent(loaderData?.content ?? {}, "seo.site_name")
				},
				{
					property: "og:title",
					content: resolveContent(loaderData?.content ?? {}, "seo.site_name")
				},
				{
					property: "og:description",
					content: "Showroom automobile premium à Sfax, Tunisie."
				},
				{
					property: "og:type",
					content: "website"
				},
				{
					name: "twitter:card",
					content: "summary_large_image"
				}
			],
			links: [
				{
					rel: "stylesheet",
					href: styles_default
				},
				{
					rel: "preconnect",
					href: "https://fonts.googleapis.com"
				},
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossOrigin: "anonymous"
				},
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
				},
				{
					rel: "icon",
					type: "image/png",
					href: faviconHref
				}
			]
		};
	},
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "fr",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$6.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, { position: "top-center" })]
	});
}
var $$splitComponentImporter$5 = () => import("./routes-DKwHR-7d.mjs");
var Route$5 = createFileRoute("/")({
	loader: async ({ context }) => {
		const [, content] = await Promise.all([context.queryClient.ensureQueryData(publicCarsQuery), context.queryClient.ensureQueryData(siteContentQuery)]);
		return { content };
	},
	head: ({ loaderData }) => {
		const title = resolveContent(loaderData?.content ?? {}, "seo.home_title");
		const description = resolveContent(loaderData?.content ?? {}, "seo.home_description");
		return { meta: [
			{ title },
			{
				name: "description",
				content: description
			},
			{
				property: "og:title",
				content: title
			},
			{
				property: "og:description",
				content: description
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		] };
	},
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var signIn = createServerFn({ method: "POST" }).validator(objectType({
	email: stringType().trim().email().max(254).transform((v) => v.toLowerCase()),
	password: stringType().min(1).max(256)
})).handler(createSsrRpc("809802465dda611a45560c05e0d77f01220e9c3abeb05c97dd12dd1f181e330b"));
var signOut = createServerFn({ method: "POST" }).handler(createSsrRpc("158a98af02ec3d6732ee93580ad68388549a602c30089ebf7d659b1b3ac713b8"));
var getSession = createServerFn({ method: "GET" }).handler(createSsrRpc("f0baab0f616bf8708db0d26340348d7cafcf9526698289308af528b3441eed6d"));
var $$splitComponentImporter$4 = () => import("./route-Di7iQBCH.mjs");
var Route$4 = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async () => {
		if (!await getSession()) throw redirect({ to: "/auth" });
	},
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./auth-4PpKxvv9.mjs");
var title = "Espace administration — Auto Kontor Sfax";
var description = "Connexion à l'espace de gestion du showroom Auto Kontor Sfax.";
var Route$3 = createFileRoute("/auth")({
	ssr: false,
	head: () => ({ meta: [
		{ title },
		{
			name: "description",
			content: description
		},
		{
			name: "robots",
			content: "noindex"
		},
		{
			property: "og:title",
			content: title
		},
		{
			property: "og:description",
			content: description
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./recherche-DoLZNh2s.mjs");
var Route$2 = createFileRoute("/recherche")({
	loader: async ({ context }) => {
		const [, content] = await Promise.all([context.queryClient.ensureQueryData(publicCarsQuery), context.queryClient.ensureQueryData(siteContentQuery)]);
		return { content };
	},
	validateSearch: (search) => ({
		price: String(search["price"] || "all"),
		type: String(search["type"] || "all"),
		km: String(search["km"] || "all"),
		country: String(search["country"] || "all")
	}),
	head: ({ loaderData }) => {
		const title = resolveContent(loaderData?.content ?? {}, "seo.search_title");
		const description = resolveContent(loaderData?.content ?? {}, "seo.search_description");
		return { meta: [
			{ title },
			{
				name: "description",
				content: description
			},
			{
				property: "og:title",
				content: title
			},
			{
				property: "og:description",
				content: description
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		] };
	},
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./admin-4_C0klML.mjs");
var Route$1 = createFileRoute("/_authenticated/admin")({
	head: () => ({ meta: [
		{ title: "Tableau de bord — Auto Kontor Sfax" },
		{
			name: "description",
			content: "Espace d'administration du site Auto Kontor Sfax."
		},
		{
			name: "robots",
			content: "noindex"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./vehicule._slug-CE2kWZii.mjs");
var Route = createFileRoute("/vehicule/$slug")({
	loader: async ({ params, context }) => {
		const [allCars, content] = await Promise.all([context.queryClient.ensureQueryData(publicCarsQuery), context.queryClient.ensureQueryData(siteContentQuery)]);
		const car = allCars.find((c) => c.slug === params.slug);
		if (!car) throw notFound();
		return {
			car,
			content
		};
	},
	head: ({ loaderData }) => {
		const siteName = resolveContent(loaderData?.content ?? {}, "seo.site_name");
		const title = loaderData ? `${loaderData.car.brand} ${loaderData.car.name} — ${siteName}` : `Véhicule — ${siteName}`;
		const description = loaderData ? `${loaderData.car.brand} ${loaderData.car.name} ${loaderData.car.year}, ${loaderData.car.km}, ${loaderData.car.fuel} — ${loaderData.car.price.toLocaleString("fr-FR")} DT chez ${siteName}.` : `Détails du véhicule chez ${siteName}.`;
		return { meta: [
			{ title },
			{
				name: "description",
				content: description
			},
			{
				property: "og:title",
				content: title
			},
			{
				property: "og:description",
				content: description
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		] };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$5.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$6
});
var AuthenticatedRouteRoute = Route$4.update({
	id: "/_authenticated",
	getParentRoute: () => Route$6
});
var AuthRoute = Route$3.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$6
});
var RechercheRoute = Route$2.update({
	id: "/recherche",
	path: "/recherche",
	getParentRoute: () => Route$6
});
var AuthenticatedAdminRoute = Route$1.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => AuthenticatedRouteRoute
});
var VehiculeSlugRoute = Route.update({
	id: "/vehicule/$slug",
	path: "/vehicule/$slug",
	getParentRoute: () => Route$6
});
var AuthenticatedRouteRouteChildren = { AuthenticatedAdminRoute };
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute,
	RechercheRoute,
	VehiculeSlugRoute
};
var routeTree = Route$6._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { signOut as a, signIn as i, Route as n, Route$2 as r, router_exports as t };
