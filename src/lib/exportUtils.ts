import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string | number);
}

interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: any[];
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getValue = (row: any, accessor: string | ((row: any) => string | number)) => {
  if (typeof accessor === 'function') {
    return accessor(row);
  }
  return row[accessor] ?? '';
};

export const exportToPDF = (options: ExportOptions) => {
  const { filename, title, subtitle, columns, data } = options;
  
  const doc = new jsPDF();
  
  // Add title
  if (title) {
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text(title, 14, 22);
  }
  
  // Add subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(108, 117, 125);
    doc.text(subtitle, 14, 30);
  }
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Généré le: ${formatDate(new Date())}`, 14, title ? 38 : 22);
  
  // Prepare table data
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => String(getValue(row, col.accessor)))
  );
  
  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 45 : 28,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    margin: { left: 14, right: 14 },
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(
      `Page ${i} sur ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`${filename}.pdf`);
};

export const exportToExcel = (options: ExportOptions) => {
  const { filename, title, columns, data } = options;
  
  // Prepare data with headers
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => getValue(row, col.accessor))
  );
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: Math.max(col.header.length, 15) }));
  ws['!cols'] = colWidths;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title || 'Données');
  
  // Save file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Account statement export
export interface AccountStatement {
  accountNumber: string;
  accountType: string;
  ownerName: string;
  balance: number;
  transactions: {
    date: string;
    type: string;
    description: string;
    amount: number;
    balance: number;
  }[];
  startDate: string;
  endDate: string;
}

export const exportAccountStatementPDF = (statement: AccountStatement) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text('SecureBank', 14, 20);
  
  doc.setFontSize(16);
  doc.setTextColor(33, 37, 41);
  doc.text('Relevé de compte', 14, 32);
  
  // Account info
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(`Période: ${formatDate(statement.startDate)} - ${formatDate(statement.endDate)}`, 14, 42);
  
  doc.setFontSize(11);
  doc.setTextColor(33, 37, 41);
  doc.text(`Titulaire: ${statement.ownerName}`, 14, 52);
  doc.text(`N° Compte: ${statement.accountNumber}`, 14, 58);
  doc.text(`Type: ${statement.accountType}`, 14, 64);
  doc.text(`Solde actuel: ${formatCurrency(statement.balance)}`, 14, 70);
  
  // Transactions table
  if (statement.transactions.length > 0) {
    autoTable(doc, {
      head: [['Date', 'Type', 'Description', 'Montant', 'Solde']],
      body: statement.transactions.map(tx => [
        formatDate(tx.date),
        tx.type,
        tx.description || '-',
        formatCurrency(tx.amount),
        formatCurrency(tx.balance)
      ]),
      startY: 78,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(
      `SecureBank - Document généré le ${formatDate(new Date())}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Page ${i}/${pageCount}`,
      doc.internal.pageSize.width - 24,
      doc.internal.pageSize.height - 10
    );
  }
  
  doc.save(`releve_${statement.accountNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
};
