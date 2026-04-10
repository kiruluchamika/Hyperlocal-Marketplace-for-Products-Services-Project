import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';

export type PaymentReportRow = {
  _id: string;
  source: 'PRODUCT' | 'SERVICE';
  title: string;
  buyerName: string;
  sellerEmail: string;
  sellerName: string;
  amount: number;
  status: string;
  createdAt: string;
  payoutGrossAmount?: number;
  payoutFeePercent?: number;
  payoutFeeAmount?: number;
  payoutNetAmount?: number;
  payoutStatus?: string;
  payoutTransferId?: string;
  payoutError?: string;
};

interface PaymentReportFilters {
  fromDate?: string;
  toDate?: string;
  source?: string;
  status?: string;
}

const PRIMARY: [number, number, number] = [37, 99, 235];
const TEXT: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];

const RELEASED_STATUSES = new Set(['RELEASED', 'CONFIRMED']);
const PENDING_STATUSES = new Set(['HELD', 'PENDING', 'PROVIDER_ACCEPTED', 'ACCEPTED', 'IN_PROGRESS']);

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

const getFinancials = (row: PaymentReportRow) => {
  const gross = Number.isFinite(row.payoutGrossAmount) ? Number(row.payoutGrossAmount) : row.amount || 0;
  const feeAmount = Number.isFinite(row.payoutFeeAmount) ? Number(row.payoutFeeAmount) : 0;
  const net = Number.isFinite(row.payoutNetAmount) ? Number(row.payoutNetAmount) : gross - feeAmount;
  const feePercent = Number.isFinite(row.payoutFeePercent)
    ? Number(row.payoutFeePercent)
    : gross > 0
      ? Number(((feeAmount / gross) * 100).toFixed(2))
      : 0;

  return { gross, feeAmount, net, feePercent };
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
    pdf.text('Bazzoro | Admin Payment Settlement', 14, pageHeight - 8.5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - 14, pageHeight - 8.5, { align: 'right' });
  }
};

const getLastTableY = (pdf: jsPDF) => {
  const tableState = pdf as jsPDF & { lastAutoTable?: { finalY?: number } };
  return tableState.lastAutoTable?.finalY;
};

const renderSectionTable = (
  pdf: jsPDF,
  title: string,
  rows: PaymentReportRow[],
  startY: number,
  headColor: [number, number, number],
) => {
  pdf.setTextColor(...TEXT);
  pdf.setFontSize(11);
  pdf.text(title, 14, startY);

  const body = rows.map((row) => {
    const financials = getFinancials(row);
    return [
      row._id,
      row.source,
      row.buyerName || 'N/A',
      row.sellerName || 'N/A',
      asLkr(financials.gross),
      `${financials.feePercent}%`,
      asLkr(financials.net),
      row.status,
      format(new Date(row.createdAt), 'yyyy-MM-dd'),
    ];
  });

  autoTable(pdf, {
    startY: startY + 2,
    head: [['Payment ID', 'Source', 'Buyer', 'Seller', 'Gross', 'Fee %', 'Net', 'Status', 'Date']],
    body: body.length ? body : [['No data', '-', '-', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: headColor,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8.2, textColor: TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 32 },
      8: { cellWidth: 22 },
    },
  });

  return (getLastTableY(pdf) || startY + 32) + 6;
};

export const generatePaymentSettlementReportPdf = async (
  rows: PaymentReportRow[],
  filters: PaymentReportFilters = {},
) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoDataUrl = await toDataUrl(logoUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const periodLabel = safeDateLabel(filters.fromDate, filters.toDate);

  const totals = rows.reduce(
    (acc, row) => {
      const financials = getFinancials(row);
      acc.gross += financials.gross;
      acc.fees += financials.feeAmount;
      acc.net += financials.net;
      return acc;
    },
    { gross: 0, fees: 0, net: 0 },
  );

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
  pdf.text('Admin Finance Report', 32, 21);

  pdf.setTextColor(...TEXT);
  pdf.setFontSize(14);
  pdf.text('Payment Settlement Report', pageWidth - 14, 15, { align: 'right' });

  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`Period: ${periodLabel}`, pageWidth - 14, 20, { align: 'right' });
  pdf.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - 14, 24, { align: 'right' });

  autoTable(pdf, {
    startY: 34,
    head: [['Metric', 'Value']],
    body: [
      ['Transactions', String(rows.length)],
      ['Gross Amount', asLkr(totals.gross)],
      ['Platform Fees', asLkr(totals.fees)],
      ['Net Settlements', asLkr(totals.net)],
      ['Source Filter', filters.source || 'All'],
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

  const releasedRows = rows.filter((row) => RELEASED_STATUSES.has(row.status));
  const pendingRows = rows.filter((row) => PENDING_STATUSES.has(row.status));
  const issueRows = rows.filter((row) => !RELEASED_STATUSES.has(row.status) && !PENDING_STATUSES.has(row.status));

  let currentY = (getLastTableY(pdf) || 68) + 8;
  currentY = renderSectionTable(pdf, 'Released / Confirmed', releasedRows, currentY, [22, 163, 74]);

  if (currentY > 180) {
    pdf.addPage();
    currentY = 20;
  }

  currentY = renderSectionTable(pdf, 'Held / Pending', pendingRows, currentY, [217, 119, 6]);

  if (currentY > 180) {
    pdf.addPage();
    currentY = 20;
  }

  renderSectionTable(pdf, 'Failed / Refunded / Cancelled', issueRows, currentY, [225, 29, 72]);

  addFooterToAllPages(pdf);

  const dateTag = format(new Date(), 'yyyyMMdd-HHmm');
  pdf.save(`admin-payment-settlement-${dateTag}.pdf`);
};
