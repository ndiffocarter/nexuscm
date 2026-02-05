import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Loader2, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
}

interface StatementProps {
  accounts: Account[];
}

const MONTHS = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export default function MonthlyStatementGenerator({ accounts }: StatementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isGenerating, setIsGenerating] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => (currentYear - i).toString());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateStatement = async () => {
    if (!selectedAccount) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un compte",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) throw new Error('Compte non trouvé');

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone, address')
        .eq('id', user?.id)
        .single();

      // Calculate date range
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Fetch transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', selectedAccount)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate running balance and statistics
      let runningBalance = Number(account.balance);
      const txWithBalance = [...(transactions || [])].reverse();
      
      // Calculate initial balance by reversing transactions
      txWithBalance.forEach(tx => {
        if (tx.transaction_type === 'credit') {
          runningBalance -= Number(tx.amount);
        } else {
          runningBalance += Number(tx.amount);
        }
      });

      const initialBalance = runningBalance;
      const processedTransactions = (transactions || []).map(tx => {
        if (tx.transaction_type === 'credit') {
          runningBalance += Number(tx.amount);
        } else {
          runningBalance -= Number(tx.amount);
        }
        return {
          ...tx,
          balance: runningBalance
        };
      });

      // Calculate statistics
      const totalCredits = (transactions || [])
        .filter(tx => tx.transaction_type === 'credit')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      
      const totalDebits = (transactions || [])
        .filter(tx => tx.transaction_type === 'debit' || tx.transaction_type === 'transfer')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header with bank logo/name
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('SecureBank', 14, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Relevé de Compte Mensuel', 14, 35);

      // Statement period
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
      doc.setFontSize(11);
      doc.text(`${monthName} ${selectedYear}`, pageWidth - 14, 30, { align: 'right' });

      // Account holder info box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 55, pageWidth - 28, 40, 3, 3, 'FD');
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMATIONS DU TITULAIRE', 20, 65);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Nom: ${profile?.full_name || 'N/A'}`, 20, 75);
      doc.text(`Email: ${profile?.email || 'N/A'}`, 20, 82);
      doc.text(`Téléphone: ${profile?.phone || 'N/A'}`, pageWidth / 2, 75);
      doc.text(`Adresse: ${profile?.address || 'N/A'}`, pageWidth / 2, 82);

      // Account info box
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(14, 100, pageWidth - 28, 35, 3, 3, 'FD');
      
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAILS DU COMPTE', 20, 110);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`N° Compte: ${account.account_number}`, 20, 120);
      doc.text(`Type: ${account.account_type === 'checking' ? 'Compte Courant' : 'Compte Épargne'}`, 20, 127);
      doc.text(`Solde initial: ${formatCurrency(initialBalance)}`, pageWidth / 2, 120);
      doc.text(`Solde final: ${formatCurrency(account.balance)}`, pageWidth / 2, 127);

      // Summary statistics
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(134, 239, 172);
      doc.roundedRect(14, 140, (pageWidth - 35) / 2, 25, 3, 3, 'FD');
      
      doc.setTextColor(22, 101, 52);
      doc.setFontSize(9);
      doc.text('TOTAL CRÉDITS', 20, 150);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`+${formatCurrency(totalCredits)}`, 20, 160);

      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(pageWidth / 2 + 3.5, 140, (pageWidth - 35) / 2, 25, 3, 3, 'FD');
      
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('TOTAL DÉBITS', pageWidth / 2 + 10, 150);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`-${formatCurrency(totalDebits)}`, pageWidth / 2 + 10, 160);

      // Transactions table
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('HISTORIQUE DES TRANSACTIONS', 14, 178);

      if (processedTransactions.length > 0) {
        autoTable(doc, {
          head: [['Date', 'Type', 'Description', 'Montant', 'Solde']],
          body: processedTransactions.map(tx => [
            formatDate(tx.created_at),
            tx.transaction_type === 'credit' ? 'Crédit' : 
              tx.transaction_type === 'debit' ? 'Débit' : 'Virement',
            tx.description || '-',
            (tx.transaction_type === 'credit' ? '+' : '-') + formatCurrency(tx.amount),
            formatCurrency(tx.balance)
          ]),
          startY: 183,
          styles: {
            fontSize: 8,
            cellPadding: 4,
          },
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 22 },
            2: { cellWidth: 'auto' },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 30 },
          },
          margin: { left: 14, right: 14 },
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
              const text = data.cell.text[0];
              if (text.startsWith('+')) {
                data.cell.styles.textColor = [22, 101, 52];
              } else {
                data.cell.styles.textColor = [153, 27, 27];
              }
            }
          }
        });
      } else {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Aucune transaction pour cette période', pageWidth / 2, 195, { align: 'center' });
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer line
        doc.setDrawColor(226, 232, 240);
        doc.line(14, doc.internal.pageSize.height - 25, pageWidth - 14, doc.internal.pageSize.height - 25);
        
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `SecureBank - Document généré le ${formatDate(new Date().toISOString())}`,
          14,
          doc.internal.pageSize.height - 15
        );
        doc.text(
          `Page ${i}/${pageCount}`,
          pageWidth - 14,
          doc.internal.pageSize.height - 15,
          { align: 'right' }
        );
        
        doc.setFontSize(7);
        doc.text(
          'Ce document est un relevé officiel de vos opérations bancaires. Conservez-le précieusement.',
          pageWidth / 2,
          doc.internal.pageSize.height - 8,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `releve_${account.account_number}_${monthName}_${selectedYear}.pdf`;
      doc.save(fileName);

      toast({
        title: "Relevé généré",
        description: `Le fichier ${fileName} a été téléchargé`
      });
    } catch (error: any) {
      console.error('Error generating statement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le relevé",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Relevés Mensuels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Compte</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.account_number} - {account.account_type === 'checking' ? 'Courant' : 'Épargne'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mois</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Année</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={generateStatement} 
          disabled={isGenerating || !selectedAccount}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Télécharger le relevé PDF
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Calendar className="w-3 h-3" />
          Les relevés incluent toutes les transactions du mois sélectionné
        </p>
      </CardContent>
    </Card>
  );
}
