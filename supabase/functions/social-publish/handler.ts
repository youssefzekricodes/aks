// Facebook Page / Instagram connector (Meta Graph API), run as the
// `social-publish` Edge Function:
//   - connect/select/disconnect: "Se connecter avec Facebook" from the admin;
//     tokens are stored in public.social_connection, never sent to the browser.
//   - publish: posts a published vehicle; posting continues in the background
//     after the response (Instagram needs a few seconds to process photos).
//   - sync: reads the Page's recent posts into public.facebook_inbox, where the
//     admin imports them as vehicles (Facebook → website).
// Pure logic with injected dependencies so it can be unit-tested in Node.

export type Platform = "facebook" | "instagram";
export const PLATFORMS: Platform[] = ["facebook", "instagram"];

export type SocialConfig = {
  pageId?: string | undefined;
  pageToken?: string | undefined;
  igUserId?: string | undefined;
};

/** Meta Graph API call (POST by default); throws with Meta's message on error.
 *  Pass `access_token` in `params`. */
export type Graph = (
  path: string,
  params: Record<string, unknown>,
  method?: "GET" | "POST",
) => Promise<Record<string, unknown>>;

/** The chosen Facebook Page and its linked Instagram professional account. */
export type Connection = {
  pageId: string;
  pageName: string;
  pagePicture: string | null;
  pageToken: string;
  igUserId: string | null;
  igUsername: string | null;
  igPicture: string | null;
  lastSyncedAt?: string | null;
};

/** A Page post as stored in the import inbox. */
export type InboxPost = {
  postId: string;
  postedAt: string;
  message: string;
  permalink: string | null;
  photos: string[];
};

export type SocialDb = {
  /** Validates the token with Supabase Auth and applies the admin rules (incl. 2FA);
   *  returns the user id, or null. */
  adminUser(token: string): Promise<string | null>;
  connection(): Promise<Connection | null>;
  saveConnection(connection: Connection, userId: string): Promise<void>;
  deleteConnection(): Promise<void>;
  /** Long-lived user token between login and the choice of the Page. */
  setPending(userId: string, userToken: string): Promise<void>;
  takePending(userId: string): Promise<string | null>;
  carState(carId: string): Promise<{ published: boolean; sold: boolean } | null>;
  /** Inserts a pending row; null when a pending or published post already exists. */
  claim(carId: string, platform: Platform): Promise<string | null>;
  /** Numeric post ids already known (inbox, or a Facebook post of a vehicle). */
  knownPosts(): Promise<Set<string>>;
  /** New posts are added; posts still waiting get fresh photo links. */
  saveInbox(posts: InboxPost[]): Promise<void>;
  markSynced(): Promise<string>;
  /** Id of the vehicle's published post on that network, if any. */
  publishedPost(carId: string, platform: Platform): Promise<string | null>;
  finish(
    rowId: string,
    result:
      | { status: "published"; externalId: string; permalink: string | null }
      | { status: "failed"; error: string },
  ): Promise<void>;
};

export type Result = { status: number; body: unknown };
const fail = (status: number, error: string): Result => ({ status, body: { error } });

/** Meta app credentials (Supabase secrets META_APP_ID / META_APP_SECRET). */
export type MetaApp = {
  appId?: string | undefined;
  appSecret?: string | undefined;
  /** "Facebook Login for Business" configuration (used instead of a list of permissions). */
  loginConfigId?: string | undefined;
};

export const configured = (config: SocialConfig) => ({
  facebook: Boolean(config.pageId && config.pageToken),
  instagram: Boolean(config.igUserId && config.pageToken),
});

const MAX_PHOTOS = 10; // Facebook multi-photo posts and Instagram carousels
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postToFacebook(
  graph: Graph,
  config: SocialConfig,
  post: { caption: string; url: string; images: string[] },
) {
  const pageId = config.pageId!;
  let id: string;
  if (post.images.length) {
    // Upload the photos unpublished, then one post with all of them.
    const media: { media_fbid: string }[] = [];
    for (const url of post.images.slice(0, MAX_PHOTOS)) {
      const photo = await graph(`${pageId}/photos`, { url, published: false });
      media.push({ media_fbid: String(photo["id"]) });
    }
    id = String(
      (await graph(`${pageId}/feed`, { message: post.caption, attached_media: media }))["id"],
    );
  } else {
    id = String((await graph(`${pageId}/feed`, { message: post.caption, link: post.url }))["id"]);
  }
  const details = await graph(id, { fields: "permalink_url" }, "GET").catch(() => ({}));
  return {
    externalId: id,
    permalink: (details as { permalink_url?: string }).permalink_url ?? null,
  };
}

