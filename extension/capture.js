const API = "https://gamebooksecret.com";

const $ = (id) => document.getElementById(id);

function showResult(message, ok) {
  const el = $("result");
  el.textContent = message;
  el.className = ok ? "ok" : "err";
  el.style.display = "block";
}

async function apiFetch(path, options = {}) {
  const { apiToken } = await chrome.storage.local.get("apiToken");
  const headers = Object.assign({}, options.headers || {});
  if (apiToken) {
    headers.Authorization = "Bearer " + apiToken;
    return fetch(API + path, Object.assign({}, options, { headers }));
  }
  return fetch(API + path, Object.assign({}, options, { headers, credentials: "include" }));
}

async function loadProjects() {
  const sel = $("project");
  try {
    const res = await apiFetch("/api/ext/projects");
    if (res.status === 401) {
      $("tokenRow").style.display = "block";
      sel.innerHTML = '<option value="">Inicia sesión en la web o pega tu token</option>';
      return;
    }
    const data = await res.json().catch(() => ({}));
    const projects = Array.isArray(data.projects) ? data.projects : [];
    sel.innerHTML = "";
    if (projects.length === 0) {
      sel.innerHTML = '<option value="">No hay proyectos — crea uno en la web</option>';
      return;
    }
    for (const p of projects) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.title + " (" + p.passageCount + " pasajes)";
      sel.appendChild(opt);
    }
  } catch {
    sel.innerHTML = '<option value="">Error de red al cargar proyectos</option>';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await chrome.storage.local.get(["pending", "apiToken"]);
  if (stored.apiToken) $("token").value = stored.apiToken;
  if (stored.pending && stored.pending.text) {
    $("text").value = stored.pending.text;
    $("source").textContent = [stored.pending.title, stored.pending.url]
      .filter(Boolean)
      .join(" — ");
  }
  await loadProjects();
});

$("token").addEventListener("change", async (e) => {
  await chrome.storage.local.set({ apiToken: e.target.value.trim() });
  await loadProjects();
});

$("discard").addEventListener("click", async () => {
  await chrome.storage.local.remove("pending");
  $("text").value = "";
  $("source").textContent = "";
  showResult("Selección descartada.", true);
});

$("import").addEventListener("click", async () => {
  const text = $("text").value.trim();
  const projectId = $("project").value;
  if (!text) {
    showResult("No hay texto para importar.", false);
    return;
  }
  if (!projectId) {
    showResult("Selecciona un proyecto.", false);
    return;
  }

  const btn = $("import");
  btn.disabled = true;
  showResult("Importando...", true);

  try {
    const { pending } = await chrome.storage.local.get("pending");
    const title = (pending && pending.title) || "Captura";
    const filename =
      title.replace(/[\\/:*?"<>|]/g, "").slice(0, 80).trim() + ".txt";

    const res = await apiFetch("/api/ext/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, filename, rawContent: text }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      $("tokenRow").style.display = "block";
      showResult("No autorizado: genera un token en tu perfil y pégalo aquí.", false);
      return;
    }
    if (res.status === 402) {
      showResult(data.error || "Límite de tu plan alcanzado.", false);
      return;
    }
    if (!res.ok) {
      showResult(data.error || "Error al importar.", false);
      return;
    }

    const el = $("result");
    el.className = "ok";
    el.style.display = "block";
    el.textContent = "";
    el.appendChild(
      document.createTextNode(
        "Importados " + data.passagesCount + " pasajes · " + data.linksCreated + " enlaces. "
      )
    );
    const link = document.createElement("a");
    link.href = API + "/editor/" + projectId;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Abrir editor";
    el.appendChild(link);

    await chrome.storage.local.remove("pending");
  } catch (e) {
    showResult("Error de red: " + (e && e.message ? e.message : e), false);
  } finally {
    btn.disabled = false;
  }
});
