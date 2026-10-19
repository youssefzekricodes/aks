import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin, siteOrigin } from "../src/server/origin.ts";

test("same-site requests pass whatever APP_ORIGIN says; other sites never do", () => {
  // Netlify: the function sees an internal URL, the real host in the headers.
  const netlify = {
    url: "http://localhost:8888/_serverFn/x",
    host: "autokontorsfax.com",
    forwardedProto: "https",
    appOrigin: "https://xxx.netlify.app", // stale setting
  };
  assert.equal(isAllowedOrigin("https://autokontorsfax.com", netlify).ok, true);
  assert.equal(isAllowedOrigin("https://xxx.netlify.app", netlify).ok, true);
  assert.equal(isAllowedOrigin("https://evil.example", netlify).ok, false);
  assert.equal(isAllowedOrigin(null, netlify).ok, false, "no Origin header: refused");
  assert.equal(
    isAllowedOrigin("http://autokontorsfax.com", netlify).ok,
    false,
    "http on an https site: refused",
  );
  // Local development without APP_ORIGIN.
  assert.equal(
    isAllowedOrigin("http://127.0.0.1:3001", {
      url: "http://127.0.0.1:3001/x",
      host: "127.0.0.1:3001",
    }).ok,
    true,
  );
});

test("public address: APP_ORIGIN, except a copied local address in production", () => {
  const live = {
    url: "http://localhost:8888/sitemap.xml",
    host: "autokontorsfax.com",
    forwardedProto: "https",
  };
  assert.equal(
    siteOrigin({ ...live, appOrigin: "http://127.0.0.1:3001" }),
    "https://autokontorsfax.com",
  );
  assert.equal(
    siteOrigin({ ...live, appOrigin: "https://autokontorsfax.com" }),
    "https://autokontorsfax.com",
  );
  assert.equal(siteOrigin({ ...live, appOrigin: null }), "https://autokontorsfax.com");
  // On the developer's machine the local address is right.
  assert.equal(
    siteOrigin({
      url: "http://127.0.0.1:3001/",
      host: "127.0.0.1:3001",
      appOrigin: "http://127.0.0.1:3001",
    }),
    "http://127.0.0.1:3001",
  );
});
