import { missingReferenceTargets } from "./reference-mentions";

export interface PassageError {
  type: "orphan" | "no_exit" | "broken_link" | "cycle" | "ghost_ref";
  passageNumber: number;
  message: string;
  autoFixable: boolean;
}

interface ValidatablePassage {
  number: number;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  outgoingLinks: { target: { number: number } }[];
  incomingLinks: unknown[];
}

type Translate = (
  key: string,
  params?: Record<string, string | number>
) => string;

export function validatePassages(
  passages: ValidatablePassage[],
  t: Translate
): PassageError[] {
  const errors: PassageError[] = [];
  const numbers = passages.map((p) => p.number);
  const numberSet = new Set(numbers);

  passages.forEach((passage) => {
    // Check for broken links
    passage.outgoingLinks.forEach((link) => {
      if (!numbers.includes(link.target.number)) {
        errors.push({
          type: "broken_link",
          passageNumber: passage.number,
          message: t("Editor.brokenLink", { n: link.target.number }),
          autoFixable: false,
        });
      }
    });

    // Check for orphan passages (no incoming links, not start)
    if (passage.incomingLinks.length === 0 && !passage.isStart && passages.length > 1) {
      errors.push({
        type: "orphan",
        passageNumber: passage.number,
        message: t("Editor.orphan", { n: passage.number }),
        autoFixable: true,
      });
    }

    // Check for passages without outgoing links (endpoints)
    if (passage.outgoingLinks.length === 0 && !passage.isEndpoint) {
      errors.push({
        type: "no_exit",
        passageNumber: passage.number,
        message: t("Editor.noExit", { n: passage.number }),
        autoFixable: true,
      });
    }

    // Check for textual references to passages that do not exist
    for (const missing of missingReferenceTargets(passage.content, numberSet)) {
      errors.push({
        type: "ghost_ref",
        passageNumber: passage.number,
        message: t("Editor.ghostRef", { from: passage.number, to: missing }),
        autoFixable: false,
      });
    }
  });

  return errors;
}
