/**
 * Action Wizard Component
 *
 * Step-by-step wizard for taking action on selected customers.
 * Super simple interface for email, calls, scheduling, and saving segments.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import type { CustomerResult } from './SimpleResultCard.tsx';

export type ActionType = 'email' | 'call' | 'schedule' | 'save';

interface ActionWizardProps {
  action: ActionType;
  customers: CustomerResult[];
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

const ACTION_CONFIG = {
  email: {
    emoji: '📧',
    title: 'Send an Email',
    description: "Let's compose a message for your customers",
    color: 'blue',
  },
  call: {
    emoji: '📞',
    title: 'Call List',
    description: "Here's your call list with helpful talking points",
    color: 'green',
  },
  schedule: {
    emoji: '📅',
    title: 'Book Service',
    description: 'Schedule service appointments',
    color: 'purple',
  },
  save: {
    emoji: '💾',
    title: 'Save for Later',
    description: 'Save this group so you can find them again',
    color: 'amber',
  },
};

export function ActionWizard({ action, customers, onComplete, onBack }: ActionWizardProps) {
  const config = ACTION_CONFIG[action];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </button>
        <span className="text-sm text-gray-500">
          {customers.length} customer{customers.length !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Action Header */}
      <div
        className={cn(
          'rounded-xl p-6 text-center',
          config.color === 'blue' && 'bg-blue-50 dark:bg-blue-900/20',
          config.color === 'green' && 'bg-green-50 dark:bg-green-900/20',
          config.color === 'purple' && 'bg-purple-50 dark:bg-purple-900/20',
          config.color === 'amber' && 'bg-amber-50 dark:bg-amber-900/20'
        )}
      >
        <span className="text-4xl mb-3 block">{config.emoji}</span>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{config.title}</h2>
        <p className="text-gray-600 dark:text-gray-300">{config.description}</p>
      </div>

      {/* Action-specific content */}
      {action === 'email' && <EmailComposer customers={customers} onComplete={onComplete} />}
      {action === 'call' && <CallList customers={customers} onComplete={onComplete} />}
      {action === 'schedule' && <ServiceScheduler customers={customers} onComplete={onComplete} />}
      {action === 'save' && <SegmentSaver customers={customers} onComplete={onComplete} />}
    </div>
  );
}

// ============================================
// Email Composer
// ============================================

interface EmailComposerProps {
  customers: CustomerResult[];
  onComplete: (data: Record<string, unknown>) => void;
}

