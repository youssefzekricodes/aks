import "@tanstack/react-start/server-only";
import { currentAdmin } from "./auth";
import { notifyAdmins } from "./push-core";
import { sessionClient } from "./supabase";

/*
 * Vehicle activity sent to the other admins as notifications: added, edited,
 * put on sale or taken off, sold, deleted, discounted. One notification per
 * action (a bulk action on ten vehicles is one notification). Never blocks or
 * breaks the action itself.
 */

export type CarActivity =
  "added" | "edited" | "published" | "unpublished" | "sold" | "unsold" | "deleted" | "discount";

type Texts = { fr: string; ar: string };

const TITLES: Record<CarActivity, Texts> = {
  added: { fr: "Nouveau véhicule", ar: "كرهبة جديدة" },
  edited: { fr: "Véhicule modifié", ar: "كرهبة تبدّلت" },
  published: { fr: "Véhicule mis en vente", ar: "كرهبة تحطّت للبيع" },
  unpublished: { fr: "Véhicule retiré du site", ar: "كرهبة تنحّات من السيت" },
  sold: { fr: "Véhicule vendu", ar: "كرهبة تباعت" },
  unsold: { fr: "Véhicule remis en vente", ar: "كرهبة رجعت للبيع" },
  deleted: { fr: "Véhicule supprimé", ar: "كرهبة تفسخت" },
  discount: { fr: "Prix modifié", ar: "السوم تبدّل" },
};

/** "{who} a ajouté {what}" in each language. */
const VERBS: Record<CarActivity, Texts> = {
  added: { fr: "a ajouté", ar: "زاد" },
  edited: { fr: "a modifié", ar: "بدّل" },
  published: { fr: "a mis en vente", ar: "حطّ للبيع" },
  unpublished: { fr: "a retiré du site", ar: "نحّى من السيت" },
  sold: { fr: "a vendu", ar: "باع" },
  unsold: { fr: "a remis en vente", ar: "رجّع للبيع" },
  deleted: { fr: "a supprimé", ar: "فسخ" },
  discount: { fr: "a changé le prix de", ar: "بدّل سوم" },
};

/** Vehicle names, read before a deletion (they are gone after). */
export async function carNames(ids: string[]) {
  if (!ids.length) return [];
  const { data } = await sessionClient()
    .from("cars")
    .select("id, brand, name")
    .in("id", ids.slice(0, 50));
  return (data ?? []).map((row) => `${row.brand as string} ${row.name as string}`.trim());
}

export async function notifyCarActivity(
  kind: CarActivity,
  ids: string[],
  /** Names known beforehand (deletions); read from the database otherwise. */
  knownNames?: string[],
) {
  try {
    const admin = await currentAdmin(sessionClient(), { withFactors: false });
    if (!admin || !ids.length) return;
    const who = admin.name?.split(" ")[0] || admin.email.split("@")[0] || "Un admin";
    const names = knownNames ?? (await carNames(ids));
    const what: Texts =
      ids.length === 1
        ? { fr: names[0] ?? "un véhicule", ar: names[0] ?? "كرهبة" }
        : { fr: `${ids.length} véhicules`, ar: `${ids.length} كراهب` };
    await Promise.race([
      notifyAdmins(
        {
          type: "car",
          title: TITLES[kind],
          body: {
            fr: `${who} ${VERBS[kind].fr} ${what.fr}`,
            ar: `${who} ${VERBS[kind].ar} ${what.ar}`,
          },
          url:
            ids.length === 1 && kind !== "deleted"
              ? `/admin/vehicules/${ids[0]}`
              : "/admin/vehicules",
          tag: ids.length === 1 ? `car-${ids[0]}` : `cars-${kind}`,
        },
        { exceptUserId: admin.id },
      ),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (error) {
    console.error("[activity]", error);
  }
}
