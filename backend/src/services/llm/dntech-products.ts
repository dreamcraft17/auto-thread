export type DnTechProductKey =
  | 'dnpeople'
  | 'dncore'
  | 'dnshop'
  | 'nearwork'
  | 'duavulnscanner'
  | 'threads-automation'
  | 'trusted-jurist'
  | 'dntech';

export interface DnTechProductContext {
  key: DnTechProductKey;
  name: string;
  category: string;
  summary: string;
  facts: string[];
  audience: string;
}

/** Curated from the public DN Tech product catalog. Keep claims conservative. */
export const DNTECH_PRODUCTS: DnTechProductContext[] = [
  {
    key: 'dnpeople', name: 'dnPeople', category: 'HRIS',
    summary: 'HRIS untuk branch operations, payroll confidence, dan people evidence.',
    facts: ['database karyawan dan organisasi', 'attendance, leave, shift, dan approval', 'payroll dengan BPJS/PPh 21 dan preview sebelum finalize', 'multi-cabang, audit trail, dan evidence perubahan'],
    audience: 'HR, finance, dan bisnis retail/F&B multi-cabang',
  },
  {
    key: 'dncore', name: 'dnCore', category: 'ERP',
    summary: 'ERP untuk finance, supply chain, manufacturing, CRM, dan workflow bisnis.',
    facts: ['general ledger, AP/AR, dan bank reconciliation', 'inventory, purchase, sales, dan manufacturing/MRP', 'CRM pipeline, workflow approval, dan analytics', 'integrasi dengan dnPeople HRIS dan REST API'],
    audience: 'SME dan mid-market dengan operasi lintas fungsi',
  },
  {
    key: 'dnshop', name: 'dnShop', category: 'Commerce & Finance',
    summary: 'Tool untuk seller e-commerce dengan sinkronisasi toko dan pembukuan.',
    facts: ['dashboard penjualan dan sinkronisasi order/product', 'laporan seller dan pembukuan', 'jurnal, P&L, balance sheet, dan rekonsiliasi bank', 'dirancang untuk workflow seller Shopee'],
    audience: 'seller dan UMKM e-commerce',
  },
  {
    key: 'nearwork', name: 'Nearwork', category: 'Marketplace',
    summary: 'Marketplace freelance dengan alur job, proposal, dan kontrak yang terstruktur.',
    facts: ['job posting dan proposal/bidding', 'geo matching dan category filters', 'contract management', 'quota dan bilingual UI'],
    audience: 'klien bisnis dan freelancer',
  },
  {
    key: 'duavulnscanner', name: 'DuaVulnScanner', category: 'Security',
    summary: 'Platform passive web scanning, findings tracking, dan report export.',
    facts: ['passive scanner untuk headers, cookies, TLS, dan misconfiguration', 'findings workflow dan severity/CVSS tracking', 'HTML/PDF/Markdown report export', 'compliance tags dan REST API untuk DevSecOps'],
    audience: 'security tester, pentest firm, dan DevSecOps team',
  },
  {
    key: 'threads-automation', name: 'Threads Automation', category: 'Social Media',
    summary: 'Tool internal DN Tech untuk generate caption, scheduling, dan auto-publish Threads.',
    facts: ['AI caption dengan brand voice', 'schedule, bulk CSV, dan media attach', 'retry, publish history, dan dry-run safety', 'bukan official Meta Ads tool'],
    audience: 'content creator dan social media manager',
  },
  {
    key: 'trusted-jurist', name: 'Trusted Jurist', category: 'Client Project',
    summary: 'Contoh deliverable website company profile editorial untuk firma hukum.',
    facts: ['7 halaman publik dan design system editorial', 'contact form dan email delivery', 'SEO foundation dan mobile responsive', 'contoh project custom DN Tech, bukan SaaS DN Tech'],
    audience: 'professional services dan firma hukum',
  },
  {
    key: 'dntech', name: 'DN Tech', category: 'Software Development',
    summary: 'Product engineering studio Indonesia untuk workflow bisnis penting.',
    facts: ['website dan company profile', 'aplikasi custom dan integrasi sistem', 'scope, timeline, dan harga dibahas secara transparan', 'konsultasi awal 30 menit dan dukungan setelah launch'],
    audience: 'pemilik bisnis, founder, dan tim operasional Indonesia',
  },
];

export function getDnTechProduct(key?: string | null) {
  return DNTECH_PRODUCTS.find((product) => product.key === key) || null;
}

export function formatDnTechProductContext(product?: DnTechProductContext | null) {
  const selected = product ? [product] : DNTECH_PRODUCTS;
  return selected.map((item) => [
    `Produk: ${item.name} (${item.category})`,
    `Ringkasan: ${item.summary}`,
    `Fakta yang boleh disebut: ${item.facts.join('; ')}`,
    `Audiens: ${item.audience}`,
  ].join('\n')).join('\n\n');
}
