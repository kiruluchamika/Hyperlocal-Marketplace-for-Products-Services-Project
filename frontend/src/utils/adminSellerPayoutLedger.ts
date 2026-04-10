import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.png';
import type { PaymentReportRow } from '@/utils/adminPaymentReport';

interface SellerLedgerFilters {
  fromDate?: string;
  toDate?: string;
  source?: string;
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
  return { gross, feeAmount, net };
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
    pdf.text('Bazzoro | Seller Payout Ledger', 14, pageHeight - 8.5);
    pdf.text(`Page ${page} of ${totalPages}`, pageWidth - 14, pageHeight - 8.5, { align: 'right' });
  }
};

const getLastTableY = (pdf: jsPDF) => {
  const tableState = pdf as jsPDF & { lastAutoTable?: { finalY?: number } };
  return tableState.lastAutoTable?.finalY;
};

export const generateSellerPayoutLedgerPdf = async (
  rows: PaymentReportRow[],
  filters: SellerLedgerFilters = {},
) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoDataUrl = await toDataUrl(logoUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const periodLabel = safeDateLabel(filters.fromDate, filters.toDate);

  const ledgerMap = rows.reduce<
    Record<
      string,
      {
        sellerName: string;
        sellerEmail: string;
        ordersCount: number;
        heldAmount: number;
        releasedAmount: number;
        totalFees: number;
        netReceivable: number;
      }
    >
  >((acc, row) => {
    const key = row.sellerEmail || row.sellerName || 'unknown-seller';
    if (!acc[key]) {
      acc[key] = {
        sellerName: row.sellerName || 'N/A',
        sellerEmail: row.sellerEmail || 'N/A',
        ordersCount: 0,
        heldAmount: 0,
        releasedAmount: 0,
        totalFees: 0,
        netReceivable: 0,
      };
    }

    const item = acc[key];
    const { gross, feeAmount, net } = getFinancials(row);
    item.ordersCount += 1;
    item.totalFees += feeAmount;
    item.netReceivable += net;

    if (RELEASED_STATUSES.has(row.status)) {
      item.releasedAmount += net;
    } else if (PENDING_STATUSES.has(row.status)) {
      item.heldAmount += net;
    }

    // Keep gross in ledger view by combining held + released where useful.
    if (!RELEASED_STATUSES.has(row.status) && !PENDING_STATUSES.has(row.status)) {
      item.heldAmount += gross;
    }

    return acc;
  }, {});

  const sellerRows = Object.values(ledgerMap).sort((a, b) => b.netReceivable - a.netReceivable);

  const totals = sellerRows.reduce(
    (acc, row) => {
      acc.orders += row.ordersCount;
      acc.held += row.heldAmount;
      acc.released += row.releasedAmount;
      acc.fees += row.totalFees;
      acc.net += row.netReceivable;
      return acc;
    },
    { orders: 0, held: 0, released: 0, fees: 0, net: 0 },
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
  pdf.text('Seller Payout Ledger', pageWidth - 14, 15, { align: 'right' });

  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`Period: ${periodLabel}`, pageWidth - 14, 20, { align: 'right' });
  pdf.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - 14, 24, { align: 'right' });

  autoTable(pdf, {
    startY: 34,
    head: [['Metric', 'Value']],
    body: [
      ['Sellers', String(sellerRows.length)],
      ['Transactions', String(totals.orders)],
      ['Held Amount', asLkr(totals.held)],
      ['Released Amount', asLkr(totals.released)],
      ['Total Fees', asLkr(totals.fees)],
      ['Net Receivable', asLkr(totals.net)],
      ['Source Filter', filters.source || 'All'],
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

  const body = sellerRows.map((row) => [
    row.sellerName,
    row.sellerEmail,
    String(row.ordersCount),
    asLkr(row.heldAmount),
    asLkr(row.releasedAmount),
    asLkr(row.totalFees),
    asLkr(row.netReceivable),
  ]);

  autoTable(pdf, {
    startY: (getLastTableY(pdf) || 68) + 8,
    head: [['Seller', 'Email', 'Orders', 'Held', 'Released', 'Fees', 'Net Receivable']],
    body: body.length ? body : [['No data', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8.5, textColor: TEXT },
    margin: { left: 14, right: 14 },
    columnStyles: {
      1: { cellWidth: 58 },
      6: { cellWidth: 30 },
    },
  });

  addFooterToAllPages(pdf);

  const dateTag = format(new Date(), 'yyyyMMdd-HHmm');
  pdf.save(`admin-seller-payout-ledger-${dateTag}.pdf`);
};
