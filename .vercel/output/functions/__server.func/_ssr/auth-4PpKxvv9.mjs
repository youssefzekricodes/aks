import { r as __toESM } from "../_runtime.mjs";
import { c as require_react, s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as signIn } from "./router-D3oCTAsw.mjs";
import { t as Btn } from "./Btn-DYEvAKAi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-4PpKxvv9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var aks_logo_png_asset_default = {
	asset_id: "e77e9159-d83c-4240-9737-acf807063cd7",
	content_type: "image/png",
	created_at: "2026-08-09T20:43:04Z",
	original_filename: "aks-logo.png",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/e77e9159-d83c-4240-9737-acf807063cd7/aks-logo.png",
	size: 79244,
	url: "/images/aks-logo.png",
	version: 1
};
function AuthPage() {
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const onSubmit = async (e) => {
		e.preventDefault();
		if (pending) return;
		setPending(true);
		try {
			await signIn({ data: {
				email,
				password
			} });
			toast.success("Connexion réussie");
			await navigate({ to: "/admin" });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Connexion impossible.");
		} finally {
			setPending(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-5 py-16",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "mx-auto flex w-fit items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: aks_logo_png_asset_default.url,
					alt: "Auto Kontor Sfax",
					width: 132,
					height: 44,
					className: "h-11 w-[132px] object-contain"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "font-display text-sm font-bold uppercase tracking-[0.22em]",
					children: ["Auto Kontor ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-primary",
						children: "Sfax"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass-panel mt-8 rounded-2xl p-7 sm:p-9",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-bold",
						children: "Espace administration"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: "Connectez-vous avec votre compte administrateur."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit,
						className: "mt-7 space-y-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "email",
								className: "mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
								children: "E-mail"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "email",
								type: "email",
								autoComplete: "username",
								required: true,
								value: email,
								onChange: (e) => setEmail(e.target.value),
								className: "input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "password",
								className: "mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground",
								children: "Mot de passe"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "password",
								type: "password",
								autoComplete: "current-password",
								required: true,
								value: password,
								onChange: (e) => setPassword(e.target.value),
								className: "input-depth w-full rounded-lg px-4 py-3 text-sm text-foreground"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, {
								disabled: pending,
								type: "submit",
								size: "lg",
								className: "w-full",
								children: "Se connecter"
							})
						]
					})
				]
			})]
		})
	});
}
//#endregion
export { AuthPage as component };
