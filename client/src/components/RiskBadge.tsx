import { Badge } from "@/components/ui/badge";

interface RiskBadgeProps {
  tier: 'low' | 'medium' | 'high';
  className?: string;
}

export function RiskBadge({ tier, className = "" }: RiskBadgeProps) {
  const getVariant = (tier: string) => {
    switch (tier) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  const getColors = (tier: string) => {
    switch (tier) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';  
      case 'high': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  return (
    <Badge
      className={`${getColors(tier)} ${className}`}
      aria-label={`Risk level: ${tier}`}
    >
      {tier.toUpperCase()} RISK
    </Badge>
  );
}