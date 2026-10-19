import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Spinner, toast } from "@heroui/react";
import { buildSocialCaption, SOCIAL_PLATFORMS } from "@/features/catalog/social";
import { brandInfo } from "@/features/catalog/brands";
import { saveCar, type CarInput } from "@/lib/data";
import { usePhones } from "@/lib/site-content";
import { CarForm } from "./CarForm";
import { adminCarsQuery, adminCarsQueryKey, emptyCar, toDraft, toPayload } from "./model";
import { announceShare, socialStatusQuery } from "./SocialCard";
import { AdminBreadcrumbs, EmptyState, type Crumb } from "./ui";
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
        { label: "Véhicules", to: "/admin/vehicules" },
        {
          label: brandInfo(brand).name,
          to: "/admin/vehicules/marque/$brand",
          params: { brand },
        },
      ] satisfies Crumb[],
      backLabel: `Retour à ${brandInfo(brand).name}`,
    };
  }
  if (from === "accueil")
    return {
      brand: null,
      crumbs: [{ label: "Accueil", to: "/admin" }] satisfies Crumb[],
      backLabel: "Retour à l’accueil",
    };
  if (from === "vitrine")
    return {
      brand: null,
      crumbs: [{ label: "Vitrine", to: "/admin/vitrine" }] satisfies Crumb[],
      backLabel: "Retour à la vitrine",
    };
  return {
    brand: null,
    crumbs: [{ label: "Véhicules", to: "/admin/vehicules" }] satisfies Crumb[],
    backLabel: "Retour à la liste",
  };
}

/** Vehicle editor page: `carId` is a vehicle id, or "nouveau" for a new one. */
export function CarEditPage({ carId, from }: { carId: string; from: EditOrigin }) {
  const cars = useQuery(adminCarsQuery);
  const social = useQuery(socialStatusQuery);
  const isNew = carId === "nouveau";
  const car = isNew ? undefined : cars.data?.find((c) => c.id === carId);

  if ((!isNew && cars.isPending) || (isNew && social.isPending))
    return (
      <div className="grid place-items-center py-24">
        <Spinner aria-label="Chargement du véhicule" />
      </div>
    );
  if (!isNew && !car)
    return (
      <EmptyState
        icon={CarIcon}
        title="Véhicule introuvable."
        description="Il a peut-être été supprimé."
      />
    );

  // Remounted per vehicle so the draft starts from it.
  return (
    <Editor
      key={carId}
      initial={
        car ??
          // New vehicle: pre-set to post on the connected networks.
          { ...emptyCar, social_targets: SOCIAL_PLATFORMS.filter((p) => social.data?.[p]) }
      }
      from={from}
    />
  );
}

function Editor({ initial, from }: { initial: CarInput; from: EditOrigin }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { primary } = usePhones();
  const origin = useMemo(() => originOf(from), [from]);
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [original, setOriginal] = useState(() => JSON.stringify(toDraft(initial)));
  const [done, setDone] = useState(false);

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
      toast.success("Véhicule enregistré.");
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
    : "Nouveau véhicule";

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
