document.getElementById("openCapture").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("capture.html") });
});

chrome.storage.local.get("pending").then((stored) => {
  if (stored.pending && stored.pending.text) {
    const el = document.getElementById("pending");
    el.textContent = stored.pending.text.slice(0, 160);
    el.style.display = "block";
  }
});
