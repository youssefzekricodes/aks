import { n as queryOptions } from "../_libs/react+tanstack__react-query.mjs";
import { a as TSS_SERVER_FUNCTION, i as createServerFn, o as getServerFnById } from "./server-B7tKpuFj.mjs";
import { a as objectType, n as booleanType, o as stringType, t as arrayType } from "../_libs/zod.mjs";
import { n as idSchema, r as leadSchema, t as carSchema } from "./schemas-Dd7v7_YI.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createSsrRpc-BV0E7iZq.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/catalog.functions-BXyo7LyX.js
var listPublicCars = createServerFn({ method: "GET" }).handler(createSsrRpc("fe03b6e1cfcd3fcede7b2547ae525602d0d7702aae17fae1eeb2c70e5be9b4ed"));
var listPublicSiteContent = createServerFn({ method: "GET" }).handler(createSsrRpc("80042f0c146bfc834e179c9ff838569801ceb8634b6938690e31f4b1d05b19de"));
var listAllCars = createServerFn({ method: "GET" }).handler(createSsrRpc("01b20642384b83a665cd3811a9b6a217a48b5e1f4f84d23bca7c52fc8011d21d"));
var listSiteContent = createServerFn({ method: "GET" }).handler(createSsrRpc("87ce03d5ff40914c2ffdc786266f4c70fb6b54f7114fd243ce1910d992b4fd22"));
var listLeads = createServerFn({ method: "GET" }).handler(createSsrRpc("ce200f2245dc211087211f01e7c11c408d530e2659f30ba779e9281168ab14f0"));
var saveCar = createServerFn({ method: "POST" }).validator(carSchema).handler(createSsrRpc("2ea7a694bedc8c82f9a601922fc2b41086ca28bb218fcf9285b696c11d5420f6"));
var deleteCar = createServerFn({ method: "POST" }).validator(objectType({ id: idSchema })).handler(createSsrRpc("2302f38720b2ff65f076731bdcca16b0f81415e546bdac1c3e04f966416ec537"));
var setCarPublished = createServerFn({ method: "POST" }).validator(objectType({
	id: idSchema,
	published: booleanType()
})).handler(createSsrRpc("cc4e90a0ae0b02c8dfc6e3a7d3fedf52be9fc2edc13115b022e0a139c5aa9ffe"));
var setLeadHandled = createServerFn({ method: "POST" }).validator(objectType({
	id: idSchema,
	handled: booleanType()
})).handler(createSsrRpc("df7e2d66e18fd616be1bb103ddf695da3b76a88fb80231ac440b3306c50d79ae"));
var saveSiteContent = createServerFn({ method: "POST" }).validator(objectType({ entries: arrayType(objectType({
	key: stringType().min(1).max(100),
	value: stringType().max(3e6)
})).max(400) })).handler(createSsrRpc("0badaf124ba7b824f0f05e921b7c3ed19a18e3322469cb582be60c705f7e94e4"));
var submitLead = createServerFn({ method: "POST" }).validator(leadSchema).handler(createSsrRpc("85098f96f143a999d6d620f2a47dbbd5e71f47888b44cb85dfbb9afbfbee3966"));
var createLead = (data) => submitLead({ data });
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/queries-DK4crW-I.js
var publicCarsQuery = queryOptions({
	queryKey: ["public-cars"],
	queryFn: () => listPublicCars()
});
var siteContentQuery = queryOptions({
	queryKey: ["site-content"],
	queryFn: () => listPublicSiteContent()
});
//#endregion
export { listAllCars as a, saveCar as c, setLeadHandled as d, createSsrRpc as f, deleteCar as i, saveSiteContent as l, siteContentQuery as n, listLeads as o, createLead as r, listSiteContent as s, publicCarsQuery as t, setCarPublished as u };
