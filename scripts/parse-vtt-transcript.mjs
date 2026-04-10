import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const vttPath = join(projectRoot, 'docs/transcripts/3QTC00L1x1w.iw.vtt');
const outputPath = join(projectRoot, 'docs/transcripts/3QTC00L1x1w-transcript.txt');

const vttContent = readFileSync(vttPath, 'utf-8');
const lines = vttContent.split('\n');

/** Strip VTT inline timing tags and HTML entities */
function cleanCueText(text) {
  return text
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')   // <HH:MM:SS.mmm>
    .replace(/<\/?c>/g, '')                          // <c> </c>
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Parse all cue blocks
const cues = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i].trim();

  if (line.startsWith('WEBVTT') || line.startsWith('Kind:') || line.startsWith('Language:') || line === '') {
    i++;
    continue;
  }

  if (line.match(/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}/)) {
    const timeParts = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/);
    const startTime = timeParts[1];
    const endTime = timeParts[2];

    // Convert HH:MM:SS.mmm to seconds
    const toSec = (t) => {
      const [h, m, s] = t.split(':');
      return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    };

    i++;
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(cleanCueText(lines[i]));
      i++;
    }

    // The LAST non-empty line of a cue is the "complete" version (YouTube rolling captions)
    const validLines = textLines.filter(t => t.length > 0 && t.trim() !== '');
    if (validLines.length > 0) {
      // Take the last line — it's the most complete version of this cue
      const text = validLines[validLines.length - 1]
        .replace(/^>>\s*/g, '')   // remove >> speaker markers
        .trim();

      if (text.length > 1) {
        cues.push({
          startTime,
          endTime,
          startSec: toSec(startTime),
          endSec: toSec(endTime),
          text
        });
      }
    }
    continue;
  }

  i++;
}

console.log(`Total raw cues: ${cues.length}`);

/**
 * YouTube auto-captions use a "rolling" display: each cue adds one word to the previous.
 * The pattern looks like:
 *   Cue 1: "word1"
 *   Cue 2: "word1 word2"
 *   Cue 3: "word1 word2 word3"
 *   Cue 4: "word4"  <-- new sentence starts
 *
 * Strategy: group consecutive cues where each is a prefix of the next (or equal).
 * Only keep the LAST cue in each growing sequence.
 */
const segments = [];
let j = 0;

while (j < cues.length) {
  const current = cues[j];
  let longest = current;

  // Find how far this "rolling sequence" extends
  let k = j + 1;
  while (k < cues.length) {
    const next = cues[k];
    // If next text starts with current text (prefix growth), update longest
    if (next.text.startsWith(longest.text) || next.text === longest.text) {
      longest = next;
      k++;
    } else if (longest.text.startsWith(next.text) && next.text.length < longest.text.length) {
      // Partial rollback — new sentence is shorter, keep longest and advance
      break;
    } else {
      break;
    }
  }

  // Keep the longest (last) in this sequence
  segments.push(longest);
  j = k;
}

console.log(`After rolling-sequence dedup: ${segments.length}`);

// Final cleanup: remove any remaining duplicates
const finalSegments = [];
let lastSeen = '';
for (const seg of segments) {
  if (seg.text === lastSeen) continue;
  finalSegments.push(seg);
  lastSeen = seg.text;
}

console.log(`After exact-duplicate removal: ${finalSegments.length}`);

// Build output
const timedLines = finalSegments.map(s => `[${s.startTime}] ${s.text}`).join('\n');
const plainText = finalSegments.map(s => s.text).join(' ');

const output = `# YouTube Transcript: 3QTC00L1x1w
# URL: https://www.youtube.com/live/3QTC00L1x1w
# Method: yt-dlp (auto-generated captions)
# Language: Hebrew (iw) — auto-generated ASR
# Segment count: ${finalSegments.length}
# Plain text length: ${plainText.length} characters
# Extracted: ${new Date().toISOString()}
# ============================================

## Timed Segments

${timedLines}

## Plain Text (no timestamps)

${plainText}
`;

writeFileSync(outputPath, output, 'utf-8');
console.log(`\nSaved to: ${outputPath}`);
console.log(`\nFirst 500 chars of plain text:\n${plainText.substring(0, 500)}`);
console.log(`\nTotal plain text length: ${plainText.length} chars`);
console.log(`Total segments: ${finalSegments.length}`);
