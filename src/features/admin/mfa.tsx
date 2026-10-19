import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Description,
  FieldError,
  Form,
  InputOTP,
  Input,
  Label,
  Radio,
  RadioGroup,
  REGEXP_ONLY_DIGITS,
  Spinner,
  TextField,
} from "@heroui/react";
import { ArrowLeft, Mail, MessageSquare, Smartphone } from "@/components/icons";
import {
  emailCodeSend,
  emailCodeVerify,
  mfaChallenge,
  mfaEnroll,
  mfaVerify,
} from "@/features/auth/auth.functions";
import { CopyButton } from "./password";
import { errorMessage, isE164, toE164, type Factor } from "./model";

/*
 * Two-factor authentication flows shared by the login page (/auth) and the
 * "Ma sécurité" card of the admin.
 */

const RESEND_COOLDOWN = 30;
/** Supabase sends at most one e-mail code per minute and address. */
const EMAIL_RESEND_COOLDOWN = 60;

const FACTOR_ICONS = { email: Mail, totp: Smartphone, phone: MessageSquare } as const;

const EMAIL_SENT = "email";
/**
 * Digits in the e-mail code: Supabase → Authentication → Email → "Email OTP
 * Length" (8 on this project). App and SMS codes always have 6.
 */
export const EMAIL_CODE_LENGTH = 8;
/**
 * Each new e-mail code replaces the previous one, so the gate must not send a
 * new code every time it opens (reload, back button): within this window it
 * reuses the code already sent. Stored per browser tab.
 */
const EMAIL_CODE_REUSE_MS = 10 * 60_000;
const EMAIL_SENT_KEY = "aks:code-email-envoye";
const lastEmailSend = () => {
  try {
    return Number(sessionStorage.getItem(EMAIL_SENT_KEY)) || 0;
  } catch {
    return 0;
  }
};
const rememberEmailSend = (at: number | null) => {
  try {
    if (at === null) sessionStorage.removeItem(EMAIL_SENT_KEY);
    else sessionStorage.setItem(EMAIL_SENT_KEY, String(at));
  } catch {
    // Storage unavailable: worst case a new code is sent on the next visit.
  }
};

