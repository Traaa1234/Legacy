import { NextRequest, NextResponse } from 'next/server';
import { mintToken } from '@/lib/pdf/token';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function launchBrowser() {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_REGION;

  if (isServerless) {
    // Production: use puppeteer-core + @sparticuz/chromium (lightweight, serverless-friendly)
    const puppeteer = (await import('puppeteer-core')).default;
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev: use full puppeteer (bundled Chrome — works on Windows/macOS/Linux)
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({ headless: true });
}

export async function POST(req: NextRequest) {
  const token = mintToken();

  let browser;
  try {
    browser = await launchBrowser();

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
