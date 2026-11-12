import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--no-sandbox'] });
const p = await b.newPage();
await p.goto('http://localhost:8481/creatures.html').catch(e=>console.log(String(e)));
const r = await p.evaluate(async () => { if (!navigator.gpu) return 'no gpu'; const a = await navigator.gpu.requestAdapter(); if (!a) return 'no adapter'; const i = a.info || {}; return JSON.stringify({ v: i.vendor, a: i.architecture, d: i.description, fb: a.isFallbackAdapter }); });
console.log(r);
await b.close();
