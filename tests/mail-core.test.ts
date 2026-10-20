// Unit tests for the built-in mailbox (no mail server needed): what reaches the
// reading frame, and the e-mails the admin sends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHtml, composeRaw, previewOf } from "../src/server/mail-core.ts";

test("e-mail HTML: scripts, frames, forms, handlers and javascript: links are removed", () => {
  const html = cleanHtml(
    `<p onclick="steal()">Bonjour</p><script>alert(1)</script><SCRIPT src=x></SCRIPT>` +
      `<iframe src="https://evil.example"></iframe><form action="/x"><input></form>` +
      `<meta http-equiv="refresh" content="0;url=https://evil.example"><base href="https://evil.example/">` +
      `<a href="javascript:alert(2)">lien</a><img src=x onerror=alert(3)><b>ok</b>`,
  );
  assert.doesNotMatch(html, /script|iframe|<form|<meta|<base|onclick|onerror|javascript:/i);
  assert.match(html, /<p>Bonjour<\/p>/);
  assert.match(html, /<b>ok<\/b>/);
  assert.match(html, /<a href="#">lien<\/a>/);
});

test("sent e-mails: sender, reply threading, escaped HTML copy, attachments", async () => {
  const raw = (
    await composeRaw(
      {
        to: ["client@example.com"],
        cc: ["associe@example.com"],
        subject: "Re: Kia Sportage",
        text: "Bonjour <b>client</b> & merci",
        inReplyTo: "<abc@example.com>",
        references: ["<root@example.com>", "<abc@example.com>"],
        files: [
          {
            filename: "devis.pdf",
            contentType: "application/pdf",
            base64: Buffer.from("%PDF").toString("base64"),
          },
        ],
      },
      { name: "Auto Kontor Sfax", address: "contact@autokontorsfax.com" },
    )
  ).toString();
  assert.match(raw, /^From: Auto Kontor Sfax <contact@autokontorsfax\.com>/m);
  assert.match(raw, /^Cc: associe@example\.com/m);
  assert.match(raw, /^In-Reply-To: <abc@example\.com>/m);
  assert.match(raw, /^References: <root@example\.com> <abc@example\.com>/m);
  // Typed text never becomes markup in the HTML part (quoted-printable may wrap lines).
  assert.match(raw.replace(/=\r?\n/g, ""), /Bonjour &lt;b&gt;client&lt;\/b&gt; &amp; merci/);
  assert.match(raw, /filename=devis\.pdf/);
});

test("list preview: first words of the text, quotes left out, HTML-only mail too", async () => {
  const plain = Buffer.from(
    [
      "From: Client <client@example.com>",
      "Subject: Kia",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Bonjour,",
      "la Kia est-elle   disponible ?",
      "> ancien message cité",
      "",
    ].join("\r\n"),
  );
  assert.equal(await previewOf(plain), "Bonjour, la Kia est-elle disponible ?");
  const html = Buffer.from(
    [
      "From: Client <client@example.com>",
      "Subject: Kia",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<style>p{color:red}</style><p>Bonjour,</p><p>Je veux la <b>Kia</b>.</p>",
      "",
    ].join("\r\n"),
  );
  assert.match(await previewOf(html), /^Bonjour,\s+Je veux la Kia/);
  assert.equal(await previewOf(undefined), "");
});
