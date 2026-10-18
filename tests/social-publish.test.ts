// Unit tests for the social-publish Edge Function logic (no Supabase or Meta needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handle,
  postToFacebook,
  postToInstagram,
  type Connection,
  type Graph,
  type Platform,
  type SocialDb,
} from "../supabase/functions/social-publish/handler.ts";

const CAR = "11111111-1111-1111-1111-111111111111";
const config = { pageId: "page", pageToken: "token", igUserId: "ig" };
const post = {
  caption: "BMW X5 2021",
  url: "https://aks.tn/vehicule/bmw-x5",
  images: ["https://media.aks.tn/a.jpg", "https://media.aks.tn/b.jpg"],
};

/** Records every Graph call and answers like Meta does. */
function fakeGraph(statuses: string[] = ["IN_PROGRESS", "FINISHED"]) {
  const calls: string[] = [];
  let next = 0;
  const graph: Graph = async (path, params, method = "POST") => {
    calls.push(`${method} ${path} ${Object.keys(params).sort().join(",")}`);
    if (params["fields"] === "status_code") return { status_code: statuses.shift() ?? "FINISHED" };
    if (params["fields"])
      return { permalink_url: "https://fb.com/p", permalink: "https://ig.com/p" };
    return { id: `id${++next}` };
  };
  return { graph, calls };
}

function fakeDb(
  state: { published: boolean; sold: boolean } | null = { published: true, sold: false },
) {
  const claimed = new Set<Platform>();
  const finished: unknown[] = [];
  const store: { connection: Connection | null; pending: Map<string, string> } = {
    connection: null,
    pending: new Map(),
  };
  const db: SocialDb = {
    adminUser: async (token) => (token === "admin" ? "user-1" : null),
    connection: async () => store.connection,
    saveConnection: async (connection) => void (store.connection = connection),
    deleteConnection: async () => void (store.connection = null),
    setPending: async (user, token) => void store.pending.set(user, token),
    takePending: async (user) => {
      const token = store.pending.get(user) ?? null;
      store.pending.delete(user);
      return token;
    },
    carState: async () => state,
    claim: async (_car, platform) => {
      if (claimed.has(platform)) return null;
      claimed.add(platform);
      return `row-${platform}`;
    },
    finish: async (row, result) => void finished.push({ row, ...result }),
  };
  return { db, claimed, finished, store };
}

test("Facebook: photos uploaded unpublished, then one post with all of them", async () => {
  const { graph, calls } = fakeGraph();
  const result = await postToFacebook(graph, config, post);
  assert.deepEqual(calls, [
    "POST page/photos published,url",
    "POST page/photos published,url",
    "POST page/feed attached_media,message",
    "GET id3 fields",
  ]);
  assert.deepEqual(result, { externalId: "id3", permalink: "https://fb.com/p" });
});

test("Instagram: carousel container, waits for processing, then publishes", async () => {
  const { graph, calls } = fakeGraph(["IN_PROGRESS", "FINISHED"]);
  const result = await postToInstagram(graph, config, post, { pollEvery: 0 });
  assert.deepEqual(calls, [
    "POST ig/media image_url,is_carousel_item",
    "POST ig/media image_url,is_carousel_item",
    "POST ig/media caption,children,media_type",
    "GET id3 fields",
    "GET id3 fields",
    "POST ig/media_publish creation_id",
    "GET id4 fields",
  ]);
  assert.equal(result.permalink, "https://ig.com/p");
  await assert.rejects(
    postToInstagram(graph, config, { ...post, images: [] }),
    /au moins une photo/,
  );
  await assert.rejects(
    postToInstagram(fakeGraph(["ERROR"]).graph, config, post, { pollEvery: 0 }),
    /n’a pas pu traiter/,
  );
});

