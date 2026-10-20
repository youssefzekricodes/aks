import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "@heroui/react";
import { buildSocialCaption, SOCIAL_PLATFORMS } from "@/features/catalog/social";
import { brandInfo } from "@/features/catalog/brands";
import { saveCar, type CarInput } from "@/lib/data";
import { usePhones } from "@/lib/site-content";
import { CarForm } from "./CarForm";
import { adminCarsQuery, adminCarsQueryKey, emptyCar, toDraft, toPayload } from "./model";
import { announceShare, socialStatusQuery } from "./SocialCard";
import { AdminBreadcrumbs, EmptyState, type Crumb } from "./ui";
import { CarFormSkeleton } from "./skeletons";
import { t } from "./i18n";
import { Car as CarIcon } from "@/components/icons";

/**
 * Where the editor was opened from, so saving or leaving goes back there:
 * the vehicle list (default), a brand's ordering page ("marque:kia"), the showcase,
 * or the phone home screen ("accueil").
 */
export type EditOrigin = string | undefined;

function originOf(from: EditOrigin) {
  if (from?.startsWith("marque:")) {
    const brand = from.slice("marque:".length);
    return {
      brand,
      crumbs: [
        { label: t("Véhicules"), to: "/admin/vehicules" },
        {
          label: brandInfo(brand).name,
          to: "/admin/vehicules/marque/$brand",
          params: { brand },
        },
      ] satisfies Crumb[],
      backLabel: t("Retour à {name}", { name: brandInfo(brand).name }),
    };
  }
  if (from === "accueil")
    return {
      brand: null,
      crumbs: [{ label: t("Accueil"), to: "/admin" }] satisfies Crumb[],
      backLabel: t("Retour à l’accueil"),
    };
  if (from === "vitrine")
    return {
      brand: null,
      crumbs: [{ label: t("Vitrine"), to: "/admin/vitrine" }] satisfies Crumb[],
      backLabel: t("Retour à la vitrine"),
    };
  return {
    brand: null,
    crumbs: [{ label: t("Véhicules"), to: "/admin/vehicules" }] satisfies Crumb[],
    backLabel: t("Retour à la liste"),
  };
}

/** Vehicle editor page: `carId` is a vehicle id, or "nouveau" for a new one. */
export function CarEditPage({ carId, from }: { carId: string; from: EditOrigin }) {
  const cars = useQuery(adminCarsQuery);
  const social = useQuery(socialStatusQuery);
  const isNew = carId === "nouveau";
  const car = isNew ? undefined : cars.data?.find((c) => c.id === carId);

  // A new vehicle opens at once; the networks to post on are filled in when known.
  if (!isNew && cars.isPending) return <CarFormSkeleton />;
  if (!isNew && !car)
    return (
      <EmptyState
        icon={CarIcon}
        title={t("Véhicule introuvable.")}
        description={t("Il a peut-être été supprimé.")}
      />
    );

  // Remounted per vehicle so the draft starts from it.
  return (
    <Editor
      key={carId}
      initial={car ?? emptyCar}
      // New vehicle: pre-set to post on the connected networks (once known).
      socialTargets={
        isNew && social.data ? SOCIAL_PLATFORMS.filter((p) => social.data?.[p]) : undefined
      }
      from={from}
    />
  );
}

function Editor({
  initial,
  from,
  socialTargets,
}: {
  initial: CarInput;
  from: EditOrigin;
  socialTargets?: CarInput["social_targets"] | undefined;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { primary } = usePhones();
  // Not memoized: its labels follow the admin language.
  const origin = originOf(from);
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [original, setOriginal] = useState(() => JSON.stringify(toDraft(initial)));
  const [done, setDone] = useState(false);

  // Default networks arrive after the form is shown: applied once, as the
  // starting point (not an unsaved change), unless the user already edited.
  const targetsApplied = useRef(false);
  useEffect(() => {
    if (!socialTargets || targetsApplied.current) return;
    targetsApplied.current = true;
    if (JSON.stringify(draft) !== original) return;
    const next = { ...draft, social_targets: socialTargets };
    setDraft(next);
    setOriginal(JSON.stringify(next));
  }, [socialTargets, draft, original]);

  const leave = useCallback(() => {
    if (origin.brand)
      void navigate({ to: "/admin/vehicules/marque/$brand", params: { brand: origin.brand } });
    else if (from === "vitrine") void navigate({ to: "/admin/vitrine" });
    else if (from === "accueil") void navigate({ to: "/admin" });
    else void navigate({ to: "/admin/vehicules" });
  }, [navigate, origin.brand, from]);

  // Leave once the saved state has rendered (no "unsaved changes" prompt).
  useEffect(() => {
    if (done) leave();
  }, [done, leave]);

  const save = useMutation({
    mutationFn: (data: CarInput) =>
      saveCar({
        data: toPayload(
          // Networks chosen but no text written: post the suggested one.
          data.social_targets?.length && !data.social_caption?.trim()
            ? {
                ...data,
                social_caption: buildSocialCaption(data, {
                  url: `${window.location.origin}/vehicule/${data.slug}`,
                  phone: primary?.number,
                }),
              }
            : data,
        ),
      }),
    onSuccess: async (result) => {
      toast.success(t("Véhicule enregistré."));
      announceShare(result.social);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCarsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["public-cars"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-facebook-sync"] }),
      ]);
      setOriginal(JSON.stringify(draft));
      setDone(true);
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const title = initial.id
    ? `${initial.brand} ${initial.model || initial.name}`.trim()
    : t("Nouveau véhicule");

  return (
    <CarForm
      value={draft}
      isDirty={JSON.stringify(draft) !== original}
      onChange={(update) => setDraft((current) => update(current))}
      onCancel={leave}
      onSave={() => save.mutate(draft)}
      saving={save.isPending}
      backLabel={origin.backLabel}
      breadcrumbs={<AdminBreadcrumbs items={[...origin.crumbs, { label: title }]} />}
    />
  );
}
