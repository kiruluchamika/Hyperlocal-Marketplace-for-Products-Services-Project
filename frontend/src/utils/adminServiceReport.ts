import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';
import type { IServiceSelling } from '@/types';

export type ServiceReportCategory =
  | 'overall-summary'
  | 'time-period-trends'
  | 'user-interaction'
  | 'category-performance'
  | 'moderation-compliance'
  | 'location-insights'
  | 'service-catalog-snapshot';

export type ServiceReportDatePreset = '7d' | '30d' | '90d' | 'this-month' | 'custom';

export interface ServiceReportOptions {
  categories: ServiceReportCategory[];
  datePreset: ServiceReportDatePreset;
  customFrom?: string;
  customTo?: string;
}

type AdminServiceRow = Omit<IServiceSelling, 'sellerId' | 'categoryId'> & {
  sellerId:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
      };
  categoryId:
    | string
    | {
        _id?: string;
        name?: string;
        image?: string;
      };
};

interface BuildPdfInput {
  services: AdminServiceRow[];
  options: ServiceReportOptions;
}

const BAZZORO_PRIMARY: [number, number, number] = [37, 99, 235];
const BAZZORO_TEXT: [number, number, number] = [30, 41, 59];
const BAZZORO_MUTED: [number, number, number] = [100, 116, 139];

const toDataUrl = async (url: string) => {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const asLkr = (amount: number) => {
  const safeValue = Number.isFinite(amount) ? amount : 0;
  return `LKR ${safeValue.toLocaleString()}`;
};

const getSeller = (service: AdminServiceRow) =>
  typeof service.sellerId === 'object' ? service.sellerId : null;

const getSellerName = (service: AdminServiceRow) => getSeller(service)?.name || 'Unknown';

const getCategoryName = (service: AdminServiceRow) =>
  typeof service.categoryId === 'object' ? service.categoryId?.name || 'Service' : 'Service';

const getLocationLabel = (service: AdminServiceRow) =>
  service.location?.city || service.locationText || 'Unknown';

const normalizeDateRange = (preset: ServiceReportDatePreset, customFrom?: string, customTo?: string) => {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  if (preset === '7d') {
    from.setDate(from.getDate() - 6);
  } else if (preset === '30d') {
    from.setDate(from.getDate() - 29);
  } else if (preset === '90d') {
    from.setDate(from.getDate() - 89);
  } else if (preset === 'this-month') {
    from.setDate(1);
  } else if (preset === 'custom' && customFrom && customTo) {
    const fromDate = new Date(customFrom);
    const toDate = new Date(customTo);

    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      return { from: fromDate, to: toDate, label: `${format(fromDate, 'yyyy-MM-dd')} to ${format(toDate, 'yyyy-MM-dd')}` };
    }
  }

  return {
    from,
    to,
    label: `${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`,
  };
};

const inDateRange = (dateIso: string, from: Date, to: Date) => {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  return date >= from && date <= to;
};

const withHeader = (
  pdf: jsPDF,
  logoDataUrl: string,
  title: string,
  periodLabel: string,
  generatedAt: string,
  categoryNames: string[]
) => {
  const pageWidth = pdf.internal.pageSize.getWidth();

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', 14, 10, 14, 14);
  }

  pdf.setDrawColor(...BAZZORO_PRIMARY);
  pdf.setLineWidth(0.6);
  pdf.line(14, 27, pageWidth - 14, 27);

  pdf.setTextColor(...BAZZORO_TEXT);
  pdf.setFontSize(16);
  pdf.text('Bazzoro', 32, 15);

  pdf.setFontSize(11);
  pdf.setTextColor(...BAZZORO_MUTED);
  pdf.text('Admin Service Analytics Report', 32, 21);

  pdf.setTextColor(...BAZZORO_TEXT);
  pdf.setFontSize(14);
  pdf.text(title, pageWidth - 14, 15, { align: 'right' });

  pdf.setTextColor(...BAZZORO_MUTED);
  pdf.setFontSize(9);
  pdf.text(`Period: ${periodLabel}`, pageWidth - 14, 20, { align: 'right' });
  pdf.text(`Generated: ${generatedAt}`, pageWidth - 14, 24, { align: 'right' });

  if (categoryNames.length > 0) {
    pdf.setFontSize(8.5);
    pdf.text(`Sections: ${categoryNames.join(', ')}`, 14, 32);
  }
};

const addFooterToAllPages = (pdf: jsPDF) => {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

    pdf.setFontSize(8.5);
    pdf.setTextColor(...BAZZORO_MUTED);
    pdf.text('Bazzoro | Service Intelligence Suite', 14, pageHeight - 8.5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - 14, pageHeight - 8.5, { align: 'right' });
  }
};

