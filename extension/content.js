(async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function scrollToBottom() {
    const max =
      Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement.scrollHeight
      ) - window.innerHeight;
    if (max <= 0) return;
    const step = Math.max(Math.floor(window.innerHeight * 0.8), 400);
    const total = Math.ceil(max / step);
    const steps = Math.min(total, 60);
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, Math.min(i * step, max));
      await sleep(120);
    }
    window.scrollTo(0, 0);
    await sleep(150);
  }

  function pickRoot() {
    const selectors = ["article", "main", "[role=main]"];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && (el.innerText || "").trim().length > 200) return el;
    }
    return document.body;
  }

  function extractText() {
    const root = pickRoot();
    const clone = root.cloneNode(true);
    const removable = [
      "script", "style", "noscript", "template", "iframe", "svg", "canvas",
      "video", "audio", "nav", "header", "footer", "aside", "form", "button",
      "input", "select", "textarea",
      "[role=navigation]", "[role=banner]", "[role=contentinfo]",
      "[role=search]", "[role=dialog]", "[aria-hidden=true]",
    ].join(",");
    clone.querySelectorAll(removable).forEach((n) => n.remove());

    const host = document.createElement("div");
    host.style.cssText =
      "position:absolute;left:-10000px;top:0;width:" +
      Math.max(root.clientWidth || 800, 600) +
      "px;";
    host.appendChild(clone);
    document.body.appendChild(host);

    let text = "";
    try {
      text = clone.innerText || clone.textContent || "";
    } finally {
      host.remove();
    }

    return text
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function capturePage() {
    await scrollToBottom();
    const text = extractText();
    return {
      text,
      title: document.title || "",
      url: location.href,
      capturedAt: Date.now(),
    };
  }

  window.__gbspCapturePage = capturePage;
})();
