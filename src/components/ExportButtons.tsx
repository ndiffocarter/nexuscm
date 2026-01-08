import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';

interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string | number);
}

interface ExportButtonsProps {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: any[];
  disabled?: boolean;
}

export function ExportButtons({ 
  filename, 
  title, 
  subtitle, 
  columns, 
  data,
  disabled 
}: ExportButtonsProps) {
  const handleExportPDF = () => {
    exportToPDF({ filename, title, subtitle, columns, data });
  };

  const handleExportExcel = () => {
    exportToExcel({ filename, title, columns, data });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || data.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Exporter en PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exporter en Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
