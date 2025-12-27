import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';

interface CallRecording {
  id: string;
  date: string;
  time: string;
  caller: string;
  callerPhone: string;
  duration: string;
  type: 'inbound' | 'outbound';
}

interface CallDisposition {
  id: string;
  name: string;
  count: number;
  color: string;
}

// Mock call recordings
const MOCK_RECORDINGS: CallRecording[] = [
  { id: '1', date: '2024-03-15', time: '10:30 AM', caller: 'John Smith', callerPhone: '(512) 555-0101', duration: '5:23', type: 'inbound' },
  { id: '2', date: '2024-03-15', time: '11:45 AM', caller: 'Sarah Johnson', callerPhone: '(512) 555-0102', duration: '3:12', type: 'outbound' },
  { id: '3', date: '2024-03-14', time: '2:30 PM', caller: 'Mike Williams', callerPhone: '(512) 555-0103', duration: '8:45', type: 'inbound' },
  { id: '4', date: '2024-03-14', time: '4:15 PM', caller: 'Emily Davis', callerPhone: '(512) 555-0104', duration: '2:30', type: 'outbound' },
  { id: '5', date: '2024-03-13', time: '9:00 AM', caller: 'David Brown', callerPhone: '(512) 555-0105', duration: '6:18', type: 'inbound' },
];

// Mock call dispositions
const MOCK_DISPOSITIONS: CallDisposition[] = [
  { id: '1', name: 'Scheduled Service', count: 145, color: 'success' },
  { id: '2', name: 'Quote Requested', count: 78, color: 'info' },
  { id: '3', name: 'General Inquiry', count: 62, color: 'default' },
  { id: '4', name: 'Follow-up Required', count: 34, color: 'warning' },
  { id: '5', name: 'No Answer', count: 28, color: 'danger' },
];

export function RingCentralPage() {
  const [showRecordings, setShowRecordings] = useState(false);
  const [isConnected] = useState(true);

  // Mock stats
  const stats = {
    totalCalls: 347,
    avgDuration: '4:32',
    missedCalls: 12,
    conversionRate: '42%',
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/integrations" className="text-text-secondary hover:text-primary">
              Integrations
            </Link>
            <span className="text-text-secondary">/</span>
            <span className="text-text-primary font-medium">RingCentral</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">RingCentral Integration</h1>
        </div>
        <Badge variant={isConnected ? 'success' : 'danger'} className="text-base px-4 py-2">
          {isConnected ? '✓ Connected' : '✗ Disconnected'}
        </Badge>
      </div>

      {/* Connection Status */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📞</span>
              </div>
              <div>
                <p className="font-medium text-text-primary">RingCentral MVP</p>
                <p className="text-sm text-text-secondary">
                  Last synced: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
            <Button variant="secondary">Reconnect</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Calls (30d)</div>
            <div className="text-2xl font-bold text-text-primary">{stats.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Avg Duration</div>
            <div className="text-2xl font-bold text-text-primary">{stats.avgDuration}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Missed Calls</div>
            <div className="text-2xl font-bold text-danger">{stats.missedCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Conversion Rate</div>
            <div className="text-2xl font-bold text-success">{stats.conversionRate}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Call Dispositions */}
        <Card>
          <CardHeader>
            <CardTitle>Call Dispositions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_DISPOSITIONS.map((disposition) => (
                <div key={disposition.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={disposition.color as 'success' | 'warning' | 'danger' | 'info' | 'default'}>
                      {disposition.count}
                    </Badge>
                    <span className="text-text-primary">{disposition.name}</span>
                  </div>
                  <div className="w-32 h-2 bg-bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(disposition.count / 145) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Call Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-text-secondary">Inbound Calls</span>
                <span className="font-medium text-text-primary">234 (67%)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-text-secondary">Outbound Calls</span>
                <span className="font-medium text-text-primary">113 (33%)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-text-secondary">Peak Hours</span>
                <span className="font-medium text-text-primary">10 AM - 2 PM</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-text-secondary">Busiest Day</span>
                <span className="font-medium text-text-primary">Monday</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-text-secondary">Avg Wait Time</span>
                <span className="font-medium text-text-primary">0:45</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Recordings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Call Recordings</CardTitle>
          <Button
            variant={showRecordings ? 'secondary' : 'primary'}
            onClick={() => setShowRecordings(!showRecordings)}
          >
            {showRecordings ? 'Hide Recordings' : 'Show Recordings'}
          </Button>
        </CardHeader>
        {showRecordings && (
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-bg-subtle border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Date/Time</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Caller</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Phone</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">Type</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Duration</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_RECORDINGS.map((recording) => (
                  <tr key={recording.id} className="hover:bg-bg-hover">
                    <td className="px-4 py-3 text-text-primary">
                      {recording.date} {recording.time}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{recording.caller}</td>
                    <td className="px-4 py-3 text-text-secondary">{recording.callerPhone}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={recording.type === 'inbound' ? 'info' : 'default'}>
                        {recording.type === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-text-primary">{recording.duration}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        ▶ Listen
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
