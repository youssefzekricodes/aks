import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button, Modal } from "@heroui/react";
import { FacebookLogo, InstagramLogo } from "@/components/aks/SocialLogos";
import type { SocialPlatform } from "@/features/catalog/social";
import { t } from "./i18n";
import { plural } from "./model";
import { socialStatusQuery } from "./SocialCard";

/** Choose the networks, then share the selected vehicles (each network once per vehicle). */
export function ShareDialog({
  count,
  isOpen,
  onOpenChange,
  onShare,
}: {
  count: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (targets: SocialPlatform[]) => Promise<unknown>;
}) {
  const social = useQuery(socialStatusQuery);
  const connected = {
    facebook: Boolean(social.data?.facebook),
    instagram: Boolean(social.data?.instagram),
  };
  const [targets, setTargets] = useState<ReadonlySet<SocialPlatform>>(
    new Set(["facebook", "instagram"]),
  );
  const [pending, setPending] = useState(false);
  const chosen = (["facebook", "instagram"] as const).filter((p) => targets.has(p) && connected[p]);

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !pending && onOpenChange(open)}>
      <Modal.Container placement="auto">
        <Modal.Dialog className="sm:max-w-md">
          <Modal.CloseTrigger aria-label={t("Fermer")} />
          <Modal.Header>
            <Modal.Heading>{t("Publier sur les réseaux")}</Modal.Heading>
            <p className="mt-1 text-sm text-muted">
              {t(
                "{count} : une publication avec les photos et la description. Un véhicule déjà publié sur un réseau n’y est pas republié.",
                { count: plural(count, "véhicule", "véhicules") },
              )}
            </p>
          </Modal.Header>
          <Modal.Body className="grid gap-2">
            {(
              [
                ["facebook", "Page Facebook", FacebookLogo],
                ["instagram", "Compte Instagram", InstagramLogo],
              ] as const
            ).map(([platform, label, Logo]) => (
              <label
                key={platform}
                className={`flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 ${
                  connected[platform] ? "cursor-pointer hover:bg-surface-secondary" : "opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!connected[platform]}
                  checked={targets.has(platform) && connected[platform]}
                  onChange={() =>
                    setTargets((current) => {
                      const next = new Set(current);
                      if (!next.delete(platform)) next.add(platform);
                      return next;
                    })
                  }
                  className="size-4 accent-[var(--accent)]"
                />
                <Logo className="size-6" />
                <span className="flex-1 font-medium text-foreground">{t(label)}</span>
                {!connected[platform] && (
                  <span className="text-xs text-muted">{t("Non connecté")}</span>
                )}
              </label>
            ))}
            {!connected.facebook && !connected.instagram && social.data && (
              <p className="text-sm text-muted">
                {t("Connectez la Page dans")}{" "}
                <Link to="/admin/connecteurs" className="font-medium underline">
                  {t("Connecteurs")}
                </Link>
                .
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)}>
              {t("Annuler")}
            </Button>
            <Button
              isPending={pending}
              isDisabled={!chosen.length}
              onPress={async () => {
                setPending(true);
                try {
                  await onShare(chosen);
                  onOpenChange(false);
                } catch {
                  // Reported by the caller (toast).
                } finally {
                  setPending(false);
                }
              }}
            >
              {t("Publier")}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