function InlineError({ message }: { message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{message}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}

function BackButton({ onPress, isDisabled }: { onPress: () => void; isDisabled?: boolean }) {
  return (
    <Button variant="ghost" size="sm" onPress={onPress} isDisabled={isDisabled ?? false}>
      <ArrowLeft className="size-4" aria-hidden />
      Retour
    </Button>
  );
}

/**
 * Six-digit code entry for one factor. E-mail and phone factors get their code
 * sent once on mount (plus a resend with cooldown); TOTP factors get a fresh
 * challenge at submit time, so it never expires while the user opens their app.
 */
export function CodeChallenge({
  factor,
  onVerified,
}: {
  factor: Pick<Factor, "id" | "type" | "label">;
  onVerified: () => unknown;
}) {
  const isEmail = factor.type === "email";
  const digits = isEmail ? EMAIL_CODE_LENGTH : 6;
  // Factors whose code is sent to the user (rather than shown in an app).
  const isPhone = factor.type === "phone" || isEmail;
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const sentFor = useRef<string | null>(null);
  const verifyingNow = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const labelId = `otp-label-${factor.id}`;
  const descriptionId = `otp-description-${factor.id}`;

  const send = useCallback(async () => {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      if (isEmail) {
        const result = await emailCodeSend();
        setChallengeId(EMAIL_SENT);
        setCooldown(EMAIL_RESEND_COOLDOWN);
        if (result.alreadySent)
          setNotice(
            "Un code vous a été envoyé il y a moins d’une minute : utilisez celui du dernier e-mail reçu.",
          );
        else rememberEmailSend(Date.now());
      } else {
        const result = await mfaChallenge({ data: { factorId: factor.id } });
        setChallengeId(result.challengeId);
        setCooldown(RESEND_COOLDOWN);
      }
    } catch (failure) {
      setError(errorMessage(failure, "Envoi du code impossible."));
    } finally {
      setSending(false);
    }
  }, [factor.id, isEmail]);

  // Send the code once per factor (the ref also survives StrictMode's double effect).
  useEffect(() => {
    if (!isPhone || sentFor.current === factor.id) return;
    sentFor.current = factor.id;
    const sentAt = isEmail ? lastEmailSend() : 0;
    const age = Date.now() - sentAt;
    if (isEmail && age < EMAIL_CODE_REUSE_MS) {
      // A code sent moments ago is still valid: do not replace it.
      setChallengeId(EMAIL_SENT);
      setCooldown(Math.max(0, Math.ceil((EMAIL_RESEND_COOLDOWN * 1000 - age) / 1000)));
      setNotice("Un code vous a déjà été envoyé : utilisez celui du dernier e-mail reçu.");
      return;
    }
    void send();
  }, [isPhone, isEmail, factor.id, send]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  // After the parent has moved focus (step change), put it in the code input.
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [factor.id]);

  async function verify(value: string) {
    // Ref, not state: auto-submit and the button can fire in the same tick, and a
    // second check of an already used code would fail.
    if (verifyingNow.current || value.length !== digits) return;
    verifyingNow.current = true;
    setVerifying(true);
    setError(null);
    try {
      if (isEmail) {
        await emailCodeVerify({ data: { code: value } });
        rememberEmailSend(null);
        await onVerified();
        return;
      }
      const id = isPhone
        ? challengeId
        : (await mfaChallenge({ data: { factorId: factor.id } })).challengeId;
      if (!id) throw new Error("Demandez d’abord l’envoi d’un code.");
      await mfaVerify({ data: { factorId: factor.id, challengeId: id, code: value } });
      await onVerified();
    } catch (failure) {
      setError(errorMessage(failure, "Vérification impossible."));
      setCode("");
      input.current?.focus();
    } finally {
      verifyingNow.current = false;
      setVerifying(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void verify(code);
  }

  const destination = factor.label.replace(/^(SMS|E-mail)\s*/, "");
  const by = isEmail ? "par e-mail à" : "au";

  return (
    <Form onSubmit={onSubmit} className="grid gap-4">
      {error && <InlineError message={error} />}
      {notice && !error && (
        <Alert status="accent">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{notice}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      <div className="grid min-w-0 gap-2">
        <Label id={labelId}>Code de vérification</Label>
        <p id={descriptionId} className="text-sm text-muted" aria-live="polite">
          {isPhone
            ? sending
              ? `Envoi du code ${by} ${destination}…`
              : challengeId
                ? `Code envoyé ${by} ${destination}.${isEmail ? " Seul le dernier code reçu est valable." : ""}`
                : `Le code sera envoyé ${isEmail ? "par e-mail à" : "par SMS au"} ${destination}.`
            : "Saisissez le code à 6 chiffres affiché dans votre application d’authentification."}
        </p>
        <InputOTP
          // Boxes share the card width (8 fixed-size boxes would overflow it).
          className="min-w-0"
          ref={input}
          maxLength={digits}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          name="code"
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          value={code}
          onChange={(value: string) => {
            setCode(value);
            if (error) setError(null);
          }}
          onComplete={(value: string) => void verify(value)}
          isDisabled={verifying}
          isInvalid={error !== null}
        >
          {/* Two halves: 3 + 3 or 4 + 4 digits. */}
          {[0, digits / 2].map((start, half) => (
            <Fragment key={start}>
              {half === 1 && <InputOTP.Separator />}
              <InputOTP.Group className="min-w-0 flex-1 gap-1.5 sm:gap-2">
                {Array.from({ length: digits / 2 }, (_, i) => (
                  <InputOTP.Slot key={start + i} index={start + i} className="w-auto" />
                ))}
              </InputOTP.Group>
            </Fragment>
          ))}
        </InputOTP>
      </div>
      {isPhone && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-muted">Pas reçu ?</span>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={sending || cooldown > 0 || verifying}
            onPress={() => void send()}
          >
            {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
          </Button>
        </div>
      )}
      <Button type="submit" fullWidth isPending={verifying} isDisabled={code.length !== digits}>
        {verifying ? "Vérification…" : "Vérifier"}
      </Button>
    </Form>
  );
}

/** Second step of the login for an account that already has a verified factor. */
export function MfaVerify({
  factors,
  onVerified,
}: {
  factors: Factor[];
  onVerified: () => unknown;
}) {
  const [selected, setSelected] = useState(factors[0]?.id ?? "");
  const [active, setActive] = useState<Factor | null>(
    factors.length === 1 ? (factors[0] ?? null) : null,
  );

  if (!factors.length)
    return <InlineError message="Aucune méthode de double authentification trouvée." />;

  if (!active)
    return (
      <Form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setActive(factors.find((factor) => factor.id === selected) ?? factors[0] ?? null);
        }}
      >
        <RadioGroup value={selected} onChange={setSelected} name="factor">
          <Label>Méthode de vérification</Label>
          {factors.map((factor) => {
            const Icon = FACTOR_ICONS[factor.type];
            return (
              <Radio key={factor.id} value={factor.id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted" aria-hidden />
                    {factor.label}
                  </span>
                </Radio.Content>
              </Radio>
            );
          })}
        </RadioGroup>
        <Button type="submit" fullWidth>
          Continuer
        </Button>
      </Form>
    );

  return (
    <div className="grid gap-4">
      <CodeChallenge key={active.id} factor={active} onVerified={onVerified} />
      {factors.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-center"
          onPress={() => setActive(null)}
        >
          Utiliser une autre méthode
        </Button>
      )}
    </div>
  );
}

type Enrollment =
  | { stage: "choose" }
  | { stage: "totp"; factorId: string | null; qrCode: string | null; secret: string | null }
  | { stage: "phone" }
  | { stage: "phone-code"; factorId: string; phone: string };

/** Sets up a new factor: authenticator app (QR code) or SMS, then verifies a code. */
export function MfaEnroll({
  onEnrolled,
  required = false,
}: {
  onEnrolled: () => unknown;
  /** Login of a super admin without any factor yet. */
  required?: boolean;
}) {
  const [method, setMethod] = useState<"totp" | "phone">("totp");
  const [state, setState] = useState<Enrollment>({ stage: "choose" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("+216 ");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValid = isE164(phone);

  async function startTotp() {
    setState({ stage: "totp", factorId: null, qrCode: null, secret: null });
    setPending(true);
    setError(null);
    try {
      const result = await mfaEnroll({ data: { type: "totp" } });
      setState({ stage: "totp", ...result });
    } catch (failure) {
      setError(errorMessage(failure, "Activation impossible."));
    } finally {
      setPending(false);
    }
  }

  async function startPhone() {
    setPhoneTouched(true);
    if (!phoneValid || pending) return;
    setPending(true);
    setError(null);
    const number = toE164(phone);
    try {
      const result = await mfaEnroll({ data: { type: "phone", phone: number } });
      setState({ stage: "phone-code", factorId: result.factorId, phone: number });
    } catch (failure) {
      setError(errorMessage(failure, "Activation impossible."));
    } finally {
      setPending(false);
    }
  }

  function back() {
    setState({ stage: "choose" });
    setError(null);
  }

  if (state.stage === "choose")
    return (
      <Form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (method === "totp") void startTotp();
          else {
            setError(null);
            setState({ stage: "phone" });
          }
        }}
      >
        {required && (
          <Alert status="accent">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Étape obligatoire</Alert.Title>
              <Alert.Description>
                La double authentification est obligatoire pour les super administrateurs.
                Configurez une méthode pour accéder à l’administration.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <RadioGroup
          value={method}
          onChange={(value) => setMethod(value === "phone" ? "phone" : "totp")}
          name="mfa-method"
        >
          <Label>Méthode</Label>
          <Radio value="totp">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              Application d’authentification (recommandé)
            </Radio.Content>
            <Description>
              Google Authenticator, Microsoft Authenticator, 1Password… Fonctionne hors ligne.
            </Description>
          </Radio>
          <Radio value="phone">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              SMS
            </Radio.Content>
            <Description>Un code est envoyé sur votre téléphone à chaque connexion.</Description>
          </Radio>
        </RadioGroup>
        <Button type="submit" fullWidth>
          Continuer
        </Button>
      </Form>
    );

  if (state.stage === "totp")
    return (
      <div className="grid gap-4">
        {error && <InlineError message={error} />}
        {pending ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
            <Spinner size="sm" />
            Préparation du QR code…
          </div>
        ) : state.factorId && state.qrCode ? (
          <>
            <ol className="grid list-decimal gap-1 ps-5 text-sm text-muted">
              <li>Ouvrez votre application d’authentification.</li>
              <li>Scannez le QR code ou saisissez la clé.</li>
              <li>Entrez le code à 6 chiffres affiché.</li>
            </ol>
            <img
              src={state.qrCode}
              alt="QR code à scanner avec votre application d’authentification"
              width={180}
              height={180}
              className="mx-auto size-[180px] rounded-lg border border-separator bg-white p-2"
            />
            {state.secret && (
              <div className="grid gap-1">
                <p className="text-xs text-muted" id="totp-secret-label">
                  Clé de configuration
                </p>
                <div className="flex items-center gap-1 rounded-xl border border-separator bg-surface-secondary ps-3 pe-1">
                  <code
                    aria-labelledby="totp-secret-label"
                    className="min-w-0 flex-1 break-all py-2 font-mono text-sm text-foreground"
                  >
                    {state.secret.replace(/(.{4})(?=.)/g, "$1 ")}
                  </code>
                  <CopyButton value={state.secret} label="Copier la clé" />
                </div>
              </div>
            )}
            <CodeChallenge
              factor={{ id: state.factorId, type: "totp", label: "Application" }}
              onVerified={onEnrolled}
            />
          </>
        ) : (
          <Button variant="secondary" onPress={() => void startTotp()}>
            Réessayer
          </Button>
        )}
        <BackButton onPress={back} isDisabled={pending} />
      </div>
    );

  if (state.stage === "phone")
    return (
      <Form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void startPhone();
        }}
      >
        {error && <InlineError message={error} />}
        <TextField
          name="phone"
          type="tel"
          autoComplete="tel"
          isRequired
          value={phone}
          onChange={setPhone}
          onBlur={() => setPhoneTouched(true)}
          isInvalid={phoneTouched && !phoneValid}
          fullWidth
        >
          <Label>Numéro de téléphone</Label>
          <Input inputMode="tel" placeholder="+216 52 144 869" />
          <Description>Format international, par exemple +216 52 144 869.</Description>
          <FieldError>
            Numéro invalide : indicatif du pays puis le numéro, par exemple +216 52 144 869.
          </FieldError>
        </TextField>
        <Button type="submit" fullWidth isPending={pending}>
          {pending ? "Envoi…" : "Envoyer le code"}
        </Button>
        <BackButton onPress={back} isDisabled={pending} />
      </Form>
    );

  return (
    <div className="grid gap-4">
      <CodeChallenge
        factor={{ id: state.factorId, type: "phone", label: state.phone }}
        onVerified={onEnrolled}
      />
      <BackButton onPress={back} />
    </div>
  );
}
