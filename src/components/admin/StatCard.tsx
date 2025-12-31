import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary'
}: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in-up">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          "bg-primary/10"
        )}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        {change && (
          <span className={cn(
            "text-sm font-medium px-2.5 py-1 rounded-full",
            changeType === 'positive' && "bg-success/10 text-success",
            changeType === 'negative' && "bg-destructive/10 text-destructive",
            changeType === 'neutral' && "bg-muted text-muted-foreground"
          )}>
            {change}
          </span>
        )}
      </div>
      
      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <p className="text-muted-foreground">{title}</p>
    </div>
  );
}
