import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface Template {
  id: number;
  name: string;
  category: string;
  content: string;
  variables: string[];
  created_at: string;
}

/**
 * SMS Templates Management
 */
export function SMSTemplates() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: '', content: '' });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/templates', {
          params: { type: 'sms' }
        });
        return response.data.items || response.data || [];
      } catch {
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: typeof newTemplate) => {
      await apiClient.post('/templates', {
        ...template,
        type: 'sms',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      setIsCreating(false);
      setNewTemplate({ name: '', category: '', content: '' });
    },
  });

  const categories = ['Appointment Reminder', 'Service Complete', 'Follow-up', 'Payment', 'General'];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/communications/templates" className="text-text-muted hover:text-text-primary mb-2 inline-block">
          &larr; Back to Templates
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">SMS Templates</h1>
            <p className="text-text-muted">Create and manage SMS message templates</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Create Template
          </button>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
          <h3 className="font-medium text-text-primary mb-4">New SMS Template</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Template name"
                className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
              <select
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Content</label>
              <textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                placeholder="Use {{customer_name}}, {{date}}, {{time}} for variables"
                rows={4}
                className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-muted mt-1">
                Available variables: {'{{customer_name}}'}, {'{{date}}'}, {'{{time}}'}, {'{{address}}'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTemplate({ name: '', category: '', content: '' });
                }}
                className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(newTemplate)}
                disabled={!newTemplate.name || !newTemplate.content || createMutation.isPending}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-bg-card border border-border rounded-lg">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : templates?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <span className="text-4xl block mb-2">📱</span>
            <p>No SMS templates yet</p>
            <p className="text-sm mt-2">Create your first SMS template</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {templates?.map((template: Template) => (
              <div key={template.id} className="p-4 hover:bg-bg-hover transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">{template.name}</h3>
                    <p className="text-sm text-text-muted">{template.category}</p>
                    <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm text-primary hover:underline">Edit</button>
                    <button className="text-sm text-danger hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
