import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'There are no records to display at this moment.',
  action,
}) => {
  return (
    <div className="glass-card py-16 text-center flex flex-col items-center justify-center space-y-4 animate-fade-in">
      <div className="empty-state-icon">
        <Icon className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-base font-bold text-primary">{title}</h4>
        <p className="text-xs max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