export async function postToInstagram(
  graph: Graph,
  config: SocialConfig,
  post: { caption: string; images: string[] },
  { pollEvery = 2000, maxPolls = 30 } = {},
) {
  const user = config.igUserId!;
  const images = post.images.slice(0, MAX_PHOTOS);
  if (!images.length) throw new Error("Instagram exige au moins une photo.");
  let container: string;
  if (images.length === 1) {
    container = String(
      (await graph(`${user}/media`, { image_url: images[0], caption: post.caption }))["id"],
    );
  } else {
    const children: string[] = [];
    for (const image_url of images)
      children.push(
        String((await graph(`${user}/media`, { image_url, is_carousel_item: true }))["id"]),
      );
    container = String(
      (
        await graph(`${user}/media`, {
          media_type: "CAROUSEL",
          children: children.join(","),
          caption: post.caption,
        })
      )["id"],
    );
  }
  // Instagram downloads and processes the photos before the post can go live.
  for (let poll = 0; ; poll++) {
    const state = String((await graph(container, { fields: "status_code" }, "GET"))["status_code"]);
    if (state === "FINISHED") break;
    if (state === "ERROR" || state === "EXPIRED")
      throw new Error("Instagram n’a pas pu traiter les photos (format ou taille).");
    if (poll >= maxPolls) throw new Error("Instagram met trop de temps à traiter les photos.");
    await sleep(pollEvery);
  }
  const id = String((await graph(`${user}/media_publish`, { creation_id: container }))["id"]);
  const details = await graph(id, { fields: "permalink" }, "GET").catch(() => ({}));
  return { externalId: id, permalink: (details as { permalink?: string }).permalink ?? null };
}

/** Last part of a Graph post id ("<page>_<post>"), comparable across formats. */
export const postKey = (id: string) => id.split("_").at(-1) ?? id;

type GraphMedia = { image?: { src?: string } };
type GraphPost = {
  id?: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  attachments?: {
    data?: {
      media_type?: string;
      media?: GraphMedia;
      subattachments?: { data?: { media_type?: string; media?: GraphMedia }[] };
    }[];
  };
};

const POST_FIELDS =
  "id,message,created_time,permalink_url,attachments{media_type,media,subattachments.limit(100){media_type,media}}";

/** Photo URLs of a post, in its order (a video contributes its cover image). */
export function postPhotos(post: GraphPost) {
  const urls: string[] = [];
  for (const attachment of post.attachments?.data ?? []) {
    const children = attachment.subattachments?.data ?? [];
    for (const item of children.length ? children : [attachment]) {
      const src = item.media?.image?.src;
      if (src && /^https:\/\//.test(src) && !urls.includes(src)) urls.push(src);
    }
  }
  return urls;
}

/** Reads the Page's posts of the last `days` days and stores the unknown ones. */
export async function syncPage(
  graph: Graph,
  config: SocialConfig,
  db: SocialDb,
  { days = 60, maxPages = 6 } = {},
) {
  const known = await db.knownPosts();
  const since = Math.floor(Date.now() / 1000) - days * 86_400;
  const found: InboxPost[] = [];
  const path = `${config.pageId}/posts`;
  let params: Record<string, unknown> = {
    fields: POST_FIELDS,
    since,
    limit: 50,
    access_token: config.pageToken,
  };
  for (let page = 0; page < maxPages; page++) {
    const result = (await graph(path, params, "GET")) as {
      data?: GraphPost[];
      paging?: { cursors?: { after?: string }; next?: string };
    };
    for (const post of result.data ?? []) {
      if (!post.id) continue;
      const isNew = !known.has(postKey(post.id));
      found.push({
        postId: post.id,
        postedAt: post.created_time ?? new Date().toISOString(),
        message: (post.message ?? "").slice(0, 20000),
        permalink: post.permalink_url ?? null,
        photos: postPhotos(post),
      });
      if (isNew) known.add(postKey(post.id));
    }
    const after = result.paging?.cursors?.after;
    if (!result.paging?.next || !after) break;
    params = { ...params, after };
  }
  await db.saveInbox(found);
  const lastSyncedAt = await db.markSynced();
  return { read: found.length, lastSyncedAt };
}

const isUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/\S+$/.test(value) && value.length <= 1000;

const PAGE_FIELDS =
  "id,name,picture{url},instagram_business_account{id,username,profile_picture_url}";
type GraphPage = {
  id?: string;
  name?: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id?: string; username?: string; profile_picture_url?: string };
};
const pageSummary = (page: GraphPage) => ({
  id: String(page.id),
  name: String(page.name ?? ""),
  picture: page.picture?.data?.url ?? null,
  instagram: page.instagram_business_account?.id
    ? {
        id: String(page.instagram_business_account.id),
        username: page.instagram_business_account.username ?? null,
        picture: page.instagram_business_account.profile_picture_url ?? null,
      }
    : null,
});

