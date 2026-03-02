import { before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import bcrypt from "bcryptjs";
import request from "supertest";

import { app } from "../app.js";
import { prisma } from "../prisma.js";

const agent = request.agent(app);

let csrfToken = "";
let createdPostId = 0;
let createdPageId = 0;

before(async () => {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin12345";
  const adminName = process.env.ADMIN_NAME ?? "Administrator";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });
});

beforeEach(async () => {
  await prisma.post.deleteMany();
  await prisma.page.deleteMany();
  await prisma.media.deleteMany();
  await prisma.session.deleteMany();
  await prisma.setting.deleteMany();

  const loginResponse = await agent.post("/api/auth/login").send({
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.ADMIN_PASSWORD ?? "admin12345",
  });

  assert.equal(loginResponse.status, 200);

  const meResponse = await agent.get("/api/auth/me");
  assert.equal(meResponse.status, 200);
  csrfToken = meResponse.body.data.csrfToken;
});

describe("API smoke", () => {
  it("blocks protected route without auth", async () => {
    const res = await request(app).get("/api/posts");
    assert.equal(res.status, 401);
  });

  it("creates and fetches post", async () => {
    const create = await agent
      .post("/api/posts")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Post A", content: "Body", status: "draft" });

    assert.equal(create.status, 200);
    createdPostId = create.body.data.id;

    const getOne = await agent.get(`/api/posts/${createdPostId}`);
    assert.equal(getOne.status, 200);
    assert.equal(getOne.body.data.title, "Post A");
  });

  it("enforces slug uniqueness", async () => {
    const first = await agent
      .post("/api/posts")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Same Title", content: "A", status: "draft" });

    const second = await agent
      .post("/api/posts")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Same Title", content: "B", status: "draft" });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.notEqual(first.body.data.slug, second.body.data.slug);
  });

  it("creates and updates page", async () => {
    const create = await agent
      .post("/api/pages")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Page A", content: "Body", status: "draft" });

    assert.equal(create.status, 200);
    createdPageId = create.body.data.id;

    const update = await agent
      .put(`/api/pages/${createdPageId}`)
      .set("x-csrf-token", csrfToken)
      .send({ title: "Page Updated", content: "Body2", status: "published" });

    assert.equal(update.status, 200);
    assert.equal(update.body.data.title, "Page Updated");
  });

  it("validates settings update", async () => {
    const invalid = await agent.put("/api/settings").set("x-csrf-token", csrfToken).send({});
    assert.equal(invalid.status, 400);

    const valid = await agent.put("/api/settings").set("x-csrf-token", csrfToken).send({
      siteTitle: "CMS",
      tagline: "Tag",
      titleFormat: "%page% | %site%",
      metaDescription: "desc",
      siteIconUrl: "",
      sidebarLogoUrl: "",
      faviconUrl: "",
      language: "en",
      timezone: "UTC",
      footerText: "",
      frontPageId: null,
    });

    assert.equal(valid.status, 200);
    assert.equal(valid.body.data.siteTitle, "CMS");
    assert.equal(valid.body.data.frontPageId, null);
  });

  it("serves public frontpage with fallback order", async () => {
    const noPages = await request(app).get("/api/public/pages/frontpage");
    assert.equal(noPages.status, 404);

    const latest = await agent
      .post("/api/pages")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Latest Page", content: "Body", status: "published" });
    assert.equal(latest.status, 200);

    const byLatest = await request(app).get("/api/public/pages/frontpage");
    assert.equal(byLatest.status, 200);
    assert.equal(byLatest.body.meta.source, "latest");
    assert.equal(byLatest.body.data.title, "Latest Page");

    const home = await agent
      .post("/api/pages")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Home", slug: "home", content: "Home Body", status: "published" });
    assert.equal(home.status, 200);

    const byHome = await request(app).get("/api/public/pages/frontpage");
    assert.equal(byHome.status, 200);
    assert.equal(byHome.body.meta.source, "home-slug");
    assert.equal(byHome.body.data.slug, "home");

    const selected = await agent
      .post("/api/pages")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Selected Front", content: "Selected Body", status: "published" });
    assert.equal(selected.status, 200);

    const settingsUpdate = await agent.put("/api/settings").set("x-csrf-token", csrfToken).send({
      siteTitle: "CMS",
      tagline: "Tag",
      titleFormat: "%page% | %site%",
      metaDescription: "desc",
      siteIconUrl: "",
      sidebarLogoUrl: "",
      faviconUrl: "",
      language: "en",
      timezone: "UTC",
      footerText: "",
      frontPageId: selected.body.data.id,
    });
    assert.equal(settingsUpdate.status, 200);

    const bySetting = await request(app).get("/api/public/pages/frontpage");
    assert.equal(bySetting.status, 200);
    assert.equal(bySetting.body.meta.source, "frontPageId");
    assert.equal(bySetting.body.data.id, selected.body.data.id);
  });

  it("returns published public page by slug only", async () => {
    await agent
      .post("/api/pages")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Draft Public", slug: "draft-public", content: "Body", status: "draft" });

    const published = await agent
      .post("/api/pages")
      .set("x-csrf-token", csrfToken)
      .send({ title: "Public", slug: "public", content: "Body", status: "published" });
    assert.equal(published.status, 200);

    const ok = await request(app).get("/api/public/pages/public");
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.slug, "public");

    const hidden = await request(app).get("/api/public/pages/draft-public");
    assert.equal(hidden.status, 404);
  });

  it("rejects csrf mismatch", async () => {
    const response = await agent.post("/api/posts").set("x-csrf-token", "bad-token").send({
      title: "No CSRF",
      content: "Body",
      status: "draft",
    });

    assert.equal(response.status, 403);
  });

  it("supports logout and invalidates session", async () => {
    const logout = await agent.post("/api/auth/logout").set("x-csrf-token", csrfToken);
    assert.equal(logout.status, 200);

    const me = await agent.get("/api/auth/me");
    assert.equal(me.status, 401);
  });

  it("updates media metadata", async () => {
    const upload = await agent
      .post("/api/media/upload")
      .set("x-csrf-token", csrfToken)
      .attach("file", Buffer.from("fake-image-bytes"), { filename: "sample-image.png", contentType: "image/png" });

    assert.equal(upload.status, 200);
    const mediaId = upload.body.data.id as number;

    const update = await agent
      .put(`/api/media/${mediaId}`)
      .set("x-csrf-token", csrfToken)
      .send({
        title: "Homepage Banner",
        altText: "Banner image showing main announcement",
        caption: "Launch week visual",
        description: "Used on homepage hero section.",
      });

    assert.equal(update.status, 200);
    assert.equal(update.body.data.title, "Homepage Banner");
    assert.equal(update.body.data.altText, "Banner image showing main announcement");
    assert.equal(update.body.data.caption, "Launch week visual");
    assert.equal(update.body.data.description, "Used on homepage hero section.");
  });
});
