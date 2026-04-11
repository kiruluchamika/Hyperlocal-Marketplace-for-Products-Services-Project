import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';
import type { ICategory } from '@/types';

export interface CategoryReportProductSample {
  id: string;
  title: string;
  status: string;
  price: number;
  currency: string;
  viewsCount: number;
  createdAt: string;
}

export interface CategoryReportServiceSample {
  id: string;
  title: string;
  status: string;
  price: number;
  locationText: string;
  viewsCount: number;
  createdAt: string;
}

export interface CategoryReportCategory extends ICategory {
  productCount: number;
  serviceCount: number;
  productSamples: CategoryReportProductSample[];
  serviceSamples: CategoryReportServiceSample[];
}

export type CategoryReportSection =
  | 'snapshot'
  | 'utilization'
  | 'category-details'
  | 'product-details'
  | 'service-details'
  | 'attribute-insights'
  | 'attribute-details';
export type CategoryReportDatePreset = '7d' | '30d' | '90d' | 'this-month' | 'custom';

export interface CategoryReportOptions {
  sections: CategoryReportSection[];
  datePreset: CategoryReportDatePreset;
  customFrom?: string;
  customTo?: string;
}

interface BuildCategoryPdfInput {
  categories: CategoryReportCategory[];
  options: CategoryReportOptions;
  notes?: string[];
}

const BAZZORO_PRIMARY: [number, number, number] = [37, 99, 235];
const BAZZORO_TEXT: [number, number, number] = [30, 41, 59];
const BAZZORO_MUTED: [number, number, number] = [100, 116, 139];

const SECTION_LABELS: Record<CategoryReportSection, string> = {
  snapshot: 'Executive Snapshot',
  utilization: 'Category Utilization',
  'category-details': 'Category Details',
  'product-details': 'Product Details',
  'service-details': 'Service Details',
  'attribute-insights': 'Attribute Insights',
  'attribute-details': 'Attribute Details',
};

