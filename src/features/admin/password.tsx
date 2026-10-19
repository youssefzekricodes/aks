import { useRef, useState, type ReactNode } from "react";
import {
  Button,
  Description,
  FieldError,
  InputGroup,
  Label,
  TextField,
  Tooltip,
  toast,
} from "@heroui/react";
import { Check, Copy, Eye, EyeOff, Wand2 } from "@/components/icons";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  generatePassword,
  passwordStrength,
  type PasswordDraft,
} from "./model";

/** Copies `value` and confirms it for a moment (icon + toast). */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copié dans le presse-papiers.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.danger("Copie impossible. Sélectionnez le texte puis copiez-le.");
    }
  }
  const Icon = copied ? Check : Copy;
  return (
    <Tooltip delay={400} closeDelay={0}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={label}
        isDisabled={!value}
        onPress={() => void copy()}
      >
        <Icon className="size-4" aria-hidden />
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

/**
 * Password input with a show/hide toggle in the field. A pointer press puts the
 * caret back in the input; keyboard users keep focus on the toggle.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  name,
  isRequired = true,
  isVisible: visibleProp,
  onVisibleChange,
  isInvalid,
  errorMessage,
  description,
  suffix,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  name?: string;
  isRequired?: boolean;
  isVisible?: boolean | undefined;
  onVisibleChange?: ((visible: boolean) => void) | undefined;
  isInvalid?: boolean;
  errorMessage?: ReactNode;
  description?: ReactNode;
  /** Extra buttons after the toggle (copy…). */
  suffix?: ReactNode;
  autoFocus?: boolean;
}) {
  const [visibleState, setVisibleState] = useState(false);
  const isVisible = visibleProp ?? visibleState;
  const input = useRef<HTMLInputElement>(null);
  const toggleLabel = isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe";
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <TextField
      {...(name ? { name } : {})}
      type={isVisible ? "text" : "password"}
      autoComplete={autoComplete}
      isRequired={isRequired}
      isInvalid={isInvalid ?? false}
      value={value}
      onChange={onChange}
      fullWidth
      {...(autoFocus ? { autoFocus } : {})}
    >
      <Label>{label}</Label>
      <InputGroup fullWidth>
        <InputGroup.Input
          ref={input}
          spellCheck={false}
          autoCapitalize="off"
          className={isVisible ? "font-mono" : ""}
        />
        <InputGroup.Suffix className="gap-0.5 pe-1">
          <Tooltip delay={400} closeDelay={0}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={toggleLabel}
              aria-pressed={isVisible}
              onPress={(event) => {
                const next = !isVisible;
                if (visibleProp === undefined) setVisibleState(next);
                onVisibleChange?.(next);
                if (event.pointerType !== "keyboard" && event.pointerType !== "virtual") {
                  const el = input.current;
                  if (el) {
                    el.focus();
                    const end = el.value.length;
                    requestAnimationFrame(() => el.setSelectionRange(end, end));
                  }
                }
              }}
            >
              <Icon className="size-4" aria-hidden />
            </Button>
            <Tooltip.Content>{toggleLabel}</Tooltip.Content>
          </Tooltip>
          {suffix}
        </InputGroup.Suffix>
      </InputGroup>
      {description && <Description>{description}</Description>}
      {errorMessage && <FieldError>{errorMessage}</FieldError>}
    </TextField>
  );
}

const STRENGTH = [
  { label: "Trop court", className: "text-danger" },
  { label: "Faible", className: "text-warning" },
  { label: "Correct", className: "text-foreground" },
  { label: "Robuste", className: "text-success" },
] as const;

/**
 * New password + confirmation, with a generator (fills both fields and shows the
 * value so it can be copied) and a strength hint.
 */
export function NewPasswordFields({
  value,
  onChange,
  showErrors,
  label = "Mot de passe",
}: {
  value: PasswordDraft;
  onChange: (value: PasswordDraft) => void;
  /** Show errors for empty/short fields too (after a submit attempt). */
  showErrors: boolean;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value.password);
  const tooShort = value.password.length < PASSWORD_MIN;
  const tooLong = value.password.length > PASSWORD_MAX;
  const mismatch = value.confirm.length > 0 && value.confirm !== value.password;
  const passwordError =
    (showErrors || value.password.length > 0) && tooLong
      ? `${PASSWORD_MAX} caractères maximum.`
      : showErrors && tooShort
        ? `${PASSWORD_MIN} caractères minimum.`
        : null;
  const confirmError =
    mismatch || (showErrors && value.confirm !== value.password)
      ? "Les deux mots de passe ne correspondent pas."
      : null;

  return (
    <div className="grid gap-4">
      <PasswordField
        label={label}
        name="new-password"
        autoComplete="new-password"
        value={value.password}
        onChange={(password) => onChange({ ...value, password })}
        isVisible={visible}
        onVisibleChange={setVisible}
        isInvalid={passwordError !== null}
        errorMessage={passwordError}
        suffix={<CopyButton value={value.password} label="Copier le mot de passe" />}
        description={
          passwordError ? undefined : (
            <span aria-live="polite">
              {value.password ? (
                <>
                  <span className={`font-medium ${STRENGTH[strength].className}`}>
                    {STRENGTH[strength].label}
                  </span>
                  {" · "}
                  {value.password.length} caractère{value.password.length > 1 ? "s" : ""}
                  {tooShort ? ` sur ${PASSWORD_MIN} minimum` : ""}
                </>
              ) : (
                `${PASSWORD_MIN} caractères minimum. Mélangez lettres, chiffres et symboles.`
              )}
            </span>
          )
        }
      />
      <PasswordField
        label="Confirmation du mot de passe"
        name="confirm-password"
        autoComplete="new-password"
        value={value.confirm}
        onChange={(confirm) => onChange({ ...value, confirm })}
        isVisible={visible}
        onVisibleChange={setVisible}
        isInvalid={confirmError !== null}
        errorMessage={confirmError}
      />
      <div>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            const password = generatePassword(16);
            onChange({ password, confirm: password });
            setVisible(true);
          }}
        >
          <Wand2 className="size-4" aria-hidden />
          Générer un mot de passe
        </Button>
        <p className="mt-2 text-xs text-muted">
          Transmettez-le par un canal sûr ; il ne sera plus affiché après validation.
        </p>
      </div>
    </div>
  );
}
