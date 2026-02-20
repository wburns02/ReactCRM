import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  /** If provided, renders a button/link. Use `href` for external, `to` for internal routes. */
  action?: {
    label: string;
    to?: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon = "📭", title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <span className="text-5xl mb-4" role="img" aria-label={title}>
        {icon}
      </span>
      <p className="text-lg font-semibold text-text-primary mb-2">{title}</p>
      {description && (
        <p className="text-sm text-text-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.to ? (
            <Link
              to={action.to}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </Link>
          ) : action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
