import { i as createServerFn } from "./server-B7tKpuFj.mjs";
import { a as objectType, n as booleanType, o as stringType, t as arrayType } from "../_libs/zod.mjs";
import { n as idSchema, r as leadSchema, t as carSchema } from "./schemas-Dd7v7_YI.mjs";
import { t as createServerRpc } from "./createServerRpc-L4hU03Ml.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/catalog.functions-DW0QBxYU.js
var listPublicCars_createServerFn_handler = createServerRpc({
	id: "fe03b6e1cfcd3fcede7b2547ae525602d0d7702aae17fae1eeb2c70e5be9b4ed",
	name: "listPublicCars",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => listPublicCars.__executeServer(opts));
var listPublicCars = createServerFn({ method: "GET" }).handler(listPublicCars_createServerFn_handler, async () => (await import("./repository-B1_bkpQO.mjs")).cars());
var listPublicSiteContent_createServerFn_handler = createServerRpc({
	id: "80042f0c146bfc834e179c9ff838569801ceb8634b6938690e31f4b1d05b19de",
	name: "listPublicSiteContent",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => listPublicSiteContent.__executeServer(opts));
var listPublicSiteContent = createServerFn({ method: "GET" }).handler(listPublicSiteContent_createServerFn_handler, async () => Object.fromEntries((await import("./repository-B1_bkpQO.mjs")).content().map((r) => [r.key, r.value])));
var listAllCars_createServerFn_handler = createServerRpc({
	id: "01b20642384b83a665cd3811a9b6a217a48b5e1f4f84d23bca7c52fc8011d21d",
	name: "listAllCars",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => listAllCars.__executeServer(opts));
var listAllCars = createServerFn({ method: "GET" }).handler(listAllCars_createServerFn_handler, async () => (await import("./repository-B1_bkpQO.mjs")).cars(true));
var listSiteContent_createServerFn_handler = createServerRpc({
	id: "87ce03d5ff40914c2ffdc786266f4c70fb6b54f7114fd243ce1910d992b4fd22",
	name: "listSiteContent",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => listSiteContent.__executeServer(opts));
var listSiteContent = createServerFn({ method: "GET" }).handler(listSiteContent_createServerFn_handler, async () => (await import("./repository-B1_bkpQO.mjs")).content(true));
var listLeads_createServerFn_handler = createServerRpc({
	id: "ce200f2245dc211087211f01e7c11c408d530e2659f30ba779e9281168ab14f0",
	name: "listLeads",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => listLeads.__executeServer(opts));
var listLeads = createServerFn({ method: "GET" }).handler(listLeads_createServerFn_handler, async () => (await import("./repository-B1_bkpQO.mjs")).leads());
var saveCar_createServerFn_handler = createServerRpc({
	id: "2ea7a694bedc8c82f9a601922fc2b41086ca28bb218fcf9285b696c11d5420f6",
	name: "saveCar",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => saveCar.__executeServer(opts));
var saveCar = createServerFn({ method: "POST" }).validator(carSchema).handler(saveCar_createServerFn_handler, async ({ data }) => (await import("./repository-B1_bkpQO.mjs")).saveCar(data));
var deleteCar_createServerFn_handler = createServerRpc({
	id: "2302f38720b2ff65f076731bdcca16b0f81415e546bdac1c3e04f966416ec537",
	name: "deleteCar",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => deleteCar.__executeServer(opts));
var deleteCar = createServerFn({ method: "POST" }).validator(objectType({ id: idSchema })).handler(deleteCar_createServerFn_handler, async ({ data }) => (await import("./repository-B1_bkpQO.mjs")).deleteCar(data.id));
var setCarPublished_createServerFn_handler = createServerRpc({
	id: "cc4e90a0ae0b02c8dfc6e3a7d3fedf52be9fc2edc13115b022e0a139c5aa9ffe",
	name: "setCarPublished",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => setCarPublished.__executeServer(opts));
var setCarPublished = createServerFn({ method: "POST" }).validator(objectType({
	id: idSchema,
	published: booleanType()
})).handler(setCarPublished_createServerFn_handler, async ({ data }) => (await import("./repository-B1_bkpQO.mjs")).publishCar(data.id, data.published));
var setLeadHandled_createServerFn_handler = createServerRpc({
	id: "df7e2d66e18fd616be1bb103ddf695da3b76a88fb80231ac440b3306c50d79ae",
	name: "setLeadHandled",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => setLeadHandled.__executeServer(opts));
var setLeadHandled = createServerFn({ method: "POST" }).validator(objectType({
	id: idSchema,
	handled: booleanType()
})).handler(setLeadHandled_createServerFn_handler, async ({ data }) => (await import("./repository-B1_bkpQO.mjs")).handleLead(data.id, data.handled));
var saveSiteContent_createServerFn_handler = createServerRpc({
	id: "0badaf124ba7b824f0f05e921b7c3ed19a18e3322469cb582be60c705f7e94e4",
	name: "saveSiteContent",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => saveSiteContent.__executeServer(opts));
var saveSiteContent = createServerFn({ method: "POST" }).validator(objectType({ entries: arrayType(objectType({
	key: stringType().min(1).max(100),
	value: stringType().max(3e6)
})).max(400) })).handler(saveSiteContent_createServerFn_handler, async ({ data }) => (await import("./repository-B1_bkpQO.mjs")).saveContent(data.entries));
var submitLead_createServerFn_handler = createServerRpc({
	id: "85098f96f143a999d6d620f2a47dbbd5e71f47888b44cb85dfbb9afbfbee3966",
	name: "submitLead",
	filename: "src/features/catalog/catalog.functions.ts"
}, (opts) => submitLead.__executeServer(opts));
var submitLead = createServerFn({ method: "POST" }).validator(leadSchema).handler(submitLead_createServerFn_handler, async ({ data }) => (await import("./repository-B1_bkpQO.mjs")).createLead(data));
//#endregion
export { deleteCar_createServerFn_handler, listAllCars_createServerFn_handler, listLeads_createServerFn_handler, listPublicCars_createServerFn_handler, listPublicSiteContent_createServerFn_handler, listSiteContent_createServerFn_handler, saveCar_createServerFn_handler, saveSiteContent_createServerFn_handler, setCarPublished_createServerFn_handler, setLeadHandled_createServerFn_handler, submitLead_createServerFn_handler };
