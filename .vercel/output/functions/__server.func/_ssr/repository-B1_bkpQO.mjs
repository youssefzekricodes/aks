import { c as validateContentValue, i as CONTENT_FIELDS, r as CONTENT_BY_KEY } from "./definition-BxYhf0sv.mjs";
import { checkOrigin, n as rateLimit, r as transaction, requireAdmin, t as getDb } from "./session-BIbBzKg3.mjs";
import { randomUUID } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/repository-B1_bkpQO.js
var bmw_front_jpg_asset_default = {
	asset_id: "a88cca0b-418c-421b-808e-d0ef1cc7b2c2",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:10:33Z",
	original_filename: "bmw-front.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/a88cca0b-418c-421b-808e-d0ef1cc7b2c2/bmw-front.jpg",
	size: 68439,
	url: "/images/bmw-front.jpg",
	version: 1
};
var bmw_rear_jpg_asset_default = {
	asset_id: "700ca50d-2773-4f2a-b067-95a2773d39c9",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:10:38Z",
	original_filename: "bmw-rear.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/700ca50d-2773-4f2a-b067-95a2773d39c9/bmw-rear.jpg",
	size: 58488,
	url: "/images/bmw-rear.jpg",
	version: 1
};
var bmw_interior_jpg_asset_default = {
	asset_id: "7cacaa32-fd0a-4e58-9867-dfb01884a463",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:10:44Z",
	original_filename: "bmw-interior.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/7cacaa32-fd0a-4e58-9867-dfb01884a463/bmw-interior.jpg",
	size: 53146,
	url: "/images/bmw-interior.jpg",
	version: 1
};
var mercedes_front_jpg_asset_default = {
	asset_id: "33dbbe47-0edd-4b27-ac54-f94329615ef8",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:26Z",
	original_filename: "mercedes-front.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/33dbbe47-0edd-4b27-ac54-f94329615ef8/mercedes-front.jpg",
	size: 31834,
	url: "/images/mercedes-front.jpg",
	version: 1
};
var mercedes_rear_jpg_asset_default = {
	asset_id: "804bb3b0-3c93-483c-8bb7-4ab4b7702a06",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:34Z",
	original_filename: "mercedes-rear.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/804bb3b0-3c93-483c-8bb7-4ab4b7702a06/mercedes-rear.jpg",
	size: 27706,
	url: "/images/mercedes-rear.jpg",
	version: 1
};
var mercedes_interior_jpg_asset_default = {
	asset_id: "c1364996-4e64-4511-b42c-51c7b9586493",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:42Z",
	original_filename: "mercedes-interior.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/c1364996-4e64-4511-b42c-51c7b9586493/mercedes-interior.jpg",
	size: 37671,
	url: "/images/mercedes-interior.jpg",
	version: 1
};
var alfa_front_jpg_asset_default = {
	asset_id: "982aca9b-5f84-4b44-85fd-b65fad16e27f",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:55Z",
	original_filename: "alfa-front.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/982aca9b-5f84-4b44-85fd-b65fad16e27f/alfa-front.jpg",
	size: 41071,
	url: "/images/alfa-front.jpg",
	version: 1
};
var alfa_rear_jpg_asset_default = {
	asset_id: "dd95cfc2-5d23-4bbc-84f4-798005020e95",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:12:04Z",
	original_filename: "alfa-rear.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/dd95cfc2-5d23-4bbc-84f4-798005020e95/alfa-rear.jpg",
	size: 36968,
	url: "/images/alfa-rear.jpg",
	version: 1
};
var alfa_interior_jpg_asset_default = {
	asset_id: "3f73dd60-5b4a-4eef-be6a-110beee95e15",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:12:11Z",
	original_filename: "alfa-interior.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/3f73dd60-5b4a-4eef-be6a-110beee95e15/alfa-interior.jpg",
	size: 45306,
	url: "/images/alfa-interior.jpg",
	version: 1
};
var renault_front_jpg_asset_default = {
	asset_id: "d338b822-d09f-48dc-b1f1-60b094e23929",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:12:17Z",
	original_filename: "renault-front.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/d338b822-d09f-48dc-b1f1-60b094e23929/renault-front.jpg",
	size: 45616,
	url: "/images/renault-front.jpg",
	version: 1
};
var renault_rear_jpg_asset_default = {
	asset_id: "019a4ab0-abb1-48cc-b90a-cf29e08d964e",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:12:24Z",
	original_filename: "renault-rear.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/019a4ab0-abb1-48cc-b90a-cf29e08d964e/renault-rear.jpg",
	size: 43590,
	url: "/images/renault-rear.jpg",
	version: 1
};
var renault_interior_jpg_asset_default = {
	asset_id: "0b4b593c-7214-482c-80ce-34299593f376",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:12:29Z",
	original_filename: "renault-interior.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/0b4b593c-7214-482c-80ce-34299593f376/renault-interior.jpg",
	size: 52808,
	url: "/images/renault-interior.jpg",
	version: 1
};
var yaris_front_jpg_asset_default = {
	asset_id: "3d4ec1ad-bc5b-40e5-bbab-5fac33d55444",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:08Z",
	original_filename: "yaris-front.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/3d4ec1ad-bc5b-40e5-bbab-5fac33d55444/yaris-front.jpg",
	size: 49246,
	url: "/images/yaris-front.jpg",
	version: 1
};
var yaris_rear_jpg_asset_default = {
	asset_id: "8292a7ef-da84-4e6e-ab7a-4f5964ea5e0d",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:14Z",
	original_filename: "yaris-rear.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/8292a7ef-da84-4e6e-ab7a-4f5964ea5e0d/yaris-rear.jpg",
	size: 48664,
	url: "/images/yaris-rear.jpg",
	version: 1
};
var yaris_interior_jpg_asset_default = {
	asset_id: "ce79f923-d2cc-42e8-b9e5-8cb82312ff1b",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:20Z",
	original_filename: "yaris-interior.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/ce79f923-d2cc-42e8-b9e5-8cb82312ff1b/yaris-interior.jpg",
	size: 50002,
	url: "/images/yaris-interior.jpg",
	version: 1
};
var gr86_front_jpg_asset_default = {
	asset_id: "7d1d1a05-1804-4934-b6c2-ed5ba6c4156c",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:10:49Z",
	original_filename: "gr86-front.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/7d1d1a05-1804-4934-b6c2-ed5ba6c4156c/gr86-front.jpg",
	size: 28952,
	url: "/images/gr86-front.jpg",
	version: 1
};
var gr86_rear_jpg_asset_default = {
	asset_id: "d857fd77-c6dc-4585-9dc4-f8087a906222",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:10:55Z",
	original_filename: "gr86-rear.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/d857fd77-c6dc-4585-9dc4-f8087a906222/gr86-rear.jpg",
	size: 31226,
	url: "/images/gr86-rear.jpg",
	version: 1
};
var gr86_interior_jpg_asset_default = {
	asset_id: "b89bd4cd-56c4-494d-aeaf-f2e8e4b68b38",
	content_type: "image/jpeg",
	created_at: "2026-09-08T11:11:02Z",
	original_filename: "gr86-interior.jpg",
	project_id: "630ea8e2-4132-4bf2-ad1e-c25d51eefadb",
	r2_key: "a/v1/630ea8e2-4132-4bf2-ad1e-c25d51eefadb/b89bd4cd-56c4-494d-aeaf-f2e8e4b68b38/gr86-interior.jpg",
	size: 38527,
	url: "/images/gr86-interior.jpg",
	version: 1
};
var DEMO_SITE_CONTENT = [{
	key: "inventory_title",
	label: "Titre de la section véhicules",
	value: "Véhicules en vitrine"
}];
var DEMO_CARS = [
	{
		id: "demo-bmw-serie-4",
		slug: "bmw-serie-4-coupe",
		name: "Série 4 Coupé",
		brand: "BMW",
		country: "Germany",
		year: 2022,
		price: 189e3,
		km: "28 000 km",
		km_value: 28e3,
		fuel: "Essence",
		gearbox: "Auto",
		body: "Coupé",
		state: "Occasion",
		images: [
			bmw_front_jpg_asset_default.url,
			bmw_rear_jpg_asset_default.url,
			bmw_interior_jpg_asset_default.url
		],
		description: "BMW Série 4 Coupé en parfait état, entretien complet, pack M Sport, sièges cuir et toit ouvrant.",
		published: true,
		sort_order: 1
	},
	{
		id: "demo-mercedes-c",
		slug: "mercedes-classe-c",
		name: "Classe C 220d",
		brand: "Mercedes-Benz",
		country: "Germany",
		year: 2021,
		price: 165e3,
		km: "45 000 km",
		km_value: 45e3,
		fuel: "Diesel",
		gearbox: "Auto",
		body: "Berline",
		state: "Occasion",
		images: [
			mercedes_front_jpg_asset_default.url,
			mercedes_rear_jpg_asset_default.url,
			mercedes_interior_jpg_asset_default.url
		],
		description: "Mercedes Classe C 220d AMG Line, première main, carnet d'entretien à jour, garantie 6 mois.",
		published: true,
		sort_order: 2
	},
	{
		id: "demo-alfa-giulia",
		slug: "alfa-romeo-giulia",
		name: "Giulia Veloce",
		brand: "Alfa Romeo",
		country: "Italy",
		year: 2023,
		price: 21e4,
		km: "12 000 km",
		km_value: 12e3,
		fuel: "Essence",
		gearbox: "Auto",
		body: "Berline",
		state: "Occasion",
		images: [
			alfa_front_jpg_asset_default.url,
			alfa_rear_jpg_asset_default.url,
			alfa_interior_jpg_asset_default.url
		],
		description: "Alfa Romeo Giulia Veloce, comportement sportif, intérieur cuir rouge, état impeccable.",
		published: true,
		sort_order: 3
	},
	{
		id: "demo-renault-clio",
		slug: "renault-clio",
		name: "Clio V",
		brand: "Renault",
		country: "France",
		year: 2020,
		price: 62e3,
		km: "78 000 km",
		km_value: 78e3,
		fuel: "Diesel",
		gearbox: "Manuelle",
		body: "Citadine",
		state: "Occasion",
		images: [
			renault_front_jpg_asset_default.url,
			renault_rear_jpg_asset_default.url,
			renault_interior_jpg_asset_default.url
		],
		description: "Renault Clio V économique, idéale en ville, très bon état général.",
		published: true,
		sort_order: 4
	},
	{
		id: "demo-toyota-yaris",
		slug: "toyota-yaris-hybride",
		name: "Yaris Hybride",
		brand: "Toyota",
		country: "Japan",
		year: 2023,
		price: 89e3,
		km: "15 000 km",
		km_value: 15e3,
		fuel: "Hybride",
		gearbox: "Auto",
		body: "Citadine",
		state: "Neuf",
		images: [
			yaris_front_jpg_asset_default.url,
			yaris_rear_jpg_asset_default.url,
			yaris_interior_jpg_asset_default.url
		],
		description: "Toyota Yaris Hybride, consommation record, garantie constructeur.",
		published: true,
		sort_order: 5
	},
	{
		id: "demo-toyota-gr86",
		slug: "toyota-gr86",
		name: "GR86",
		brand: "Toyota",
		country: "Japan",
		year: 2024,
		price: 235e3,
		km: "5 000 km",
		km_value: 5e3,
		fuel: "Essence",
		gearbox: "Manuelle",
		body: "Coupé",
		state: "Neuf",
		images: [
			gr86_front_jpg_asset_default.url,
			gr86_rear_jpg_asset_default.url,
			gr86_interior_jpg_asset_default.url
		],
		description: "Toyota GR86 boîte manuelle, coupé sportif propulsion, disponible immédiatement.",
		published: true,
		sort_order: 6
	}
];
function db() {
	const database = getDb();
	if (!database.prepare("SELECT 1 FROM migrations WHERE version = 2").get()) transaction(() => {
		for (const car of DEMO_CARS) database.prepare("INSERT INTO cars VALUES (?, ?, ?, ?, ?)").run(car.id, car.slug, Number(car.published), car.sort_order, JSON.stringify(car));
		for (const row of DEMO_SITE_CONTENT) database.prepare("INSERT INTO site_content VALUES (?, ?, ?)").run(row.key, row.label, row.value);
		database.prepare("INSERT INTO migrations VALUES (2)").run();
	});
	return database;
}
function authorize(write = false) {
	requireAdmin();
	if (write) checkOrigin();
}
function cars(admin = false) {
	if (admin) authorize();
	return db().prepare(`SELECT document FROM cars ${admin ? "" : "WHERE published = 1"} ORDER BY sort_order`).all().map((row) => JSON.parse(String(row["document"])));
}
function content(admin = false) {
	if (admin) authorize();
	const saved = db().prepare("SELECT * FROM site_content ORDER BY key").all();
	const values = new Map(saved.map((row) => [row.key, row.value]));
	return CONTENT_FIELDS.map((field) => ({
		key: field.key,
		label: field.label,
		value: values.get(field.key) ?? field.value
	}));
}
function saveCar(data) {
	authorize(true);
	const id = data.id || randomUUID();
	if (data.id && !db().prepare("SELECT 1 FROM cars WHERE id = ?").get(id)) throw new Error("Véhicule introuvable.");
	try {
		db().prepare(`INSERT INTO cars VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      slug=excluded.slug, published=excluded.published, sort_order=excluded.sort_order, document=excluded.document`).run(id, data.slug, Number(data.published), data.sort_order, JSON.stringify({
			...data,
			id
		}));
	} catch (error) {
		if (String(error).includes("UNIQUE")) throw new Error("Ce lien de véhicule existe déjà.");
		throw error;
	}
	return { id };
}
function publishCar(id, published) {
	authorize(true);
	db().prepare("UPDATE cars SET published = ?, document = json_set(document, '$.published', json(?)) WHERE id = ?").run(Number(published), JSON.stringify(published), id);
	return { ok: true };
}
function deleteCar(id) {
	authorize(true);
	db().prepare("DELETE FROM cars WHERE id = ?").run(id);
	return { ok: true };
}
function saveContent(entries) {
	authorize(true);
	for (const entry of entries) {
		const field = CONTENT_BY_KEY.get(entry.key);
		if (!field) throw new Error("Champ de contenu inconnu.");
		const error = validateContentValue(field, entry.value);
		if (error) throw new Error(error);
	}
	const database = db();
	transaction(() => {
		for (const row of entries) database.prepare("INSERT INTO site_content VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(row.key, row.key, row.value);
	});
	return { ok: true };
}
function createLead(data) {
	checkOrigin();
	rateLimit("leads:global", 100, 36e5);
	rateLimit(`leads:${data.phone}`, 5, 36e5);
	db().prepare("INSERT INTO leads VALUES (?, ?, ?, ?, ?, ?, 0, ?)").run(randomUUID(), data.name, data.phone, data.email || null, data.message || null, data.car_slug || null, (/* @__PURE__ */ new Date()).toISOString());
	return { ok: true };
}
function leads() {
	authorize();
	return db().prepare("SELECT * FROM leads ORDER BY created_at DESC").all().map((row) => ({
		...row,
		handled: Boolean(row["handled"])
	}));
}
function handleLead(id, handled) {
	authorize(true);
	db().prepare("UPDATE leads SET handled = ? WHERE id = ?").run(Number(handled), id);
	return { ok: true };
}
//#endregion
export { cars, content, createLead, deleteCar, handleLead, leads, publishCar, saveCar, saveContent };
