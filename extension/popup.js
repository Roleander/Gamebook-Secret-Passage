document.getElementById("openCapture").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("capture.html") });
});

document.getElementById("capturePage").addEventListener("click", async () => {
  const btn = document.getElementById("capturePage");
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = "Capturando...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) throw new Error("No hay pestaña activa");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (window.__gbspCapturePage ? window.__gbspCapturePage() : null),
    });

    if (!result || !result.text) {
      alert("No se pudo extraer texto de esta página.");
      return;
    }

    const pending = {
      text: result.text,
      url: result.url || tab.url || "",
      title: result.title || tab.title || "",
      savedAt: Date.now(),
    };
    await chrome.storage.local.set({ pending });
    chrome.tabs.create({ url: chrome.runtime.getURL("capture.html") });
  } catch (e) {
    alert(
      "No se pudo capturar la página: " + (e && e.message ? e.message : e)
    );
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

chrome.storage.local.get("pending").then((stored) => {
  if (stored.pending && stored.pending.text) {
    const el = document.getElementById("pending");
    el.textContent = stored.pending.text.slice(0, 160);
    el.style.display = "block";
  }
});
