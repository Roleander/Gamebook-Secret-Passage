"use client";

import { useEffect } from "react";

const CACHE = "gbsp-v1";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const warmOfflineShell = async () => {
      try {
        const response = await fetch("/offline");
        if (!response.ok) return;
        const html = await response.text();
        const cache = await caches.open(CACHE);
        await cache.put(
          "/offline",
          new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
        const assets = [
          ...new Set(html.match(/\/_next\/static\/[^"'\\\s)]+/g) || []),
        ];
        await Promise.all(
          assets.map(async (asset) => {
            if (await cache.match(asset)) return;
            const res = await fetch(asset);
            if (res.ok) await cache.put(asset, res);
          })
        );
      } catch {
        // offline: cache already warm
      }
    };

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      void warmOfflineShell();
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
