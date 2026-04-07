import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';
import type { ICategory } from '@/types';

export type CategoryReportSection = 'snapshot' | 'category-details' | 'attribute-details';
export type CategoryReportDatePreset = '7d' | '30d' | '90d' | 'this-month' | 'custom';

export interface CategoryReportOptions {
  sections: CategoryReportSection[];
  datePreset: CategoryReportDatePreset;
  customFrom?: string;
  customTo?: string;
}

interface BuildCategoryPdfInput {
  categories: ICategory[];
  options: CategoryReportOptions;
}

const BAZZORO_PRIMARY: [number, number, number] = [37, 99, 235];
const BAZZORO_TEXT: [number, number, number] = [30, 41, 59];
const BAZZORO_MUTED: [number, number, number] = [100, 116, 139];

const SECTION_LABELS: Record<CategoryReportSection, string> = {
  snapshot: 'Snapshot',
  'category-details': 'Category Details',
  'attribute-details': 'Attribute Details',
};

const REPORT_SECTIONS: Array<{ value: CategoryReportSection; label: string; description: string; primary: boolean }> = [
  {
    value: 'snapshot',
    label: 'Snapshot',
    description: 'Overview of category counts and status split.',
    primary: true,
  },
  {
    value: 'category-details',
    label: 'Category Details',
    description: 'Detailed category table with type and description.',
    primary: true,
  },
  {
    value: 'attribute-details',
    label: 'Attribute Details',
    description: 'Field-level details for every category attribute.',
    primary: true,
  },
];

const tableHeadStyles = {
  fillColor: BAZZORO_PRIMARY,
  textColor: 255,
  fontStyle: 'bold' as const,
};

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

const normalizeDateRange = (preset: CategoryReportDatePreset, customFrom?: string, customTo?: string) => {
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
  sectionNames: string[]
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
  pdf.text('Admin Category Report', 32, 21);

  pdf.setTextColor(...BAZZORO_TEXT);
  pdf.setFontSize(14);
  pdf.text(title, pageWidth - 14, 15, { align: 'right' });

  pdf.setTextColor(...BAZZORO_MUTED);
  pdf.setFontSize(9);
  pdf.text(`Period: ${periodLabel}`, pageWidth - 14, 20, { align: 'right' });
  pdf.text(`Generated: ${generatedAt}`, pageWidth - 14, 24, { align: 'right' });

  if (sectionNames.length > 0) {
    pdf.setFontSize(8.5);
    pdf.text(`Sections: ${sectionNames.join(', ')}`, 14, 32);
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
    pdf.text('Bazzoro • Product Intelligence Suite', 14, pageHeight - 8.5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - 14, pageHeight - 8.5, { align: 'right' });
  }
};

const renderSnapshot = (pdf: jsPDF, categories: ICategory[], startY: number) => {
  const total = categories.length;
  const productCount = categories.filter((category) => category.type === 'PRODUCT').length;
  const serviceCount = categories.filter((category) => category.type === 'SERVICE').length;
  const activeCount = categories.filter((category) => category.isActive).length;

  autoTable(pdf, {
    startY,
    head: [['Metric', 'Value']],
    body: [
      ['Total Categories', String(total)],
      ['Product Categories', String(productCount)],
      ['Service Categories', String(serviceCount)],
      ['Active Categories', String(activeCount)],
      ['Inactive Categories', String(total - activeCount)],
      [
        'Total Attributes',
        String(categories.reduce((sum, category) => sum + (category.attributes?.length ?? 0), 0)),
      ],
    ],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9.5, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderCategoryDetails = (pdf: jsPDF, categories: ICategory[], startY: number) => {
  autoTable(pdf, {
    startY,
    head: [['Category', 'Type', 'Status', 'Attributes', 'Created', 'Description']],
    body: categories.map((category) => [
      category.name,
      category.type,
      category.isActive ? 'Active' : 'Inactive',
      String(category.attributes?.length ?? 0),
      format(new Date(category.createdAt), 'yyyy-MM-dd'),
      category.description
        ? category.description.length > 42
          ? `${category.description.slice(0, 42)}...`
          : category.description
        : '-',
    ]),
    theme: 'striped',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.4, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 17 },
      4: { cellWidth: 22 },
      5: { cellWidth: 76 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderAttributeDetails = (pdf: jsPDF, categories: ICategory[], startY: number) => {
  const body = categories.flatMap((category) => {
    if (!category.attributes || category.attributes.length === 0) {
      return [[category.name, '-', '-', '-', '-']];
    }

    return category.attributes.map((attribute) => [
      category.name,
      attribute.fieldName,
      attribute.fieldType,
      attribute.required ? 'Yes' : 'No',
      attribute.fieldType === 'select' ? (attribute.options || []).join(', ') || '-' : '-',
    ]);
  });

  autoTable(pdf, {
    startY,
    head: [['Category', 'Field Name', 'Field Type', 'Required', 'Options']],
    body: body.length ? body : [['No categories', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.2, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 35 },
      2: { cellWidth: 24 },
      3: { cellWidth: 18 },
      4: { cellWidth: 67 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

export const generateAdminCategoriesPdf = async ({ categories, options }: BuildCategoryPdfInput) => {
  const logoDataUrl = await toDataUrl(logoUrl);
  const dateRange = normalizeDateRange(options.datePreset, options.customFrom, options.customTo);
  const filtered = categories.filter((category) => inDateRange(category.createdAt, dateRange.from, dateRange.to));

  const pdf = new jsPDF('p', 'mm', 'a4');
  const generatedAt = new Date().toLocaleString();
  const sectionNames = options.sections.map((section) => SECTION_LABELS[section]);

  withHeader(
    pdf,
    logoDataUrl,
    'Categories Details Report',
    dateRange.label,
    generatedAt,
    sectionNames
  );

  let y = 39;

  const ensurePage = (neededHeight: number) => {
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (y + neededHeight > pageHeight - 20) {
      pdf.addPage();
      withHeader(
        pdf,
        logoDataUrl,
        'Categories Details Report',
        dateRange.label,
        generatedAt,
        sectionNames
      );
      y = 39;
    }
  };

  const renderSectionTitle = (title: string) => {
    ensurePage(16);
    pdf.setTextColor(...BAZZORO_PRIMARY);
    pdf.setFontSize(12.5);
    pdf.text(title, 14, y);
    y += 4.5;
  };

  for (const section of options.sections) {
    renderSectionTitle(SECTION_LABELS[section]);

    if (section === 'snapshot') {
      y = renderSnapshot(pdf, filtered, y + 2) + 8;
    } else if (section === 'category-details') {
      y = renderCategoryDetails(pdf, filtered, y + 2) + 8;
    } else if (section === 'attribute-details') {
      y = renderAttributeDetails(pdf, filtered, y + 2) + 8;
    }
  }

  if (filtered.length === 0) {
    pdf.setFontSize(11);
    pdf.setTextColor(...BAZZORO_MUTED);
    pdf.text('No categories found in the selected period.', 14, y + 10);
  }

  addFooterToAllPages(pdf);
  pdf.save(`bazzoro-categories-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const CATEGORY_REPORT_SECTIONS = REPORT_SECTIONS;