test("publish: admins only, published unsold cars only, each network once", async () => {
  const background: Promise<unknown>[] = [];
  const deps = (db: SocialDb) => ({
    db,
    graph: fakeGraph().graph,
    config,
    app: {},
    pollEvery: 0,
    background: (work: Promise<unknown>) => void background.push(work),
  });
  const body = { action: "publish", carId: CAR, ...post, targets: ["facebook", "instagram"] };

  assert.equal((await handle(null, body, deps(fakeDb().db))).status, 401);
  assert.equal((await handle("visitor", body, deps(fakeDb().db))).status, 403);
  assert.equal(
    (await handle("admin", body, deps(fakeDb({ published: false, sold: false }).db))).status,
    409,
  );
  assert.equal(
    (await handle("admin", { ...body, images: ["http://insecure"] }, deps(fakeDb().db))).status,
    400,
  );

  const { db, finished } = fakeDb();
  const first = await handle("admin", body, deps(db));
  assert.equal(first.status, 202);
  assert.deepEqual((first.body as { started: string[] }).started, ["facebook", "instagram"]);
  await Promise.all(background);
  assert.equal(finished.length, 2);
  assert.ok(finished.every((f) => (f as { status: string }).status === "published"));

  const again = await handle("admin", body, deps(db));
  assert.deepEqual((again.body as { started: string[] }).started, [], "never posted twice");
});

test("connector: Facebook login lists the Pages, choosing one stores its token", async () => {
  const calls: string[] = [];
  const graph: Graph = async (path, params, method = "POST") => {
    calls.push(`${method} ${path}`);
    if (path === "oauth/access_token")
      return { access_token: params["grant_type"] ? "long-user" : "short-user" };
    if (path === "me/accounts")
      return {
        data: [
          {
            id: "123",
            name: "Auto Kontor Sfax",
            instagram_business_account: { id: "456", username: "auto_kontor.sfax" },
          },
        ],
      };
    if (path === "123")
      return {
        id: "123",
        name: "Auto Kontor Sfax",
        access_token: "page-token",
        instagram_business_account: { id: "456", username: "auto_kontor.sfax" },
      };
    return {};
  };
  const { db, store } = fakeDb();
  const deps = {
    db,
    graph,
    config: {},
    app: { appId: "app", appSecret: "secret" },
    background: () => {},
  };
  const redirectUri = "https://aks.tn/meta-callback";

  const bad = await handle(
    "admin",
    { action: "connect", code: "x", redirectUri: "https://evil.tn/steal" },
    deps,
  );
  assert.equal(bad.status, 400, "only the /meta-callback page can receive the code");

  const connect = await handle("admin", { action: "connect", code: "abc", redirectUri }, deps);
  assert.equal(connect.status, 200);
  assert.deepEqual((connect.body as { pages: { id: string }[] }).pages[0]?.id, "123");
  assert.ok(!JSON.stringify(connect.body).includes("token"), "no token sent to the browser");

  const select = await handle("admin", { action: "select", pageId: "123" }, deps);
  assert.equal(select.status, 200);
  assert.equal(store.connection?.pageToken, "page-token");
  assert.equal(store.connection?.igUserId, "456");
  assert.equal(
    (await handle("admin", { action: "select", pageId: "123" }, deps)).status,
    409,
    "the user token is used once",
  );

  const status = await handle("admin", { action: "status" }, deps);
  assert.deepEqual(status.body, {
    app: true,
    appId: "app",
    loginConfigId: null,
    facebook: { pageId: "123", name: "Auto Kontor Sfax", picture: null },
    instagram: { username: "auto_kontor.sfax", picture: null },
  });
  assert.ok(!JSON.stringify(status.body).includes("page-token"));

  await handle("admin", { action: "disconnect" }, deps);
  assert.equal(store.connection, null);
  assert.equal(calls.filter((c) => c === "GET oauth/access_token").length, 2);
});

test("status with manual secrets (no admin connection)", async () => {
  const result = await handle(
    "admin",
    { action: "status" },
    {
      db: fakeDb().db,
      graph: fakeGraph().graph,
      config: { pageId: "p", pageToken: "t" },
      app: {},
      background: () => {},
    },
  );
  assert.equal((result.body as { app: boolean }).app, false);
  assert.equal((result.body as { instagram: unknown }).instagram, null);
  assert.ok((result.body as { facebook: unknown }).facebook);
});
