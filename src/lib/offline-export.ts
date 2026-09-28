import type { OfflineProjectSnapshot } from "./offline-snapshot";

export function snapshotToJSON(snapshot: OfflineProjectSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function snapshotToMarkdown(snapshot: OfflineProjectSnapshot): string {
  const index = new Map(
    snapshot.passages.map((p, i) => [p.number, i + 1] as const)
  );

  return snapshot.passages
    .map((passage) => {
      const lines: string[] = [];
      if (passage.title) lines.push(`# ${passage.title}`);
      lines.push(passage.content);

      for (const link of passage.links) {
        const from = index.get(passage.number);
        const to = index.get(link.targetNumber);
        if (!from || !to || from === to) continue;
        const label = link.linkText || `Pasaje ${link.targetNumber}`;
        lines.push(`→ ${label} [[${from}-${to}]]`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function safeFilename(title: string): string {
  return (
    title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "").trim() || "gamebook"
  );
}
