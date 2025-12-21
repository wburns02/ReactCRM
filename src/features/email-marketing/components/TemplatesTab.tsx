import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Textarea } from '@/components/ui/Textarea.tsx';
import { Label } from '@/components/ui/Label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  usePreviewTemplate,
} from '@/api/hooks/useEmailMarketing.ts';
import {
  TEMPLATE_CATEGORIES,
  type SubscriptionTier,
  type EmailTemplate,
} from '@/api/types/emailMarketing.ts';

interface TemplatesTabProps {
  tier: SubscriptionTier;
}

export function TemplatesTab({ tier }: TemplatesTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subject_template: '',
    body_html: '',
    body_text: '',
  });

  const { data: templates = [], isLoading } = useTemplates(categoryFilter || undefined);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const previewTemplate = usePreviewTemplate();

  const canCreate = tier !== 'none';

  // Separate system and custom templates
  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  const handleCreate = async () => {
    if (!formData.name || !formData.subject_template || !formData.body_html) return;

    try {
      await createTemplate.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({ name: '', category: '', subject_template: '', body_html: '', body_text: '' });
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    try {
      const result = await previewTemplate.mutateAsync({
        id: template.id,
        sampleData: {
          first_name: 'John',
          last_name: 'Doe',
          business_name: 'MAC Septic',
          months_since_service: '18',
        },
      });
      setPreviewHtml(result.preview || template.body_html);
    } catch {
      setPreviewHtml(template.body_html);
    }
    setIsPreviewOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setFormData({
      name: template.name,
      category: template.category || '',
      subject_template: template.subject_template,
      body_html: template.body_html,
      body_text: template.body_text || '',
    });
    setSelectedTemplate(template);
    setIsCreateOpen(true);
  };

  const handleSave = async () => {
    if (selectedTemplate && !selectedTemplate.is_system) {
      try {
        await updateTemplate.mutateAsync({
          id: selectedTemplate.id,
          template: formData,
        });
        setIsCreateOpen(false);
        setSelectedTemplate(null);
        setFormData({ name: '', category: '', subject_template: '', body_html: '', body_text: '' });
      } catch (err) {
        console.error('Failed to update template:', err);
      }
    } else {
      await handleCreate();
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-bg-muted rounded" />
        <div className="h-48 bg-bg-muted rounded" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All Categories</option>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </Select>
        <Button
          onClick={() => {
            setSelectedTemplate(null);
            setFormData({ name: '', category: '', subject_template: '', body_html: '', body_text: '' });
            setIsCreateOpen(true);
          }}
          disabled={!canCreate}
        >
          Create Template
        </Button>
      </div>

      {/* System Templates */}
      {systemTemplates.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Pre-built Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-text-primary">{template.name}</h4>
                      {template.category && (
                        <Badge variant="default" className="mt-1">
                          {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="success">System</Badge>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                    {template.subject_template}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handlePreview(template)}>
                      Preview
                    </Button>
                    {canCreate && (
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(template)}>
                        Duplicate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom Templates */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Custom Templates
        </h3>
        {customTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-text-secondary mb-4">
                No custom templates yet. Create one or duplicate a system template.
              </p>
              {canCreate && (
                <Button onClick={() => setIsCreateOpen(true)}>Create Template</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-text-primary">{template.name}</h4>
                      {template.category && (
                        <Badge variant="default" className="mt-1">
                          {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                    {template.subject_template}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handlePreview(template)}>
                      Preview
                    </Button>
                    {canCreate && (
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(template)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Template Modal */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setIsCreateOpen(false)}>
            {selectedTemplate && !selectedTemplate.is_system ? 'Edit Template' : 'Create Template'}
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Pumping Reminder"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select category</option>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="subject">Subject Line *</Label>
                <Input
                  id="subject"
                  value={formData.subject_template}
                  onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                  placeholder="e.g., Time for your septic pumping, {{first_name}}!"
                />
                <p className="text-xs text-text-muted mt-1">
                  Use {'{{variable}}'} for personalization
                </p>
              </div>
              <div>
                <Label htmlFor="body_html">Email Body (HTML) *</Label>
                <Textarea
                  id="body_html"
                  value={formData.body_html}
                  onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                  placeholder="Write your email content here..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="body_text">Plain Text Version</Label>
                <Textarea
                  id="body_text"
                  value={formData.body_text}
                  onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                  placeholder="Plain text version for email clients that don't support HTML"
                  rows={4}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.subject_template || !formData.body_html || createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)}>
        <DialogContent size="lg">
          <DialogHeader onClose={() => setIsPreviewOpen(false)}>
            Preview: {selectedTemplate?.name}
          </DialogHeader>
          <DialogBody>
            <div className="mb-4 p-3 bg-bg-muted rounded">
              <p className="text-sm text-text-muted">Subject:</p>
              <p className="font-medium text-text-primary">{selectedTemplate?.subject_template}</p>
            </div>
            <div
              className="border border-border rounded p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
