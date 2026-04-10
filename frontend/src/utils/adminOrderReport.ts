import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';
import type { AdminOrder } from '@/types/admin';

interface OrderReportFilters {
  fromDate?: string;
  toDate?: string;
  status?: string;
}

const PRIMARY: [number, number, number] = [37, 99, 235];
const TEXT: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

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

const asLkr = (amount: number) => `LKR ${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;

const safeDateLabel = (fromDate?: string, toDate?: string) => {
  if (fromDate && toDate) return `${fromDate} to ${toDate}`;
  if (fromDate) return `${fromDate} onwards`;
  if (toDate) return `Until ${toDate}`;
  return 'All dates';
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
    pdf.setTextColor(...MUTED);
    pdf.text('Bazzoro | Admin Order Summary', 14, pageHeight - 8.5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - 14, pageHeight - 8.5, { align: 'right' });
  }
};

const getLastTableY = (pdf: jsPDF) => {
  const tableState = pdf as jsPDF & { lastAutoTable?: { finalY?: number } };
  return tableState.lastAutoTable?.finalY;
};

export const generateOrderReportPdf = async (orders: AdminOrder[], filters: OrderReportFilters = {}) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoDataUrl = await toDataUrl(logoUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();

  const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const periodLabel = safeDateLabel(filters.fromDate, filters.toDate);

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', 14, 10, 14, 14);
  }

  pdf.setDrawColor(...PRIMARY);
  pdf.setLineWidth(0.6);
  pdf.line(14, 27, pageWidth - 14, 27);

  pdf.setTextColor(...TEXT);
  pdf.setFontSize(16);
  pdf.text('Bazzoro', 32, 15);

  pdf.setFontSize(11);
  pdf.setTextColor(...MUTED);
  pdf.text('Admin Order Operations Report', 32, 21);

  pdf.setTextColor(...TEXT);
  pdf.setFontSize(14);
  pdf.text('Order Summary Report', pageWidth - 14, 15, { align: 'right' });

  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`Period: ${periodLabel}`, pageWidth - 14, 20, { align: 'right' });
  pdf.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - 14, 24, { align: 'right' });

  autoTable(pdf, {
    startY: 34,
    head: [['Metric', 'Value']],
    body: [
      ['Total Orders', String(orders.length)],
      ['Total Order Value', asLkr(totalAmount)],
      ['Status Filter', filters.status || 'All'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 9.5, textColor: TEXT },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  });

  const tableBody = orders.map((order) => [
    order._id,
    order.titleSnapshot || 'N/A',
    String(order.quantity || 0),
    asLkr(order.totalAmount || 0),
    order.buyerId?.name || 'N/A',
    order.sellerId?.name || 'N/A',
    order.status || 'N/A',
    format(new Date(order.createdAt), 'yyyy-MM-dd'),
  ]);

  autoTable(pdf, {
    startY: (getLastTableY(pdf) ?? 62) + 8,
    head: [['Order ID', 'Product/Service', 'Qty', 'Amount', 'Buyer', 'Seller', 'Status', 'Date']],
    body: tableBody.length ? tableBody : [['No data', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8.5, textColor: TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 60 },
      7: { cellWidth: 26 },
    },
  });

  addFooterToAllPages(pdf);

  const dateTag = format(new Date(), 'yyyyMMdd-HHmm');
  pdf.save(`admin-order-summary-${dateTag}.pdf`);
};
