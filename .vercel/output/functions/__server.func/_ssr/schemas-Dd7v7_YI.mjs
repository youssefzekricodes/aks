import { a as objectType, i as numberType, n as booleanType, o as stringType, r as literalType, s as unionType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/schemas-Dd7v7_YI.js
var text = stringType().trim().min(1).max(200);
var idSchema = stringType().min(1).max(100);
var carSchema = objectType({
	id: idSchema.optional(),
	slug: stringType().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	name: text,
	brand: text,
	country: text,
	year: numberType().int().min(1900).max(2100),
	price: numberType().finite().min(0).max(1e9),
	km: text,
	km_value: numberType().int().min(0).max(1e8),
	fuel: text,
	gearbox: text,
	body: text,
	state: text,
	images: arrayType(stringType().max(3e6).refine((v) => /^https?:\/\//.test(v) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || /^\/(?!\/)/.test(v), "Image non valide")).max(12),
	description: stringType().max(2e4),
	published: booleanType(),
	sort_order: numberType().int().min(-1e5).max(1e5)
});
var leadSchema = objectType({
	name: text,
	phone: stringType().trim().min(5).max(40),
	email: unionType([stringType().trim().email().max(254), literalType("")]).optional(),
	message: stringType().max(5e3).optional(),
	car_slug: stringType().max(200).optional()
});
//#endregion
export { idSchema as n, leadSchema as r, carSchema as t };
