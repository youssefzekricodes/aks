import { i as createServerFn } from "./server-B7tKpuFj.mjs";
import { a as objectType, o as stringType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-L4hU03Ml.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.functions-CspdDide.js
var signIn_createServerFn_handler = createServerRpc({
	id: "809802465dda611a45560c05e0d77f01220e9c3abeb05c97dd12dd1f181e330b",
	name: "signIn",
	filename: "src/features/auth/auth.functions.ts"
}, (opts) => signIn.__executeServer(opts));
var signIn = createServerFn({ method: "POST" }).validator(objectType({
	email: stringType().trim().email().max(254).transform((v) => v.toLowerCase()),
	password: stringType().min(1).max(256)
})).handler(signIn_createServerFn_handler, async ({ data }) => (await import("./session-BIbBzKg3.mjs")).login(data.email, data.password));
var signOut_createServerFn_handler = createServerRpc({
	id: "158a98af02ec3d6732ee93580ad68388549a602c30089ebf7d659b1b3ac713b8",
	name: "signOut",
	filename: "src/features/auth/auth.functions.ts"
}, (opts) => signOut.__executeServer(opts));
var signOut = createServerFn({ method: "POST" }).handler(signOut_createServerFn_handler, async () => (await import("./session-BIbBzKg3.mjs")).logout());
var getSession_createServerFn_handler = createServerRpc({
	id: "f0baab0f616bf8708db0d26340348d7cafcf9526698289308af528b3441eed6d",
	name: "getSession",
	filename: "src/features/auth/auth.functions.ts"
}, (opts) => getSession.__executeServer(opts));
var getSession = createServerFn({ method: "GET" }).handler(getSession_createServerFn_handler, async () => (await import("./session-BIbBzKg3.mjs")).currentAdmin());
//#endregion
export { getSession_createServerFn_handler, signIn_createServerFn_handler, signOut_createServerFn_handler };