const REPORT_SECTIONS: Array<{ value: CategoryReportSection; label: string; description: string; primary: boolean }> = [
  {
    value: 'snapshot',
    label: 'Executive Snapshot',
    description: 'Overview of category, listing, and attribute totals.',
    primary: true,
  },
  {
    value: 'utilization',
    label: 'Category Utilization',
    description: 'Per-category usage with linked product and service volumes.',
    primary: true,
  },
  {
    value: 'category-details',
    label: 'Category Details',
    description: 'Detailed category table with linked usage and metadata.',
    primary: true,
  },
  {
    value: 'product-details',
    label: 'Product Details',
    description: 'Sample product records grouped by category.',
    primary: true,
  },
  {
    value: 'service-details',
    label: 'Service Details',
    description: 'Sample service records grouped by category.',
    primary: true,
  },
  {
    value: 'attribute-insights',
    label: 'Attribute Insights',
    description: 'Attribute coverage, required-field ratio, and option complexity.',
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

const isValidDate = (value: string) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
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

const renderSnapshot = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
  const total = categories.length;
  const productCategories = categories.filter((category) => category.type === 'PRODUCT').length;
  const serviceCategories = categories.filter((category) => category.type === 'SERVICE').length;
  const activeCount = categories.filter((category) => category.isActive).length;
  const inactiveCount = total - activeCount;
  const totalAttributes = categories.reduce((sum, category) => sum + (category.attributes?.length ?? 0), 0);
  const linkedProducts = categories.reduce((sum, category) => sum + category.productCount, 0);
  const linkedServices = categories.reduce((sum, category) => sum + category.serviceCount, 0);
  const linkedCombined = linkedProducts + linkedServices;
  const avgAttributesPerCategory = total > 0 ? (totalAttributes / total).toFixed(2) : '0.00';
  const avgListingsPerCategory = total > 0 ? (linkedCombined / total).toFixed(2) : '0.00';

  autoTable(pdf, {
    startY,
    head: [['Metric', 'Value']],
    body: [
      ['Total Categories', String(total)],
      ['Product Categories', String(productCategories)],
      ['Service Categories', String(serviceCategories)],
      ['Active Categories', String(activeCount)],
      ['Inactive Categories', String(inactiveCount)],
      ['Linked Products', String(linkedProducts)],
      ['Linked Services', String(linkedServices)],
      ['Total Linked Listings', String(linkedCombined)],
      ['Total Attributes', String(totalAttributes)],
      ['Avg Attributes / Category', avgAttributesPerCategory],
      ['Avg Linked Listings / Category', avgListingsPerCategory],
    ],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9.5, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderUtilization = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
  const sorted = [...categories].sort(
    (a, b) => b.productCount + b.serviceCount - (a.productCount + a.serviceCount)
  );

  autoTable(pdf, {
    startY,
    head: [['Category', 'Type', 'Status', 'Products', 'Services', 'Linked Total', 'Attributes', 'Created']],
    body: sorted.map((category) => [
      category.name,
      category.type,
      category.isActive ? 'Active' : 'Inactive',
      String(category.productCount),
      String(category.serviceCount),
      String(category.productCount + category.serviceCount),
      String(category.attributes?.length ?? 0),
      isValidDate(category.createdAt) ? format(new Date(category.createdAt), 'yyyy-MM-dd') : '-',
    ]),
    theme: 'striped',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.3, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 19 },
      6: { halign: 'right', cellWidth: 16 },
      7: { cellWidth: 24 },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body') {
        return;
      }

      if (hookData.column.index === 5) {
        const linkedValue = Number(hookData.cell.raw || 0);
        if (linkedValue >= 10) {
          hookData.cell.styles.fillColor = [220, 252, 231];
        } else if (linkedValue === 0) {
          hookData.cell.styles.fillColor = [254, 242, 242];
        }
      }
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderCategoryDetails = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
  autoTable(pdf, {
    startY,
    head: [['Category', 'Type', 'Status', 'Products', 'Services', 'Attributes', 'Created', 'Description']],
    body: categories.map((category) => [
      category.name,
      category.type,
      category.isActive ? 'Active' : 'Inactive',
      String(category.productCount),
      String(category.serviceCount),
      String(category.attributes?.length ?? 0),
      isValidDate(category.createdAt) ? format(new Date(category.createdAt), 'yyyy-MM-dd') : '-',
      category.description
        ? category.description.length > 34
          ? `${category.description.slice(0, 34)}...`
          : category.description
        : '-',
    ]),
    theme: 'striped',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.4, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { halign: 'right', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 14 },
      6: { cellWidth: 22 },
      7: { cellWidth: 63 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderProductDetails = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
  const rows = categories.flatMap((category) => {
    if (!category.productSamples || category.productSamples.length === 0) {
      return [[category.name, '-', '-', '-', '-', '-', '-']];
    }

    return category.productSamples.map((product) => [
      category.name,
      product.title,
      product.status,
      `${product.currency} ${product.price.toLocaleString()}`,
      String(product.viewsCount),
      isValidDate(product.createdAt) ? format(new Date(product.createdAt), 'yyyy-MM-dd') : '-',
      category.productCount > category.productSamples.length ? `+${category.productCount - category.productSamples.length} more` : '-',
    ]);
  });

  autoTable(pdf, {
    startY,
    head: [['Category', 'Product Title', 'Status', 'Price', 'Views', 'Listed', 'More in Category']],
    body: rows.length > 0 ? rows : [['No product details', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.2, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 48 },
      2: { cellWidth: 18 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 14 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderServiceDetails = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
  const rows = categories.flatMap((category) => {
    if (!category.serviceSamples || category.serviceSamples.length === 0) {
      return [[category.name, '-', '-', '-', '-', '-', '-']];
    }

    return category.serviceSamples.map((service) => [
      category.name,
      service.title,
      service.status,
      `${service.price.toLocaleString()}`,
      service.locationText || '-',
      String(service.viewsCount),
      category.serviceCount > category.serviceSamples.length ? `+${category.serviceCount - category.serviceSamples.length} more` : '-',
    ]);
  });

  autoTable(pdf, {
    startY,
    head: [['Category', 'Service Title', 'Status', 'Price', 'Location', 'Views', 'More in Category']],
    body: rows.length > 0 ? rows : [['No service details', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 8.2, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 44 },
      2: { cellWidth: 18 },
      3: { halign: 'right', cellWidth: 16 },
      4: { cellWidth: 34 },
      5: { halign: 'right', cellWidth: 12 },
      6: { cellWidth: 29 },
    },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderAttributeInsights = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
  const totalCategories = categories.length;
  const allAttributes = categories.flatMap((category) => category.attributes || []);
  const requiredCount = allAttributes.filter((attribute) => attribute.required).length;
  const selectAttributes = allAttributes.filter((attribute) => attribute.fieldType === 'select');
  const categoriesWithoutAttributes = categories.filter((category) => (category.attributes?.length ?? 0) === 0).length;
  const avgOptionsPerSelect =
    selectAttributes.length > 0
      ? (
        selectAttributes.reduce((sum, attribute) => sum + (attribute.options?.length ?? 0), 0) / selectAttributes.length
      ).toFixed(2)
      : '0.00';

  const fieldTypeCounts = allAttributes.reduce<Record<string, number>>((acc, attribute) => {
    acc[attribute.fieldType] = (acc[attribute.fieldType] || 0) + 1;
    return acc;
  }, {});

  autoTable(pdf, {
    startY,
    head: [['Insight', 'Value']],
    body: [
      ['Total Attributes Defined', String(allAttributes.length)],
      ['Required Attributes', String(requiredCount)],
      ['Required Attribute Ratio', allAttributes.length > 0 ? `${((requiredCount / allAttributes.length) * 100).toFixed(1)}%` : '0%'],
      ['Select Attributes', String(selectAttributes.length)],
      ['Avg Options / Select Field', avgOptionsPerSelect],
      ['Categories Without Attributes', String(categoriesWithoutAttributes)],
      ['Avg Attributes / Category', totalCategories > 0 ? (allAttributes.length / totalCategories).toFixed(2) : '0.00'],
      ['String Fields', String(fieldTypeCounts.string || 0)],
      ['Number Fields', String(fieldTypeCounts.number || 0)],
      ['Boolean Fields', String(fieldTypeCounts.boolean || 0)],
      ['Select Fields', String(fieldTypeCounts.select || 0)],
    ],
    theme: 'grid',
    headStyles: tableHeadStyles,
    styles: { fontSize: 9, textColor: BAZZORO_TEXT },
    margin: { left: 14, right: 14 },
  });

  return (pdf as any).lastAutoTable?.finalY ?? startY + 24;
};

const renderAttributeDetails = (pdf: jsPDF, categories: CategoryReportCategory[], startY: number) => {
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

export const generateAdminCategoriesPdf = async ({ categories, options, notes = [] }: BuildCategoryPdfInput) => {
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

  if (notes.length > 0) {
    ensurePage(28);
    autoTable(pdf, {
      startY: y,
      head: [['Report Notes']],
      body: notes.map((note) => [note]),
      theme: 'grid',
      headStyles: tableHeadStyles,
      styles: { fontSize: 8.6, textColor: BAZZORO_TEXT },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 182 },
      },
    });
    y = ((pdf as any).lastAutoTable?.finalY ?? y + 18) + 7;
  }

  for (const section of options.sections) {
    renderSectionTitle(SECTION_LABELS[section]);

    if (section === 'snapshot') {
      y = renderSnapshot(pdf, filtered, y + 2) + 8;
    } else if (section === 'utilization') {
      y = renderUtilization(pdf, filtered, y + 2) + 8;
    } else if (section === 'category-details') {
      y = renderCategoryDetails(pdf, filtered, y + 2) + 8;
    } else if (section === 'product-details') {
      y = renderProductDetails(pdf, filtered, y + 2) + 8;
    } else if (section === 'service-details') {
      y = renderServiceDetails(pdf, filtered, y + 2) + 8;
    } else if (section === 'attribute-insights') {
      y = renderAttributeInsights(pdf, filtered, y + 2) + 8;
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
