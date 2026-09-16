// Quick test of the parser with actual text
const fs = require('fs');

// Simulate the parser inline (since we can't import TS modules directly)
function extractPassagesFromText(text) {
  if (!text || text.trim().length === 0) return { passages: [], links: [], warnings: [] };

  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');

  const passageMap = new Map();
  const passageOrder = [];

  const passageStartRegex = /^\s*(\d+(?:[.,]\d+)?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(passageStartRegex);
    if (match) {
      const numStr = match[1].replace(',', '.');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        passageMap.set(num, { startLine: i + 1, lines: [] });
        passageOrder.push(num);
      }
    }
  }

  for (let idx = 0; idx < passageOrder.length; idx++) {
    const num = passageOrder[idx];
    const entry = passageMap.get(num);
    const nextNum = passageOrder[idx + 1];
    const nextEntry = nextNum !== undefined ? passageMap.get(nextNum) : undefined;
    const endLine = nextEntry ? nextEntry.startLine : lines.length;
    entry.lines = lines.slice(entry.startLine, endLine);
  }

  const passages = [];
  for (const num of passageOrder) {
    const entry = passageMap.get(num);
    const rawLines = entry.lines;
    let endIdx = rawLines.length;
    while (endIdx > 0 && rawLines[endIdx - 1].trim() === '') endIdx--;
    const trimmedLines = rawLines.slice(0, endIdx);
    if (trimmedLines.length === 0) continue;

    const content = trimmedLines.join('\n').trim();
    const isEndpoint = /\b[Ff][Ii][Nn]\b/.test(content);

    // Extract options
    const options = [];
    const contentLines = content.split('\n');
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      const trimmed = line.trim();
      const isTabOption = line.startsWith('\t') && trimmed.length > 0;
      const isArrowOption = /^[→\-*]>\s+/.test(trimmed);
      const isSiOption = /^Si\s+/i.test(trimmed);

      // Short verb option at end of passage
      const isVerbOption = i >= contentLines.length - 6 &&
        trimmed.length > 2 && trimmed.length < 80 &&
        !/^\d/.test(trimmed) &&
        !/^(FIN|Nota|Recuerda|Pierdes|Recupera|Has|Te|Los|Las|El|La|Lo|Un|Una)/i.test(trimmed) &&
        !/\./.test(trimmed) &&
        /^[A-ZÁÉÍÓÚÑ]/.test(trimmed);

      if (isTabOption || isArrowOption || isSiOption || isVerbOption) {
        let optionText = trimmed.replace(/^[→\-*]>\s+/, '').trim();
        if (optionText.length < 2 || /^Nota:/i.test(optionText)) continue;
        if (optionText.includes(',') && optionText.length > 60) continue;

        let targetNumber;
        const numRef = optionText.match(/(\d+(?:[.,]\d+)?)/);
        if (numRef) {
          targetNumber = parseFloat(numRef[1].replace(',', '.'));
        }

        options.push({ text: optionText.substring(0, 60), targetNumber, type: targetNumber ? 'link' : 'action' });
      }
    }

    passages.push({ number: num, content: content.substring(0, 100), isEndpoint, options });
  }

  return { passages, links: [], warnings: [] };
}

const text = fs.readFileSync('C:\\Users\\rolea\\Desktop\\Proyectos Verano\\Roleander Books\\Negra es la Noche\\BlackNight_Pdf.txt', 'utf-8');
const result = extractPassagesFromText(text);

console.log('=== PASSAGES FOUND:', result.passages.length, '===\n');

let totalOptions = 0;
let unnumberedOptions = 0;

for (const p of result.passages) {
  if (p.options.length > 0) {
    console.log('Passage', p.number, p.isEndpoint ? '(END)' : '', ':');
    for (const opt of p.options) {
      totalOptions++;
      const target = opt.targetNumber ? ' -> ' + opt.targetNumber : ' (UNNUMBERED)';
      console.log('  -', opt.text, target);
      if (!opt.targetNumber) unnumberedOptions++;
    }
    console.log('');
  }
}

console.log('=== SUMMARY ===');
console.log('Total passages:', result.passages.length);
console.log('Total options:', totalOptions);
console.log('Unnumbered options (need new passages):', unnumberedOptions);
