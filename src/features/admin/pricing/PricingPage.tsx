import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';

interface ServicePrice {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
}

// Mock data for services
const MOCK_SERVICES: ServicePrice[] = [
  { id: '1', name: 'Septic Tank Pumping', description: 'Standard residential pumping service', price: 375, unit: 'per service' },
  { id: '2', name: 'Grease Trap Cleaning', description: 'Commercial grease trap service', price: 250, unit: 'per service' },
  { id: '3', name: 'Line Jetting', description: 'High-pressure line cleaning', price: 450, unit: 'per hour' },
  { id: '4', name: 'Camera Inspection', description: 'Video pipe inspection', price: 195, unit: 'per inspection' },
  { id: '5', name: 'Emergency Service', description: 'After-hours emergency call', price: 150, unit: 'additional fee' },
  { id: '6', name: 'Septic System Inspection', description: 'Full system evaluation', price: 350, unit: 'per inspection' },
  { id: '7', name: 'Riser Installation', description: 'Install access riser', price: 425, unit: 'per riser' },
  { id: '8', name: 'Filter Cleaning', description: 'Effluent filter service', price: 95, unit: 'per filter' },
];

export function PricingPage() {
  const [services, setServices] = useState<ServicePrice[]>(MOCK_SERVICES);
  const [editingService, setEditingService] = useState<ServicePrice | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successText, setSuccessText] = useState('');

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'per service',
  });

  const handleEditClick = useCallback((service: ServicePrice) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      unit: service.unit,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setFormData({ name: '', description: '', price: '', unit: 'per service' });
    setIsAddDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingService) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? { ...s, name: formData.name, description: formData.description, price: parseFloat(formData.price), unit: formData.unit }
            : s
        )
      );
      setIsEditDialogOpen(false);
      setEditingService(null);
      showSuccess('Service price updated successfully');
    }
  }, [editingService, formData]);

  const handleAddService = useCallback(() => {
    const newService: ServicePrice = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      unit: formData.unit,
    };
    setServices((prev) => [...prev, newService]);
    setIsAddDialogOpen(false);
    showSuccess('New service added successfully');
  }, [formData]);

  const showSuccess = (message: string) => {
    setSuccessText(message);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Pricing Configuration</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage service prices and rates
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowImportDialog(true)}>
            Import from Clover
          </Button>
          <Button onClick={handleAddClick}>+ Add Service</Button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-success/10 border border-success rounded-lg">
          <p className="text-success font-medium">{successText}</p>
        </div>
      )}

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Prices ({services.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Service</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Description</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Price</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Unit</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-bg-hover">
                  <td className="px-4 py-3 font-medium text-text-primary">{service.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{service.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-primary">${service.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-text-secondary">{service.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(service)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)}>
        <DialogContent>
          <DialogHeader onClose={() => setIsEditDialogOpen(false)}>
            Edit Service Price
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Service Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Price ($)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
        <DialogContent>
          <DialogHeader onClose={() => setIsAddDialogOpen(false)}>
            Add New Service
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-name">Service Name</Label>
                <Input
                  id="add-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Septic Inspection"
                />
              </div>
              <div>
                <Label htmlFor="add-description">Description</Label>
                <Input
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the service"
                />
              </div>
              <div>
                <Label htmlFor="add-price">Price ($)</Label>
                <Input
                  id="add-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="add-unit">Unit</Label>
                <Input
                  id="add-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                  placeholder="per service, per hour, etc."
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddService} disabled={!formData.name || !formData.price}>
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Clover Dialog */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setShowImportDialog(false)}>
            Import from Clover
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary mb-4">
              This will import service prices from your Clover POS system. Existing prices may be overwritten.
            </p>
            <p className="text-warning text-sm">
              Note: This feature requires Clover integration to be configured.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={() => setShowImportDialog(false)}>Start Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
