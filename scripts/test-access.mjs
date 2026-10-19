import test from "node:test";
import ts from "typescript";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { handleRequest } from "../worker/index.ts";
import { signAssertion } from "../titayla-access/protocol.ts";
const keys = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const privateKey = await crypto.subtle.exportKey("jwk", keys.privateKey),
  publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
const appId = "test-future-app",
  nonce = "a".repeat(64),
  origin = "https://app.example";
const token = await signAssertion("alice", appId, privateKey, nonce);
let served = 0;
const env = {
  APP_ID: appId,
  TITAYLA_URL: "https://titayla.com",
  TITAYLA_PUBLIC_KEY: JSON.stringify(publicKey),
  ASSETS: {
    async fetch() {
      served++;
      return new Response("TOOL", { headers: { "Cache-Control": "public" } });
    },
  },
};
const verify = async (url, options) => {
  assert.equal(String(url), "https://titayla.com/api/app-access/verify/");
  assert.equal(JSON.parse(options.body).appId, appId);
  assert.equal(options.cache, "no-store");
  return Response.json({ allowed: true, appId, userId: "alice" });
};
const request = (path = "/", t = token) =>
  new Request(origin + path, {
    headers: t ? { cookie: "__Host-titayla-access=" + t } : {},
  });
const callback = (t = token, n = nonce, extra = {}) =>
  new Request(origin + "/auth/titayla/", {
    method: "POST",
    headers: {
      origin,
      cookie: "__Host-titayla-state=" + n,
      "Content-Type": "application/json",
      ...extra,
    },
    body: JSON.stringify({ token: t }),
  });
test("direct document without session redirects to Titayla without assets", async () => {
  served = 0;
  const r = await handleRequest(request("/", null), env, verify);
  assert.equal(r.status, 303);
  assert.equal(
    r.headers.get("location"),
    "https://titayla.com/acces/" + appId + "/",
  );
  assert.equal(served, 0);
});
test("valid callback verifies assertion, nonce, online rights and creates secure session", async () => {
  const r = await handleRequest(callback(), env, verify);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /__Host-titayla-access=/);
  assert.match(r.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Lax/);
});
for (const [name, t] of [
  ["invalid", "invalid"],
  [
    "expired",
    await signAssertion("alice", appId, privateKey, nonce, Date.now() - 360000),
  ],
  ["wrong app", await signAssertion("alice", "other", privateKey, nonce)],
])
  test(name + " assertion rejected", async () => {
    assert.equal((await handleRequest(callback(t), env, verify)).status, 401);
    assert.equal(
      (await handleRequest(request("/api/x", t), env, verify)).status,
      401,
    );
  });
test("wrong or missing nonce rejected", async () => {
  for (const n of ["b".repeat(64), ""])
    assert.equal(
      (await handleRequest(callback(token, n), env, verify)).status,
      401,
    );
});
test("cross origin and incomplete callback rejected", async () => {
  assert.equal(
    (
      await handleRequest(
        callback(token, nonce, { origin: "https://evil.example" }),
        env,
        verify,
      )
    ).status,
    403,
  );
  const r = await handleRequest(
    new Request(origin + "/auth/titayla/", {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: "{}",
    }),
    env,
    verify,
  );
  assert.equal(r.status, 400);
});
test("valid session serves no-store tool", async () => {
  const r = await handleRequest(request(), env, verify);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "TOOL");
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.equal(r.headers.get("cloudflare-cdn-cache-control"), "no-store");
});
for (const reason of [
  "revoked",
  "expired rights",
  "unknown user",
  "Pass membership removed",
  "logout revoked",
])
  test(reason + " denies live access", async () => {
    served = 0;
    const r = await handleRequest(
      request("/api/titayla/session/"),
      env,
      async () => Response.json({ allowed: false }, { status: 403 }),
    );
    assert.equal(r.status, 403);
    assert.equal(served, 0);
  });
test("Titayla outage fails closed", async () => {
  served = 0;
  assert.equal(
    (
      await handleRequest(request(), env, async () => {
        throw Error("offline");
      })
    ).status,
    503,
  );
  assert.equal(served, 0);
});
test("internal, HTML alias, payload, executable bundles and API cannot bypass", async () => {
  for (const p of [
    "/internal/",
    "/index.html",
    "/index.txt",
    "/_next/static/tool.js",
    "/api/private/",
  ]) {
    served = 0;
    const r = await handleRequest(request(p, null), env, verify);
    assert.ok([303, 401].includes(r.status));
    assert.equal(served, 0);
  }
});
test("missing configuration and private key in configuration fail closed", async () => {
  for (const changes of [
    { APP_ID: "" },
    { TITAYLA_PUBLIC_KEY: "" },
    { TITAYLA_PUBLIC_KEY: JSON.stringify(privateKey) },
  ])
    assert.equal(
      (await handleRequest(request(), { ...env, ...changes }, verify)).status,
      503,
    );
});
test("logout requires same origin and clears app session", async () => {
  assert.equal(
    (
      await handleRequest(
        new Request(origin + "/auth/deconnexion/", { method: "POST" }),
        env,
      )
    ).status,
    403,
  );
  const r = await handleRequest(
    new Request(origin + "/auth/deconnexion/", {
      method: "POST",
      headers: { origin },
    }),
    env,
  );
  assert.match(r.headers.get("set-cookie"), /Max-Age=0/);
});
test("deploy always runs Worker first and reusable files match Titayla reference", () => {
  const parsed = ts.parseConfigFileTextToJson(
    "wrangler.staging.jsonc",
    readFileSync("wrangler.staging.jsonc", "utf8"),
  );
  assert.equal(parsed.error, undefined);
  const c = parsed.config;
  assert.equal(c.assets.run_worker_first, true);
  for (const f of ["protocol", "guard", "callback"])
    assert.equal(
      createHash("sha256")
        .update(readFileSync("titayla-access/" + f + ".ts", "utf8").replace(/\r\n/g,"\n"))
        .digest("hex"),
      {
        protocol:
          "558dc33cf8847f01e9107b27857009de342a06160a88add77785d07f3e1378f3",
        guard:
          "04e95034041912a3fe1c0611cdd2c61a6d1a10eab765994e385af30b5fa5abbb",
        callback:
          "dd832034a4e98a9fb1214db0149e3c6ca6009fa6913a2b43446855b905bb3950",
      }[f],
    );
});

for (const status of [301, 302, 303, 307, 308])
  test(
    "redirect " + status + " fails closed for same and external origins",
    async () => {
      for (const location of [
        "https://titayla.com/api/app-access/verify/",
        "https://external.example/collect",
      ]) {
        let calls = 0;
        const response = await handleRequest(
          request("/api/titayla/session/"),
          env,
          async (url, options) => {
            calls++;
            assert.equal(options.redirect, "manual");
            return Response.json(
              { allowed: true, appId, userId: "alice" },
              { status, headers: { Location: location } },
            );
          },
        );
        assert.equal(response.status, 503);
        assert.equal(calls, 1);
      }
    },
  );
test("a followed response cannot authorize the app", async () => {
  const response = Response.json({ allowed: true, appId, userId: "alice" });
  Object.defineProperty(response, "redirected", { value: true });
  assert.equal(
    (
      await handleRequest(
        request("/api/titayla/session/"),
        env,
        async () => response,
      )
    ).status,
    503,
  );
});
