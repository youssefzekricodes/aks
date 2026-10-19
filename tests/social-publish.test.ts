// Unit tests for the social-publish Edge Function logic (no Supabase or Meta needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handle,
  postPhotos,
  postToFacebook,
  postToInstagram,
  type Connection,
  type Graph,
  type InboxPost,
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
  const store: {
    connection: Connection | null;
    pending: Map<string, string>;
    known: string[];
    inbox: InboxPost[];
    posts: Map<string, string>;
  } = { connection: null, pending: new Map(), known: [], inbox: [], posts: new Map() };
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
    knownPosts: async () => new Set(store.known),
    saveInbox: async (posts) => void store.inbox.push(...posts),
    markSynced: async () => "2026-10-19T12:00:00.000Z",
    publishedPost: async (car, platform) => store.posts.get(`${car}:${platform}`) ?? null,
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
    lastSyncedAt: null,
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

test("sync: reads the Page posts (all pages) with their photos, newest first", async () => {
  const { db, store } = fakeDb();
  store.connection = {
    pageId: "123",
    pageName: "AKS",
    pagePicture: null,
    pageToken: "page-token",
    igUserId: null,
    igUsername: null,
    igPicture: null,
  };
  const calls: Record<string, unknown>[] = [];
  const graph: Graph = async (path, params) => {
    calls.push({ path, ...params });
    if (!params["after"])
      return {
        data: [
          {
            id: "123_2",
            message: "🚘PEUGEOT 3008🚘",
            created_time: "2026-10-19T10:00:00+0000",
            permalink_url: "https://www.facebook.com/123/posts/2",
            attachments: {
              data: [
                {
                  subattachments: {
                    data: [
                      { media: { image: { src: "https://scontent.xx.fbcdn.net/a.jpg" } } },
                      { media: { image: { src: "https://scontent.xx.fbcdn.net/b.jpg" } } },
                    ],
                  },
                },
              ],
            },
          },
        ],
        paging: { cursors: { after: "next-page" }, next: "https://graph.facebook.com/next" },
      };
    return {
      data: [{ id: "123_1", message: "Bonne fête", created_time: "2026-10-15T10:00:00+0000" }],
      paging: {},
    };
  };
  const deps = { db, graph, config: {}, app: {}, background: () => {} };
  const result = await handle("admin", { action: "sync" }, deps);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { read: 2, lastSyncedAt: "2026-10-19T12:00:00.000Z" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0]!["access_token"], "page-token");
  assert.deepEqual(
    store.inbox.map((p) => [p.postId, p.photos.length]),
    [
      ["123_2", 2],
      ["123_1", 0],
    ],
  );
});

test("sync: needs a connected Page and an admin", async () => {
  const { db } = fakeDb();
  const deps = { db, graph: fakeGraph().graph, config: {}, app: {}, background: () => {} };
  assert.equal((await handle("admin", { action: "sync" }, deps)).status, 409);
  assert.equal((await handle("visitor", { action: "sync" }, deps)).status, 403);
});

test("postPhotos: single photo, album and video cover, without duplicates", () => {
  const src = (n: string) => ({ media: { image: { src: `https://x.fbcdn.net/${n}.jpg` } } });
  assert.deepEqual(postPhotos({ attachments: { data: [src("one")] } }).length, 1);
  assert.deepEqual(
    postPhotos({
      attachments: { data: [{ subattachments: { data: [src("a"), src("b"), src("a")] } }] },
    }).map((u) => u.slice(-5)),
    ["a.jpg", "b.jpg"],
  );
  assert.deepEqual(postPhotos({}), []);
});

test("mark-sold: adds VENDU once to the vehicle's Facebook post", async () => {
  const { db, store } = fakeDb();
  store.posts.set(`${CAR}:facebook`, "123_9");
  let message = "BMW X5 2021";
  const graph: Graph = async (_path, params, method = "POST") => {
    if (method === "GET") return { message };
    message = String(params["message"]);
    return { success: true };
  };
  const deps = { db, graph, config, app: {}, background: () => {} };
  const first = await handle("admin", { action: "mark-sold", carId: CAR }, deps);
  assert.deepEqual(first.body, { updated: true });
  assert.equal(message, "✅ VENDU\n\nBMW X5 2021");
  const again = await handle("admin", { action: "mark-sold", carId: CAR }, deps);
  assert.deepEqual(again.body, { updated: false });
  store.posts.clear();
  const none = await handle("admin", { action: "mark-sold", carId: CAR }, deps);
  assert.deepEqual(none.body, { updated: false });
});