function EmailComposer({ customers, onComplete }: EmailComposerProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [template, setTemplate] = useState<string | null>(null);

  const TEMPLATES = [
    {
      id: 'checkin',
      name: 'Quick Check-in',
      emoji: '👋',
      subject: 'Just checking in!',
      body: "Hi {name}!\n\nI wanted to reach out and see how things are going. Is there anything I can help you with?\n\nBest regards",
    },
    {
      id: 'thankyou',
      name: 'Thank You',
      emoji: '🙏',
      subject: 'Thank you for being a great customer!',
      body: "Hi {name}!\n\nI just wanted to take a moment to thank you for being such a valued customer. We really appreciate your business!\n\nLet me know if there's anything we can do for you.",
    },
    {
      id: 'offer',
      name: 'Special Offer',
      emoji: '🎁',
      subject: "Something special, just for you",
      body: "Hi {name}!\n\nWe have a special offer we thought you might like...\n\n[Your offer details here]\n\nLet me know if you have any questions!",
    },
    {
      id: 'feedback',
      name: 'Ask for Feedback',
      emoji: '💭',
      subject: 'We value your opinion',
      body: "Hi {name}!\n\nWe're always looking to improve, and your feedback means the world to us.\n\nWould you mind sharing your thoughts on your recent experience?\n\nThank you!",
    },
  ];

  const handleTemplateSelect = (t: typeof TEMPLATES[0]) => {
    setTemplate(t.id);
    setSubject(t.subject);
    setMessage(t.body);
  };

  const handleSend = () => {
    onComplete({
      type: 'email',
      subject,
      message,
      recipients: customers.map((c) => c.email),
    });
  };

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Start with a template (optional):
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTemplateSelect(t)}
              className={cn(
                'p-4 rounded-xl border-2 text-center transition-all',
                template === t.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              )}
            >
              <span className="text-2xl block mb-2">{t.emoji}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What's this email about?"
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          )}
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Your Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message here..."
          rows={8}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 resize-none',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          )}
        />
        <p className="mt-2 text-xs text-gray-500">
          Tip: Use {'{name}'} to personalize with each customer's name
        </p>
      </div>

      {/* Preview Recipients */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sending to {customers.length} customer{customers.length !== 1 ? 's' : ''}:
        </p>
        <div className="flex flex-wrap gap-2">
          {customers.slice(0, 5).map((c) => (
            <span
              key={c.id}
              className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
            >
              {c.name}
            </span>
          ))}
          {customers.length > 5 && (
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm text-blue-700 dark:text-blue-300">
              +{customers.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!subject.trim() || !message.trim()}
        className={cn(
          'w-full py-4 rounded-xl font-bold text-lg transition-all',
          'bg-blue-500 text-white hover:bg-blue-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        📧 Send Email to {customers.length} Customer{customers.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}

// ============================================
// Call List
// ============================================

interface CallListProps {
  customers: CustomerResult[];
  onComplete: (data: Record<string, unknown>) => void;
}

function CallList({ customers, onComplete }: CallListProps) {
  const [completedCalls, setCompletedCalls] = useState<Set<number>>(new Set());

  const SUGGESTED_SCRIPTS = [
    {
      emoji: '👋',
      title: 'Opening',
      script: "Hi [Name], this is [Your Name] from [Company]. How are you today?",
    },
    {
      emoji: '❓',
      title: 'Check-in Question',
      script: "I wanted to check in and see how everything's going. Are you getting the most out of our service?",
    },
    {
      emoji: '🎯',
      title: 'Identify Needs',
      script: "Is there anything specific you'd like help with or any challenges you're facing?",
    },
    {
      emoji: '📅',
      title: 'Next Steps',
      script: "Would you like to schedule some time to discuss this further? I'm happy to help!",
    },
  ];

  const toggleCall = (customerId: number) => {
    setCompletedCalls((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handleFinish = () => {
    onComplete({
      type: 'call',
      completedCalls: Array.from(completedCalls),
      totalCalls: customers.length,
    });
  };

  return (
    <div className="space-y-6">
      {/* Suggested Scripts */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
          <span>💡</span> Suggested Talking Points
        </h3>
        <div className="space-y-3">
          {SUGGESTED_SCRIPTS.map((script, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800"
            >
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-1">
                <span>{script.emoji}</span> {script.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{script.script}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call List */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>📋</span> Your Call List
        </h3>
        <div className="space-y-3">
          {customers.map((customer, index) => (
            <div
              key={customer.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                completedCalls.has(customer.id)
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
            >
              {/* Number */}
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                {index + 1}
              </div>

              {/* Customer Info */}
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.company || customer.email}</p>
              </div>

              {/* Phone (mock) */}
              <a
                href={`tel:555-${String(customer.id).padStart(4, '0')}`}
                className="text-green-600 dark:text-green-400 hover:text-green-700 font-medium"
              >
                📞 555-{String(customer.id).padStart(4, '0')}
              </a>

              {/* Completed Toggle */}
              <button
                onClick={() => toggleCall(customer.id)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-all',
                  completedCalls.has(customer.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                )}
              >
                {completedCalls.has(customer.id) ? '✓ Called' : 'Mark Called'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Progress & Finish */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-700 dark:text-gray-300">
            Progress: {completedCalls.size} of {customers.length} calls completed
          </span>
          <span className="text-2xl">
            {completedCalls.size === customers.length ? '🎉' : '📞'}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(completedCalls.size / customers.length) * 100}%` }}
          />
        </div>
        <button
          onClick={handleFinish}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-lg transition-all',
            'bg-green-500 text-white hover:bg-green-600'
          )}
        >
          ✓ Finish Call Session
        </button>
      </div>
    </div>
  );
}

// ============================================
// Service Scheduler
// ============================================

interface ServiceSchedulerProps {
  customers: CustomerResult[];
  onComplete: (data: Record<string, unknown>) => void;
}

function ServiceScheduler({ customers, onComplete }: ServiceSchedulerProps) {
  const [serviceType, setServiceType] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');

  const SERVICE_TYPES = [
    { id: 'maintenance', name: 'Regular Maintenance', emoji: '🔧', duration: '1-2 hours' },
    { id: 'repair', name: 'Repair Service', emoji: '🛠️', duration: '2-4 hours' },
    { id: 'installation', name: 'New Installation', emoji: '📦', duration: '4-6 hours' },
    { id: 'inspection', name: 'Inspection', emoji: '🔍', duration: '30-60 mins' },
    { id: 'consultation', name: 'Consultation', emoji: '💬', duration: '30 mins' },
  ];

  const TIME_SLOTS = [
    { id: 'morning', label: 'Morning (8am - 12pm)', emoji: '🌅' },
    { id: 'afternoon', label: 'Afternoon (12pm - 5pm)', emoji: '☀️' },
    { id: 'evening', label: 'Evening (5pm - 8pm)', emoji: '🌆' },
  ];

  const handleSchedule = () => {
    onComplete({
      type: 'schedule',
      serviceType,
      date,
      timeSlot,
      notes,
      customers: customers.map((c) => c.id),
    });
  };

  const selectedService = SERVICE_TYPES.find((s) => s.id === serviceType);

  return (
    <div className="space-y-6">
      {/* Service Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          What type of service?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SERVICE_TYPES.map((service) => (
            <button
              key={service.id}
              onClick={() => setServiceType(service.id)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                serviceType === service.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              )}
            >
              <span className="text-2xl block mb-2">{service.emoji}</span>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{service.name}</p>
              <p className="text-xs text-gray-500 mt-1">{service.duration}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          When would you like to schedule?
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
          )}
        />
      </div>

      {/* Time Slot */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Preferred time
        </label>
        <div className="grid grid-cols-3 gap-3">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.id}
              onClick={() => setTimeSlot(slot.id)}
              className={cn(
                'p-4 rounded-xl border-2 text-center transition-all',
                timeSlot === slot.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              )}
            >
              <span className="text-2xl block mb-1">{slot.emoji}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{slot.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Any special notes? (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any details the service team should know..."
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 resize-none',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
          )}
        />
      </div>

      {/* Summary */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5">
        <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">
          📋 Booking Summary
        </h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Service:</strong> {selectedService?.name || 'Not selected'}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Date:</strong> {date || 'Not selected'}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Time:</strong>{' '}
            {TIME_SLOTS.find((s) => s.id === timeSlot)?.label || 'Not selected'}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Customers:</strong> {customers.length}
          </p>
        </div>
      </div>

      {/* Schedule Button */}
      <button
        onClick={handleSchedule}
        disabled={!serviceType || !date || !timeSlot}
        className={cn(
          'w-full py-4 rounded-xl font-bold text-lg transition-all',
          'bg-purple-500 text-white hover:bg-purple-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        📅 Schedule for {customers.length} Customer{customers.length !== 1 ? 's' : ''}
      </button>
    </div>
  );
}

// ============================================
// Segment Saver
// ============================================

interface SegmentSaverProps {
  customers: CustomerResult[];
  onComplete: (data: Record<string, unknown>) => void;
}

function SegmentSaver({ customers, onComplete }: SegmentSaverProps) {
  const [segmentName, setSegmentName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('👥');

  const ICONS = ['👥', '⭐', '🚨', '💎', '🔥', '💚', '🎯', '📈', '🛡️', '🎁'];

  const handleSave = () => {
    onComplete({
      type: 'save',
      segmentName,
      description,
      icon,
      customerIds: customers.map((c) => c.id),
    });
  };

  const SUGGESTIONS = [
    'VIP Customers',
    'Needs Attention',
    'Happy Customers',
    'Follow Up Required',
    'Service Due',
    'New Customers',
  ];

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Give this group a name
        </label>
        <input
          type="text"
          value={segmentName}
          onChange={(e) => setSegmentName(e.target.value)}
          placeholder="e.g., VIP Customers, Needs Follow-up"
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
          )}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setSegmentName(suggestion)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Pick an icon
        </label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={cn(
                'w-12 h-12 rounded-xl text-2xl transition-all flex items-center justify-center',
                icon === i
                  ? 'bg-amber-500 ring-4 ring-amber-500/30'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Add a note (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes this group special? Any reminders for yourself?"
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 resize-none',
            'bg-white dark:bg-gray-800',
            'border-gray-200 dark:border-gray-700',
            'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
          )}
        />
      </div>

      {/* Preview */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-4">
          Preview of your saved group:
        </h3>
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">
              {segmentName || 'Untitled Group'}
            </p>
            <p className="text-sm text-gray-500">
              {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </p>
            {description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!segmentName.trim()}
        className={cn(
          'w-full py-4 rounded-xl font-bold text-lg transition-all',
          'bg-amber-500 text-white hover:bg-amber-600',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        💾 Save This Group
      </button>
    </div>
  );
}

export default ActionWizard;
