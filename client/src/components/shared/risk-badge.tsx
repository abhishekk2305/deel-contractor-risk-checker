import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, XCircle } from "lucide-react";

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high';
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const riskConfig = {
  low: {
    label: 'Low Risk',
    icon: Shield,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    iconClassName: 'text-green-500',
  },
  medium: {
    label: 'Medium Risk',
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    iconClassName: 'text-amber-500',
  },
  high: {
    label: 'High Risk',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    iconClassName: 'text-red-500',
  },
};

const sizeConfig = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

export function RiskBadge({ 
  level, 
  score, 
  size = 'md', 
  showIcon = true, 
  className 
}: RiskBadgeProps) {
  const config = riskConfig[level];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.className,
        sizeConfig[size],
        className
      )}
      aria-label={`Risk level: ${config.label}${score ? ` (${score}/100)` : ''}`}
    >
      {showIcon && (
        <Icon 
          className={cn(
            "mr-1",
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
            config.iconClassName
          )} 
        />
      )}
      {config.label}
      {score && (
        <span className="ml-1 opacity-75">
          ({score}/100)
        </span>
      )}
    </span>
  );
}
