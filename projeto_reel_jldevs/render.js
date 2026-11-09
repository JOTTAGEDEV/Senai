/*
  Renderiza o reel quadro a quadro e gera o MP4.
  Uso:  node render.js [--fps 30] [--workers 4] [--frames ./frames] [--audio audio.wav]
  Requer: Playwright (Chromium) e ffmpeg no PATH.
*/
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const FPS = +opt('fps', 30);
const WORKERS = +opt('workers', 4);
const DIR = __dirname;
const FRAMES = path.resolve(opt('frames', path.join(DIR, 'frames')));
const AUDIO = path.resolve(opt('audio', path.join(DIR, 'audio.wav')));
const OUT = path.join(DIR, 'jl-devs-reel.mp4');
const OUT_MUTE = path.join(DIR, 'jl-devs-reel-sem-audio.mp4');
const URL = 'file://' + path.join(DIR, 'index.html') + '?render';

async function openPage() {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(URL);
  await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);
  return { browser, page, cdp };
}

async function worker(frames, report) {
  const { browser, page, cdp } = await openPage();
  for (const i of frames) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    fs.writeFileSync(path.join(FRAMES, `f${String(i).padStart(5, '0')}.png`), Buffer.from(data, 'base64'));
    report();
  }
  await browser.close();
}

(async () => {
  fs.mkdirSync(FRAMES, { recursive: true });
  const probe = await openPage();
  const duration = await probe.page.evaluate(() => window.DURATION);
  await probe.browser.close();
  const total = Math.round(duration * FPS);
  const todo = [...Array(total).keys()].filter(i => !fs.existsSync(path.join(FRAMES, `f${String(i).padStart(5, '0')}.png`)));
  console.log(`${total} quadros (${duration}s @ ${FPS}fps) · faltando ${todo.length} · ${WORKERS} workers`);
  let done = 0; const t0 = Date.now();
  const report = () => { if (++done % 60 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} · ${((Date.now() - t0) / 1000).toFixed(0)}s`); };
  const chunks = [...Array(WORKERS)].map((_, w) => todo.filter((_, k) => k % WORKERS === w));
  await Promise.all(chunks.map(c => worker(c, report)));

  const vf = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p';
  const venc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level', '4.2', '-g', '60',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart'];
  const input = ['-framerate', String(FPS), '-i', path.join(FRAMES, 'f%05d.png')];
  console.log('codificando versão sem áudio…');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, '-vf', vf, ...venc, '-an', OUT_MUTE], { stdio: 'inherit' });
  if (fs.existsSync(AUDIO)) {
    console.log('juntando trilha sonora…');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', OUT_MUTE, '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  }
  console.log('pronto:', fs.existsSync(AUDIO) ? OUT : OUT_MUTE);
})();
