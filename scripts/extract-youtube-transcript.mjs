import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

(async () => {
  console.log('Starting YouTube transcript extraction...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'he-IL',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Intercept timedtext API calls
  const transcriptSegments = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('timedtext') || url.includes('api/timedtext')) {
      try {
        const body = await response.text();
        console.log('CAPTION RESPONSE intercepted, length:', body.length);
        console.log('First 500 chars:', body.substring(0, 500));
        transcriptSegments.push({ url, body });
      } catch (e) {
        console.log('Could not read response body:', e.message);
      }
    }
  });

  console.log('Navigating to YouTube...');
  await page.goto('https://www.youtube.com/watch?v=3QTC00L1x1w', {
    waitUntil: 'networkidle',
    timeout: 60000
  });

  // Accept cookies if prompted
  try {
    const acceptBtn = page.locator('button:has-text("Accept all"), button[aria-label*="Accept"], form button:first-of-type');
    await acceptBtn.first().click({ timeout: 5000 });
    console.log('Accepted cookies');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('No cookie dialog found');
  }

  // Wait for video player
  await page.waitForTimeout(5000);

  // Take initial screenshot
  await page.screenshot({ path: join(projectRoot, 'docs/screenshots/youtube-transcript-extraction.png'), fullPage: false });
  console.log('Screenshot taken');

  // --- Approach A: Extract captionTracks from page source ---
  console.log('\n=== Approach A: Extract captionTracks from page source ===');
  let captionContentA = null;
  try {
    const pageContent = await page.content();
    const captionMatch = pageContent.match(/"captionTracks":\[(.*?)\]/s);
    if (captionMatch) {
      console.log('Caption tracks found in page source!');
      const tracksJson = '[' + captionMatch[1] + ']';
      console.log('Raw tracks (first 800 chars):', tracksJson.substring(0, 800));

      // Try to parse track URLs
      const urlMatches = [...captionMatch[1].matchAll(/"baseUrl":"(.*?)"/g)];
      const langMatches = [...captionMatch[1].matchAll(/"languageCode":"(.*?)"/g)];

      const tracks = urlMatches.map((m, i) => ({
        url: m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'),
        lang: langMatches[i] ? langMatches[i][1] : 'unknown'
      }));

      console.log('Available tracks:', tracks.map(t => t.lang));

      // Prefer Hebrew, then English, then any
      const heTrack = tracks.find(t => t.lang === 'he' || t.lang === 'iw');
      const enTrack = tracks.find(t => t.lang === 'en');
      const chosenTrack = heTrack || enTrack || tracks[0];

      if (chosenTrack) {
        console.log(`Using track: ${chosenTrack.lang} — ${chosenTrack.url.substring(0, 100)}...`);

        // Fetch using page context (has auth cookies)
        captionContentA = await page.evaluate(async (url) => {
          const resp = await fetch(url + '&fmt=json3');
          return await resp.text();
        }, chosenTrack.url);

        console.log('Caption content fetched, length:', captionContentA.length);
        console.log('First 500 chars:', captionContentA.substring(0, 500));
      }
    } else {
      console.log('No captionTracks found in page source');
    }
  } catch (e) {
    console.log('Approach A failed:', e.message);
  }

  // --- Approach B: Open transcript panel ---
  console.log('\n=== Approach B: Open transcript panel via UI ===');
  let transcriptPanelText = null;
  try {
    // Scroll down to reveal description area
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Click the "more" / expand button under the video
    const moreSelectors = [
      'tp-yt-paper-button#expand',
      '#expand',
      'yt-button-shape button[aria-label*="more"]',
      '#description-inner tp-yt-paper-button'
    ];

    for (const sel of moreSelectors) {
      try {
        await page.click(sel, { timeout: 2000 });
        console.log(`Clicked expand with selector: ${sel}`);
        await page.waitForTimeout(1000);
        break;
      } catch (e) { /* try next */ }
    }

    // Find and click the transcript button
    const transcriptSelectors = [
      'button:has-text("Show transcript")',
      'button:has-text("transcript")',
      'yt-button-shape:has-text("transcript")',
      '[aria-label*="transcript"]'
    ];

    for (const sel of transcriptSelectors) {
      try {
        await page.click(sel, { timeout: 3000 });
        console.log(`Clicked transcript with selector: ${sel}`);
        await page.waitForTimeout(3000);
        break;
      } catch (e) { /* try next */ }
    }

    // Extract transcript text from panel
    const segments = await page.$$eval(
      'ytd-transcript-segment-renderer, [class*="transcript-segment"], ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
      (els) => els.map(el => {
        const timeEl = el.querySelector('.segment-timestamp, [class*="timestamp"]');
        const textEl = el.querySelector('.segment-text, [class*="segment-text"], yt-formatted-string');
        return {
          time: timeEl ? timeEl.textContent.trim() : '',
          text: textEl ? textEl.textContent.trim() : el.textContent.trim()
        };
      }).filter(s => s.text)
    );

    if (segments.length > 0) {
      console.log(`Panel: Found ${segments.length} transcript segments`);
      transcriptPanelText = segments.map(s => s.time ? `[${s.time}] ${s.text}` : s.text).join('\n');
      console.log('First 500 chars:', transcriptPanelText.substring(0, 500));
    } else {
      console.log('No segments found in transcript panel');
    }
  } catch (e) {
    console.log('Approach B failed:', e.message);
  }

  // --- Approach C: Check intercepted timedtext responses ---
  console.log('\n=== Approach C: Intercepted timedtext responses ===');
  if (transcriptSegments.length > 0) {
    console.log(`Intercepted ${transcriptSegments.length} timedtext responses`);
    for (const seg of transcriptSegments) {
      console.log('URL:', seg.url.substring(0, 100));
      console.log('Content (first 500):', seg.body.substring(0, 500));
    }
  } else {
    console.log('No timedtext responses were intercepted');
  }

  // --- Parse and save the best result ---
  let finalTranscript = null;
  let method = 'none';
  let language = 'unknown';

  if (captionContentA && captionContentA.length > 100) {
    // Try to parse JSON3 format
    try {
      const data = JSON.parse(captionContentA);
      if (data.events) {
        const textEvents = data.events
          .filter(e => e.segs)
          .map(e => ({
            start: (e.tStartMs / 1000).toFixed(2),
            text: e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim()
          }))
          .filter(e => e.text);

        if (textEvents.length > 0) {
          finalTranscript = textEvents.map(e => `[${e.start}s] ${e.text}`).join('\n');
          method = 'playwright-captionTracks-json3';
          language = 'auto-detected';
          console.log(`\nParsed ${textEvents.length} events from JSON3 format`);
        }
      }
    } catch (e) {
      // Try XML format
      const xmlTexts = [...captionContentA.matchAll(/<text[^>]*>(.*?)<\/text>/gs)].map(m => m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
      ).filter(Boolean);

      if (xmlTexts.length > 0) {
        finalTranscript = xmlTexts.join('\n');
        method = 'playwright-captionTracks-xml';
        language = 'auto-detected';
        console.log(`\nParsed ${xmlTexts.length} text elements from XML format`);
      } else {
        // Save raw
        finalTranscript = captionContentA;
        method = 'playwright-captionTracks-raw';
        language = 'auto-detected';
      }
    }
  }

  if (!finalTranscript && transcriptPanelText) {
    finalTranscript = transcriptPanelText;
    method = 'playwright-transcript-panel';
    language = 'panel';
  }

  if (!finalTranscript && transcriptSegments.length > 0) {
    finalTranscript = transcriptSegments.map(s => s.body).join('\n');
    method = 'playwright-intercepted-timedtext';
    language = 'intercepted';
  }

  // Save result
  mkdirSync(join(projectRoot, 'docs/transcripts'), { recursive: true });
  const outputPath = join(projectRoot, 'docs/transcripts/3QTC00L1x1w-transcript.txt');

  if (finalTranscript) {
    const lines = finalTranscript.split('\n').filter(Boolean);
    const header = `# YouTube Transcript: 3QTC00L1x1w
# URL: https://www.youtube.com/live/3QTC00L1x1w
# Method: ${method}
# Language: ${language}
# Segment count: ${lines.length}
# Extracted: ${new Date().toISOString()}
# ============================================

`;
    writeFileSync(outputPath, header + finalTranscript, 'utf-8');
    console.log(`\n=== SUCCESS ===`);
    console.log(`Method: ${method}`);
    console.log(`Language: ${language}`);
    console.log(`Segments: ${lines.length}`);
    console.log(`Saved to: ${outputPath}`);
    console.log(`\nFirst 500 chars of transcript:\n${finalTranscript.substring(0, 500)}`);
  } else {
    const errorContent = `# YouTube Transcript: 3QTC00L1x1w
# URL: https://www.youtube.com/live/3QTC00L1x1w
# Status: EXTRACTION FAILED
# Attempted: ${new Date().toISOString()}
# All approaches failed — video may not have captions, or access is blocked
`;
    writeFileSync(outputPath, errorContent, 'utf-8');
    console.log('\n=== FAILED — All approaches exhausted ===');
    console.log('Saved failure report to:', outputPath);
  }

  await browser.close();
})();
