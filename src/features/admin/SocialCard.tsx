import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { Alert, Button, Label, Spinner, TextArea, TextField, toast } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, RotateCw, Sparkles } from "@/components/icons";
import { FacebookLogo, InstagramLogo } from "@/components/aks/SocialLogos";
import {
  buildSocialCaption,
  SOCIAL_CAPTION_MAX,
  SOCIAL_LABELS,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/features/catalog/social";
import { getSocialStatus, listSocialPosts, retrySocialShare, type CarInput } from "@/lib/data";
import { usePhones } from "@/lib/site-content";
import { t } from "./i18n";
import { dateTimeFormat } from "./model";
import { SectionCard, StatusChip, SwitchField } from "./ui";

export const socialStatusQuery = queryOptions({
  queryKey: ["social-status"],
  queryFn: () => getSocialStatus(),
  staleTime: 5 * 60_000,
});
const postsQuery = (carId: string) =>
  queryOptions({
    queryKey: ["social-posts", carId],
    queryFn: () => listSocialPosts({ data: { carId } }),
    // Posting runs in the background: refresh while something is pending.
    refetchInterval: (query) =>
      query.state.data?.some((post) => post.status === "pending") ? 3000 : false,
  });

const ICONS = { facebook: FacebookLogo, instagram: InstagramLogo } as const;

type ShareResult = {
  started: SocialPlatform[];
  skipped: { platform: SocialPlatform; reason: string }[];
  error?: string;
} | null;

const names = (platforms: SocialPlatform[]) =>
  platforms.map((p) => SOCIAL_LABELS[p]).join(t(" et "));

/** Toasts after saving or publishing a vehicle with networks selected. */
export function announceShare(result: ShareResult | undefined) {
  if (!result) return;
  if (result.error) toast.warning(t("Réseaux sociaux : {error}", { error: result.error }));
  else if (result.started.length)
    toast.info(t("Publication sur {networks} en cours…", { networks: names(result.started) }));
}

/** Facebook / Instagram post of a vehicle: networks, text and history. */
export function SocialCard({
  value,
  onChange,
}: {
  value: CarInput;
  onChange: (update: (car: CarInput) => CarInput) => void;
}) {
  const queryClient = useQueryClient();
  const status = useQuery(socialStatusQuery);
  const posts = useQuery({ ...postsQuery(value.id ?? ""), enabled: Boolean(value.id) });
  const { primary } = usePhones();
  const targets = value.social_targets ?? [];
  const caption = value.social_caption ?? "";

  const generate = () =>
    buildSocialCaption(value, {
      url: `${window.location.origin}/vehicule/${value.slug || "…"}`,
      phone: primary?.number,
    });

  const retry = useMutation({
    mutationFn: () => retrySocialShare({ data: { carId: value.id! } }),
    onSuccess: async (result) => {
      announceShare(result);
      await queryClient.invalidateQueries({ queryKey: ["social-posts", value.id] });
    },
    onError: (e: Error) => toast.danger(e.message),
  });

  const latest = (platform: SocialPlatform) =>
    posts.data?.find((post) => post.platform === platform);
  const connected = {
    facebook: Boolean(status.data?.facebook),
    instagram: Boolean(status.data?.instagram),
  };
  const noneConnected = status.isSuccess && !connected.facebook && !connected.instagram;

  return (
    <SectionCard
      title={t("Réseaux sociaux")}
      description={t(
        "À l’enregistrement d’un véhicule publié (et non vendu), une publication est créée sur les réseaux cochés, avec ses photos et le texte ci-dessous. Chaque véhicule n’est publié qu’une fois par réseau.",
      )}
    >
      <div className="grid gap-5">
        {noneConnected && (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t("Facebook et Instagram ne sont pas encore connectés.")}</Alert.Title>
              <Alert.Description>
                {t(
                  status.data?.error
                    ? "La publication sur Facebook et Instagram n’est pas encore installée sur ce site."
                    : "Connectez la Page Facebook et le compte Instagram du showroom dans Connecteurs.",
                )}{" "}
                <Link to="/admin/connecteurs" className="font-medium text-accent hover:underline">
                  {t("Ouvrir Connecteurs")}
                </Link>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => {
            const Icon = ICONS[platform];
            const post = latest(platform);
            return (
              <div
                key={platform}
                className="grid content-start gap-3 rounded-xl border border-separator bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-5" />
                    {SOCIAL_LABELS[platform]}
                  </span>
                  {status.isPending ? (
                    <Spinner size="sm" aria-label={t("Vérification de la connexion")} />
                  ) : (
                    <StatusChip tone={connected[platform] ? "success" : "default"}>
                      {t(connected[platform] ? "Connecté" : "Non connecté")}
                    </StatusChip>
                  )}
                </div>
                <SwitchField
                  isSelected={targets.includes(platform)}
                  isDisabled={!connected[platform]}
                  onChange={(on) =>
                    onChange((car) => ({
                      ...car,
                      social_targets: on
                        ? [...new Set([...(car.social_targets ?? []), platform])]
                        : (car.social_targets ?? []).filter((p) => p !== platform),
                      // First network chosen: start from a suggested text.
                      social_caption: on && !car.social_caption ? generate() : car.social_caption,
                    }))
                  }
                >
                  {t("Publier sur {network}", { network: SOCIAL_LABELS[platform] })}
                </SwitchField>
                {post?.status === "published" && (
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <StatusChip tone="success">{t("Publié")}</StatusChip>
                    {dateTimeFormat.format(new Date(post.createdAt))}
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        {t("Voir")} <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </p>
                )}
                {post?.status === "pending" && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Spinner size="sm" aria-hidden /> {t("Publication en cours…")}
                  </p>
                )}
                {post?.status === "failed" && (
                  <div className="grid gap-2">
                    <p role="alert" className="text-sm text-danger">
                      {t("Échec : {error}", { error: post.error ?? "" })}
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="justify-self-start"
                      isPending={retry.isPending}
                      isDisabled={!value.published || value.sold === true}
                      onPress={() => retry.mutate()}
                    >
                      <RotateCw className="size-4" aria-hidden />
                      {t("Réessayer")}
                    </Button>
                  </div>
                )}
                {platform === "instagram" &&
                  targets.includes("instagram") &&
                  !value.images.length && (
                    <p className="text-xs text-warning">
                      {t("Instagram exige au moins une photo.")}
                    </p>
                  )}
              </div>
            );
          })}
        </div>

        <TextField
          value={caption}
          onChange={(social_caption) => onChange((car) => ({ ...car, social_caption }))}
          maxLength={SOCIAL_CAPTION_MAX}
          fullWidth
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label>{t("Texte de la publication")}</Label>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => onChange((car) => ({ ...car, social_caption: generate() }))}
            >
              <Sparkles className="size-4" aria-hidden />
              {t("Générer à partir de la fiche")}
            </Button>
          </div>
          <TextArea rows={9} placeholder={t("Texte, prix, lien vers la fiche, hashtags…")} />
          <p className="text-end text-xs tabular-nums text-muted">
            {caption.length} / {SOCIAL_CAPTION_MAX}
          </p>
        </TextField>
      </div>
    </SectionCard>
  );
}
