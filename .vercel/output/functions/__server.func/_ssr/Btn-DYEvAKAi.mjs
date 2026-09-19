import { s as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Btn-DYEvAKAi.js
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var sizes = {
	sm: "px-4 py-2 text-xs uppercase tracking-wider",
	md: "px-5 py-3 text-sm",
	lg: "px-7 py-4 text-base"
};
function Btn({ variant = "primary", size = "md", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn("btn-3d", variant === "primary" ? "btn-3d-primary" : "btn-3d-steel", sizes[size], className),
		...props
	});
}
function BtnLink({ variant = "primary", size = "md", className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
		className: cn("btn-3d", variant === "primary" ? "btn-3d-primary" : "btn-3d-steel", sizes[size], className),
		...props
	});
}
//#endregion
export { BtnLink as n, cn as r, Btn as t };
