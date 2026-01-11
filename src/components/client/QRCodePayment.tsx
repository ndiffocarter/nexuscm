import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodePaymentProps {
  accountNumber: string;
  accountHolderName: string;
}

export function QRCodePayment({ accountNumber, accountHolderName }: QRCodePaymentProps) {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const generatePaymentData = () => {
    const paymentData = {
      type: 'securebank_payment',
      to: accountNumber,
      name: accountHolderName,
      amount: amount ? parseFloat(amount) : undefined,
      description: description || undefined,
    };
    return JSON.stringify(paymentData);
  };

  const handleDownload = () => {
    const svg = document.getElementById('payment-qrcode');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-paiement-${accountNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success('QR Code téléchargé');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Paiement SecureBank',
      text: `Effectuez un paiement vers ${accountHolderName} (${accountNumber})${amount ? ` - Montant: ${amount} XAF` : ''}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Partagé avec succès');
      } catch (err) {
        console.log('Partage annulé');
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    const paymentUrl = `${window.location.origin}/transfer?to=${accountNumber}${amount ? `&amount=${amount}` : ''}${description ? `&desc=${encodeURIComponent(description)}` : ''}`;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast.success('Lien copié dans le presse-papiers');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg [background:var(--gradient-primary)] flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </div>
          QR Code de paiement
        </CardTitle>
        <CardDescription>
          Partagez ce QR code pour recevoir des paiements instantanément
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG
              id="payment-qrcode"
              value={generatePaymentData()}
              size={200}
              level="H"
              includeMargin
              bgColor="#FFFFFF"
              fgColor="#1a365d"
            />
          </div>
        </div>

        {/* Account Info */}
        <div className="text-center space-y-1">
          <p className="font-semibold text-lg">{accountHolderName}</p>
          <p className="text-muted-foreground font-mono">{accountNumber}</p>
        </div>

        {/* Optional Amount */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-amount">Montant (optionnel)</Label>
            <Input
              id="qr-amount"
              type="number"
              placeholder="Entrez un montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qr-description">Description (optionnelle)</Label>
            <Input
              id="qr-description"
              placeholder="Ex: Remboursement déjeuner"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Copier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