/** Where Facebook sends the admin back after login (must be listed in the Meta app). */
const isRedirect = (value: unknown): value is string =>
  typeof value === "string" &&
  /^(https:\/\/[^/\s]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)\/meta-callback$/.test(value);

/**
 * Actions (admins only):
 *   status     → app configured?, connected Page and Instagram account
 *   connect    → { code, redirectUri }: finishes "Se connecter avec Facebook", lists the Pages
 *   select     → { pageId }: keeps that Page (and its Instagram account) for posting
 *   disconnect → forgets the Page
 *   publish    → { carId, caption, url, images, targets }: claims each network once
 *                and posts in the background (`background` keeps the work alive).
 */
export async function handle(
  token: string | null,
  body: unknown,
  deps: {
    db: SocialDb;
    graph: Graph;
    /** Fallback when nothing is connected from the admin (manual secrets). */
    config: SocialConfig;
    app: MetaApp;
    background: (work: Promise<unknown>) => void;
    pollEvery?: number;
  },
): Promise<Result> {
  if (!token) return fail(401, "Connexion requise.");
  const userId = await deps.db.adminUser(token);
  if (!userId) return fail(403, "Connexion administrateur requise.");
  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const { appId, appSecret } = deps.app;

  const connection = await deps.db.connection();
  const config: SocialConfig = connection
    ? {
        pageId: connection.pageId,
        pageToken: connection.pageToken,
        igUserId: connection.igUserId ?? undefined,
      }
    : deps.config;
  const status = () => ({
    app: Boolean(appId && appSecret),
    appId: appId ?? null,
    loginConfigId: deps.app.loginConfigId ?? null,
    facebook: connection
      ? { pageId: connection.pageId, name: connection.pageName, picture: connection.pagePicture }
      : config.pageId && config.pageToken
        ? { pageId: config.pageId, name: "Page configurée manuellement", picture: null }
        : null,
    lastSyncedAt: connection?.lastSyncedAt ?? null,
    instagram: connection?.igUserId
      ? { username: connection.igUsername, picture: connection.igPicture }
      : !connection && config.igUserId && config.pageToken
        ? { username: null, picture: null }
        : null,
  });

  switch (input["action"]) {
    case "status":
      return { status: 200, body: status() };

    case "connect": {
      if (!appId || !appSecret)
        return fail(
          409,
          "Application Meta non configurée (secrets META_APP_ID et META_APP_SECRET).",
        );
      const { code, redirectUri } = input;
      if (typeof code !== "string" || !code || code.length > 2000 || !isRedirect(redirectUri))
        return fail(400, "Requête non valide.");
      try {
        const short = await deps.graph(
          "oauth/access_token",
          { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
          "GET",
        );
        // Long-lived user token: the Page tokens derived from it do not expire.
        const long = await deps.graph(
          "oauth/access_token",
          {
            grant_type: "fb_exchange_token",
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: short["access_token"],
          },
          "GET",
        );
        const userToken = String(long["access_token"]);
        const pages = await deps.graph(
          "me/accounts",
          { fields: PAGE_FIELDS, limit: 100, access_token: userToken },
          "GET",
        );
        const list = ((pages["data"] as GraphPage[] | undefined) ?? []).map(pageSummary);
        if (!list.length)
          return fail(
            409,
            "Aucune Page Facebook trouvée : vérifiez que vous êtes administrateur de la Page et que vous l’avez cochée à la connexion.",
          );
        await deps.db.setPending(userId, userToken);
        return { status: 200, body: { pages: list } };
      } catch (error) {
        return fail(
          502,
          `Facebook : ${error instanceof Error ? error.message : "connexion impossible"}`,
        );
      }
    }

    case "select": {
      const pageId = input["pageId"];
      if (typeof pageId !== "string" || !/^[0-9]+$/.test(pageId))
        return fail(400, "Requête non valide.");
      const userToken = await deps.db.takePending(userId);
      if (!userToken)
        return fail(409, "Connexion expirée : recommencez « Se connecter avec Facebook ».");
      try {
        const page = (await deps.graph(
          pageId,
          { fields: `${PAGE_FIELDS},access_token`, access_token: userToken },
          "GET",
        )) as GraphPage;
        if (!page.access_token)
          return fail(403, "Cette Page ne peut pas être gérée avec ce compte.");
        const summary = pageSummary(page);
        await deps.db.saveConnection(
          {
            pageId: summary.id,
            pageName: summary.name,
            pagePicture: summary.picture,
            pageToken: page.access_token,
            igUserId: summary.instagram?.id ?? null,
            igUsername: summary.instagram?.username ?? null,
            igPicture: summary.instagram?.picture ?? null,
          },
          userId,
        );
        return {
          status: 200,
          body: { facebook: { name: summary.name }, instagram: summary.instagram },
        };
      } catch (error) {
        return fail(502, `Facebook : ${error instanceof Error ? error.message : "erreur"}`);
      }
    }

    case "disconnect":
      await deps.db.deleteConnection();
      return { status: 200, body: { ok: true } };

    case "sync": {
      if (!config.pageId || !config.pageToken)
        return fail(409, "Connectez d’abord la Page Facebook (Connecteurs).");
      try {
        return { status: 200, body: await syncPage(deps.graph, config, deps.db) };
      } catch (error) {
        return fail(
          502,
          `Facebook : ${error instanceof Error ? error.message : "lecture impossible"}`,
        );
      }
    }

    case "mark-sold": {
      // Adds "VENDU" to the vehicle's Facebook post (only posts made by the site can be
      // edited; Instagram captions can't be changed through the API).
      const carId = input["carId"];
      if (typeof carId !== "string" || !/^[0-9a-f-]{36}$/.test(carId))
        return fail(400, "Requête non valide.");
      if (!config.pageToken) return { status: 200, body: { updated: false } };
      const postId = await deps.db.publishedPost(carId, "facebook");
      if (!postId) return { status: 200, body: { updated: false } };
      try {
        const current = await deps.graph(
          postId,
          { fields: "message", access_token: config.pageToken },
          "GET",
        );
        const message = String(current["message"] ?? "");
        if (/^✅ VENDU/.test(message)) return { status: 200, body: { updated: false } };
        await deps.graph(postId, {
          message: `✅ VENDU\n\n${message}`.slice(0, 5000),
          access_token: config.pageToken,
        });
        return { status: 200, body: { updated: true } };
      } catch (error) {
        return {
          status: 200,
          body: { updated: false, error: error instanceof Error ? error.message : "erreur" },
        };
      }
    }

    case "publish":
      break;

    default:
      return fail(400, "Action inconnue.");
  }

  const available = configured(config);
  // Every Graph call for posting uses the Page token.
  const pageGraph: Graph = (path, params, method) =>
    deps.graph(path, { ...params, access_token: config.pageToken }, method);

  const carId = input["carId"];
  const caption = input["caption"];
  const url = input["url"];
  const images = input["images"];
  const targets = input["targets"];
  if (
    typeof carId !== "string" ||
    !/^[0-9a-f-]{36}$/.test(carId) ||
    typeof caption !== "string" ||
    caption.length > 2200 ||
    !isUrl(url) ||
    !Array.isArray(images) ||
    !images.every(isUrl) ||
    !Array.isArray(targets) ||
    !targets.every((t) => PLATFORMS.includes(t as Platform))
  )
    return fail(400, "Requête non valide.");

  const car = await deps.db.carState(carId);
  if (!car) return fail(404, "Véhicule introuvable.");
  if (!car.published || car.sold)
    return fail(409, "Seul un véhicule publié et non vendu peut être partagé.");

  const started: Platform[] = [];
  const skipped: { platform: Platform; reason: string }[] = [];
  for (const platform of targets as Platform[]) {
    if (!available[platform]) {
      skipped.push({ platform, reason: "non connecté" });
      continue;
    }
    const row = await deps.db.claim(carId, platform);
    if (!row) {
      skipped.push({ platform, reason: "déjà publié" });
      continue;
    }
    started.push(platform);
    const post = { caption: caption.trim(), url, images: images as string[] };
    deps.background(
      (platform === "facebook"
        ? postToFacebook(pageGraph, config, post)
        : postToInstagram(pageGraph, config, post, { pollEvery: deps.pollEvery ?? 2000 })
      ).then(
        (done) => deps.db.finish(row, { status: "published", ...done }),
        (error: unknown) =>
          deps.db.finish(row, {
            status: "failed",
            error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
          }),
      ),
    );
  }
  return { status: 202, body: { started, skipped } };
}
