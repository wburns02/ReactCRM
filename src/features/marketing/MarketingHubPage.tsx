import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';

interface MarketingWidget {
  id: string;
  title: string;
  description: string;
  icon: string;
  linkTo: string;
  linkText: string;
  stats: { label: string; value: string | number }[];
  badge?: { text: string; variant: 'success' | 'warning' | 'info' | 'default' };
}

const MARKETING_WIDGETS: MarketingWidget[] = [
  {
    id: 'email-campaigns',
    title: 'Email Campaigns',
    description: 'Create and manage email marketing campaigns',
    icon: '📧',
    linkTo: '/email-marketing',
    linkText: 'Manage Campaigns',
    stats: [
      { label: 'Active Campaigns', value: 3 },
      { label: 'Emails Sent (30d)', value: '12,450' },
      { label: 'Open Rate', value: '24.5%' },
    ],
    badge: { text: 'Active', variant: 'success' },
  },
  {
    id: 'sms-consent',
    title: 'SMS Consent Stats',
    description: 'Track and manage SMS opt-in preferences',
    icon: '📱',
    linkTo: '/marketing/sms',
    linkText: 'Manage SMS Consent',
    stats: [
      { label: 'Total Customers', value: '2,847' },
      { label: 'Opted In', value: '1,923' },
      { label: 'Opt-in Rate', value: '67.5%' },
    ],
    badge: { text: 'TCPA Compliant', variant: 'info' },
  },
  {
    id: 'ai-advisor',
    title: 'Marketing AI Advisor',
    description: 'Get AI-powered marketing recommendations',
    icon: '🤖',
    linkTo: '/email-marketing',
    linkText: 'View Suggestions',
    stats: [
      { label: 'New Suggestions', value: 5 },
      { label: 'Implemented', value: 12 },
      { label: 'Revenue Impact', value: '+$8.2K' },
    ],
    badge: { text: 'AI Powered', variant: 'warning' },
  },
];

export function MarketingHubPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Marketing Hub</h1>
          <p className="text-sm text-text-secondary mt-1">
            Centralized marketing management and insights
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Reach</div>
            <div className="text-2xl font-bold text-primary">14,297</div>
            <div className="text-xs text-success mt-1">+12% from last month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Engagement Rate</div>
            <div className="text-2xl font-bold text-text-primary">18.3%</div>
            <div className="text-xs text-success mt-1">+2.1% from last month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Leads Generated</div>
            <div className="text-2xl font-bold text-text-primary">47</div>
            <div className="text-xs text-text-secondary mt-1">This month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">ROI</div>
            <div className="text-2xl font-bold text-success">324%</div>
            <div className="text-xs text-text-secondary mt-1">Marketing spend</div>
          </CardContent>
        </Card>
      </div>

      {/* Marketing Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {MARKETING_WIDGETS.map((widget) => (
          <Card key={widget.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{widget.icon}</span>
                  <div>
                    <CardTitle className="text-lg">{widget.title}</CardTitle>
                    {widget.badge && (
                      <Badge variant={widget.badge.variant} className="mt-1">
                        {widget.badge.text}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-text-secondary mb-4">{widget.description}</p>

              {/* Stats */}
              <div className="space-y-2 mb-4 flex-1">
                {widget.stats.map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-sm text-text-secondary">{stat.label}</span>
                    <span className="text-sm font-medium text-text-primary">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Action Link */}
              <Link to={widget.linkTo}>
                <Button variant="secondary" className="w-full">
                  {widget.linkText} →
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Marketing Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: 'Email campaign "Winter Special" sent', time: '2 hours ago', icon: '📧' },
              { action: '15 new SMS opt-ins received', time: '5 hours ago', icon: '📱' },
              { action: 'AI suggested new customer segment', time: '1 day ago', icon: '🤖' },
              { action: 'Email template "Service Reminder" updated', time: '2 days ago', icon: '✏️' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xl">{activity.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{activity.action}</p>
                  <p className="text-xs text-text-secondary">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
