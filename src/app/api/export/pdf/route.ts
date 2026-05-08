import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { mintToken } from '@/lib/pdf/token';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = mintToken();

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'x-pdf-generator-token': token });

    const baseUrl = req.nextUrl.origin;
    const target = `${baseUrl}/memoir/print`;

    await page.goto(target, { waitUntil: 'networkidle0', timeout: 30_000 });
    await page.waitForSelector('[data-memoir-loaded="true"]', { timeout: 30_000 });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
      preferCSSPageSize: true,
    });

    return new Response(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="memoir.pdf"',
      },
    });
  } catch (e) {
    console.error('pdf export failed', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'PDF generation failed' },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
