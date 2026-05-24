#!/usr/bin/env node
// seed-all.js  —  seed test submissions into the all-institutes score checker
// Usage: node seed-all.js <gs1|csat> <count>
// Example: node seed-all.js gs1 20

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

const paper = (process.argv[2] || '').toLowerCase();
const count = parseInt(process.argv[3] || '0', 10);

if (!['gs1','csat'].includes(paper) || !count || count < 1) {
  console.error('Usage: node seed-all.js <gs1|csat> <count>');
  console.error('  e.g. node seed-all.js gs1 20');
  process.exit(1);
}

const PC = {
  gs1:  { totalQ:100, perPage:10, totalPages:10, correctMark:2.00, wrongMark:2/3,  minAttempted:60 },
  csat: { totalQ:80,  perPage:10, totalPages:8,  correctMark:2.50, wrongMark:5/6,  minAttempted:30 },
};
const pc = PC[paper];

const keyFile = paper === 'gs1'
  ? 'institutes/IAS Baba/IASBaba_institute_key_GS.json'
  : 'institutes/IAS Baba/IASBaba_institute_key_CSAT.json';
const KEY = JSON.parse(fs.readFileSync(path.join(__dirname, keyFile), 'utf8')).answers;

const TARGET_URL = paper === 'gs1'
  ? 'https://prelims-cse-score-checker.vercel.app/gs1'
  : 'https://prelims-cse-score-checker.vercel.app/csat';

const BANDS = [
  { min:101, max:145, weight: 2 },
  { min: 95, max:100, weight: 5 },
  { min: 90, max: 95, weight:10 },
  { min: 85, max: 90, weight:30 },
  { min: 80, max: 85, weight:40 },
  { min: 40, max: 80, weight:13 },
];

function pickTargetScore() {
  const total = BANDS.reduce((s,b) => s + b.weight, 0);
  let r = Math.random() * total;
  for (const b of BANDS) {
    r -= b.weight;
    if (r <= 0) return b.min + Math.random() * (b.max - b.min);
  }
  return 75;
}

const OPTIONS = ['A','B','C','D'];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function wrongOption(correct) {
  const others = OPTIONS.filter(o => o !== correct);
  return others[Math.floor(Math.random() * others.length)];
}

function generateResponses(targetScore) {
  const attempted = pc.minAttempted + Math.floor(Math.random() * 16);
  let C = Math.round((targetScore + pc.wrongMark * attempted) / (pc.correctMark + pc.wrongMark));
  C = Math.max(0, Math.min(C, attempted, pc.totalQ));
  const W = Math.min(attempted - C, pc.totalQ - C);

  const qs = shuffle(Array.from({ length: pc.totalQ }, (_, i) => i + 1));
  const correctSet = new Set(qs.slice(0, C));
  const wrongSet   = new Set(qs.slice(C, C + W));

  const responses = {};
  for (let q = 1; q <= pc.totalQ; q++) {
    const keyAns = KEY[String(q)];
    if (!keyAns || !OPTIONS.includes(keyAns)) continue;
    if (correctSet.has(q))    responses[q] = keyAns;
    else if (wrongSet.has(q)) responses[q] = wrongOption(keyAns);
  }
  return responses;
}

function computeScore(responses) {
  let correct = 0, wrong = 0;
  for (let q = 1; q <= pc.totalQ; q++) {
    const r = responses[q], k = KEY[String(q)];
    if (!r || !k || !OPTIONS.includes(k)) continue;
    if (r === k) correct++; else wrong++;
  }
  const attempted = correct + wrong;
  return { correct, wrong, attempted, skip: pc.totalQ - attempted,
           score: pc.correctMark * correct - pc.wrongMark * wrong };
}

async function fillAnswers(page, responses) {
  for (let pageNum = 1; pageNum <= pc.totalPages; pageNum++) {
    const start = (pageNum - 1) * pc.perPage + 1;
    const end   = Math.min(pageNum * pc.perPage, pc.totalQ);
    process.stdout.write('    Page ' + pageNum + '/' + pc.totalPages + ' (Q' + start + '-Q' + end + ') ');

    for (let q = start; q <= end; q++) {
      const ans = responses[q];
      if (ans) {
        await page.click('button[data-q="' + q + '"][data-opt="' + ans + '"]');
        await page.waitForTimeout(55);
      }
    }

    if (pageNum < pc.totalPages) {
      await page.click('#next-btn');
      process.stdout.write('->\n');
      await page.waitForTimeout(200);
    } else {
      await page.click('#review-btn');
      process.stdout.write('-> Review\n');
      await page.waitForTimeout(350);
    }
  }
}

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 20 });

  console.log('\n=== Seeding ' + count + ' ' + paper.toUpperCase() + ' submissions ===');
  console.log('URL: ' + TARGET_URL);
  console.log('Attempted per run: ' + pc.minAttempted + '-' + (pc.minAttempted + 15) + ' questions\n');

  for (let i = 1; i <= count; i++) {
    const targetScore = pickTargetScore();
    const responses   = generateResponses(targetScore);
    const result      = computeScore(responses);

    console.log('\n[' + i + '/' + count + ']');
    console.log('  Target ~' + targetScore.toFixed(1) + ' | Score: ' + result.score.toFixed(2) + ' | C:' + result.correct + ' W:' + result.wrong + ' Att:' + result.attempted);

    const ctx  = await browser.newContext({ viewport: { width:480, height:900 } });
    const page = await ctx.newPage();

    await page.goto(TARGET_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);

    await page.waitForSelector('button[data-paper="A"]');
    await page.click('button[data-paper="A"]');
    await page.waitForTimeout(200);
    await page.click('#start-btn');
    await page.waitForTimeout(300);

    await fillAnswers(page, responses);

    console.log('  Submitting...');
    await page.waitForSelector('#submit-btn');
    await page.click('#submit-btn');

    await page.waitForSelector('.res-card', { timeout: 10000 });
    const cardCount = await page.evaluate(() => document.querySelectorAll('.res-card').length);
    console.log('  Result shown (' + cardCount + ' score card' + (cardCount !== 1 ? 's' : '') + ')');

    await page.waitForTimeout(2000);
    await ctx.close();

    if (i < count) {
      console.log('  -> Context closed. Starting fresh for next submission...');
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log('\n=== All done. ===');
  await browser.close();
}

run().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
