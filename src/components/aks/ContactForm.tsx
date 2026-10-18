import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, FieldError, Input, Label, TextArea, TextField, toast } from "@heroui/react";
import { createLead } from "@/lib/data";
import { publicConfigQuery } from "@/lib/queries";
import { useSiteText } from "@/lib/site-content";
import { Turnstile } from "./Turnstile";

/** Inquiry form; `carSlug` attaches the request to a vehicle in the admin "Demandes" list. */
export function ContactForm({
  initialMessage = "",
  carSlug,
}: {
  initialMessage?: string;
  carSlug?: string | undefined;
}) {
  const text = useSiteText();
  const { data: config } = useQuery(publicConfigQuery);
  const siteKey = config?.turnstileSiteKey;

  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [token, setToken] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    if (siteKey && !token) {
      toast.warning(text("contact.verify", "Veuillez valider la vérification anti-spam."));
      return;
    }
    setSending(true);
    try {
      await createLead({
        name,
        phone,
        message,
        ...(carSlug ? { car_slug: carSlug } : {}),
        ...(token ? { turnstile_token: token } : {}),
      });
      toast.success(text("contact.success", "Message enregistré. Notre équipe vous contactera."));
      setName("");
      setPhone("");
      setMessage("");
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSending(false);
      // A Turnstile token is single-use.
      if (siteKey) setAttempt((n) => n + 1);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField isRequired name="name" value={name} onChange={setName} maxLength={200}>
          <Label>{text("contact.text_4", "Nom")}</Label>
          <Input placeholder={text("contact.text_5", "Votre nom")} autoComplete="name" />
          <FieldError />
        </TextField>
        <TextField
          isRequired
          name="phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          minLength={5}
          maxLength={40}
        >
          <Label>{text("contact.text_6", "Téléphone")}</Label>
          <Input placeholder={text("contact.text_7", "+216 ...")} autoComplete="tel" />
          <FieldError />
        </TextField>
      </div>
      <TextField isRequired name="message" value={message} onChange={setMessage} maxLength={5000}>
        <Label>{text("contact.text_8", "Message")}</Label>
        <TextArea
          rows={4}
          className="resize-none"
          placeholder={text("contact.text_9", "Quel véhicule vous intéresse ?")}
        />
        <FieldError />
      </TextField>
      {siteKey && <Turnstile siteKey={siteKey} onToken={setToken} resetKey={attempt} />}
      <Button type="submit" size="lg" isPending={sending} fullWidth>
        {sending ? text("contact.sending", "Envoi…") : text("contact.submit", "Envoyer le message")}
      </Button>
    </form>
  );
}