const CATEGORY_LABELS: Record<ServiceReportCategory, string> = {
  'overall-summary': 'Overall Summary',
  'time-period-trends': 'Time Period Trends',
  'user-interaction': 'User Interaction',
  'category-performance': 'Category Performance',
  'moderation-compliance': 'Moderation & Compliance',
  'location-insights': 'Location Insights',
  'service-catalog-snapshot': 'Service Catalog Snapshot',
};

const tableHeadStyles = {
  fillColor: BAZZORO_PRIMARY,
  textColor: 255,
  fontStyle: 'bold' as const,
};

const renderOverallSummary = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  const totalViews = rows.reduce((sum, row) => sum + (row.viewsCount ?? 0), 0);
  const totalValue = rows.reduce((sum, row) => sum + (row.price ?? 0), 0);
  const avgPrice = rows.length ? Math.round(totalValue / rows.length) : 0;

  const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
    const status = row.status || 'UNKNOWN';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  autoTable(pdf, {
    startY,
    head: [['Metric', 'Value']],
    body: [
      ['Total Services', String(rows.length)],
      ['Active', String(byStatus.ACTIVE || 0)],
      ['Removed', String(byStatus.REMOVED || 0)],
      ['Deleted', String(byStatus.DELETED || 0)],
      ['Total Views', totalViews.toLocaleString()],
      ['Average Price', asLkr(avgPrice)],
    ],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9.5, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderTimePeriodTrends = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  const grouped = rows.reduce<Record<string, { total: number; active: number; removed: number; views: number }>>((acc, row) => {
    const key = format(new Date(row.createdAt), 'yyyy-MM-dd');
    if (!acc[key]) {
      acc[key] = { total: 0, active: 0, removed: 0, views: 0 };
    }
    acc[key].total += 1;
    if (row.status === 'ACTIVE') acc[key].active += 1;
    if (row.status === 'REMOVED') acc[key].removed += 1;
    acc[key].views += row.viewsCount ?? 0;
    return acc;
  }, {});

  const body = Object.entries(grouped)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, item]) => [date, String(item.total), String(item.active), String(item.removed), String(item.views)]);

  autoTable(pdf, {
    startY,
    head: [['Date', 'Listings', 'Active', 'Removed', 'Views']],
    body: body.length ? body : [['No data', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderUserInteraction = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  const topViewed = [...rows]
    .sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0))
    .slice(0, 12)
    .map((row) => [row.title, getSellerName(row), String(row.viewsCount ?? 0), row.status]);

  autoTable(pdf, {
    startY,
    head: [['Service', 'Owner', 'Views', 'Status']],
    body: topViewed.length ? topViewed : [['No data', '-', '-', '-']],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.7, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderCategoryPerformance = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  const byCategory = rows.reduce<Record<string, { count: number; totalPrice: number; totalViews: number }>>((acc, row) => {
    const key = getCategoryName(row);
    if (!acc[key]) acc[key] = { count: 0, totalPrice: 0, totalViews: 0 };
    acc[key].count += 1;
    acc[key].totalPrice += row.price ?? 0;
    acc[key].totalViews += row.viewsCount ?? 0;
    return acc;
  }, {});

  const body = Object.entries(byCategory)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([name, data]) => [
      name,
      String(data.count),
      asLkr(Math.round(data.totalPrice / Math.max(1, data.count))),
      String(data.totalViews),
    ]);

  autoTable(pdf, {
    startY,
    head: [['Category', 'Services', 'Avg Price', 'Total Views']],
    body: body.length ? body : [['No data', '-', '-', '-']],
    theme: 'striped',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderModeration = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  const moderated = rows.filter((row) => ['REMOVED', 'DELETED'].includes(row.status));
  const body = moderated.map((row) => [
    row.title,
    getSellerName(row),
    row.status,
    row.removedReason || '-',
    format(new Date(row.createdAt), 'yyyy-MM-dd'),
  ]);

  autoTable(pdf, {
    startY,
    head: [['Service', 'Owner', 'Status', 'Reason', 'Created']],
    body: body.length ? body : [['No moderation records in selected period', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.7, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 70 },
      4: { cellWidth: 22 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderLocationInsights = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  const byCity = rows.reduce<Record<string, { count: number; views: number }>>((acc, row) => {
    const city = getLocationLabel(row);
    if (!acc[city]) acc[city] = { count: 0, views: 0 };
    acc[city].count += 1;
    acc[city].views += row.viewsCount ?? 0;
    return acc;
  }, {});

  const body = Object.entries(byCity)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([city, item]) => [city, String(item.count), String(item.views)]);

  autoTable(pdf, {
    startY,
    head: [['City', 'Services', 'Views']],
    body: body.length ? body : [['No city data', '-', '-']],
    theme: 'striped',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderServiceCatalogSnapshot = (pdf: jsPDF, rows: AdminServiceRow[], startY: number) => {
  autoTable(pdf, {
    startY,
    head: [['Title', 'Owner', 'Category', 'Price', 'Pricing', 'Status', 'Views', 'Created']],
    body: rows.map((row) => [
      row.title,
      getSellerName(row),
      getCategoryName(row),
      asLkr(row.price ?? 0),
      row.pricingType,
      row.status,
      String(row.viewsCount ?? 0),
      format(new Date(row.createdAt), 'yyyy-MM-dd'),
    ]),
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.1, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: 12 },
      7: { cellWidth: 20 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

export const generateAdminServicesPdf = async ({ services, options }: BuildPdfInput) => {
  const logoDataUrl = await toDataUrl(logoUrl);
  const dateRange = normalizeDateRange(options.datePreset, options.customFrom, options.customTo);

  const filtered = services.filter((row) => inDateRange(row.createdAt, dateRange.from, dateRange.to));

  const pdf = new jsPDF('p', 'mm', 'a4');
  const generatedAt = new Date().toLocaleString();
  const selectedLabels = options.categories.map((category) => CATEGORY_LABELS[category]);

  withHeader(
    pdf,
    logoDataUrl,
    'Services Intelligence Report',
    dateRange.label,
    generatedAt,
    selectedLabels
  );

  let y = 39;

  const ensurePage = (neededHeight: number) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (y + neededHeight > pageHeight - 20) {
      pdf.addPage();
      withHeader(
        pdf,
        logoDataUrl,
        'Services Intelligence Report',
        dateRange.label,
        generatedAt,
        selectedLabels
      );
      y = 39;
    }
  };

  const renderSectionTitle = (name: string) => {
    ensurePage(16);
    pdf.setTextColor(...BAZZORO_PRIMARY);
    pdf.setFontSize(12.5);
    pdf.text(name, 14, y);
    y += 4.5;
  };

  for (const category of options.categories) {
    renderSectionTitle(CATEGORY_LABELS[category]);

    if (category === 'overall-summary') {
      y = renderOverallSummary(pdf, filtered, y + 2) + 8;
    } else if (category === 'time-period-trends') {
      y = renderTimePeriodTrends(pdf, filtered, y + 2) + 8;
    } else if (category === 'user-interaction') {
      y = renderUserInteraction(pdf, filtered, y + 2) + 8;
    } else if (category === 'category-performance') {
      y = renderCategoryPerformance(pdf, filtered, y + 2) + 8;
    } else if (category === 'moderation-compliance') {
      y = renderModeration(pdf, filtered, y + 2) + 8;
    } else if (category === 'location-insights') {
      y = renderLocationInsights(pdf, filtered, y + 2) + 8;
    } else if (category === 'service-catalog-snapshot') {
      y = renderServiceCatalogSnapshot(pdf, filtered, y + 2) + 8;
    }
  }

  if (filtered.length === 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(...BAZZORO_MUTED);
    pdf.text('No services found in the selected period.', 14, y + 10);
  }

  addFooterToAllPages(pdf);
  pdf.save(`bazzoro-services-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const SERVICE_REPORT_CATEGORIES: Array<{ value: ServiceReportCategory; label: string; description: string; primary: boolean }> = [
  {
    value: 'overall-summary',
    label: 'Overall Summary',
    description: 'Key totals and service ad health overview.',
    primary: true,
  },
  {
    value: 'time-period-trends',
    label: 'Time Period Trends',
    description: 'Daily service posting trends in selected date range.',
    primary: true,
  },
  {
    value: 'user-interaction',
    label: 'User Interaction',
    description: 'Top viewed services and engagement insights.',
    primary: true,
  },
  {
    value: 'category-performance',
    label: 'Category Performance',
    description: 'Performance split by service category.',
    primary: true,
  },
  {
    value: 'moderation-compliance',
    label: 'Moderation & Compliance',
    description: 'Removed and deleted service activity.',
    primary: true,
  },
  {
    value: 'location-insights',
    label: 'Location Insights',
    description: 'Service distribution by city or location text.',
    primary: false,
  },
  {
    value: 'service-catalog-snapshot',
    label: 'Service Catalog Snapshot',
    description: 'Full service-level tabular export.',
    primary: false,
  },
];
