# RALPH WIGGUM WORK ORDERS UI COMPLETION
# Fix gaps between legacy HTML and new React implementation
# Run with: /ralph-loop workorders-ui-fix.md

---

## PHASE 1: GAP ANALYSIS
### Completion Promise: GAP_ANALYSIS_COMPLETE

#### AGENT 1.1: Compare Legacy vs React
```prompt
GAP ANALYSIS AGENT: Compare the legacy Work Orders UI with the new React implementation.

LEGACY FEATURES (from workorders.html):
The legacy Edit Work Order modal has 6 tabs with rich content:

1. DETAILS TAB:
   - Customer dropdown with quick-add button (+)
   - Customer preview card showing address/phone
   - Job Type dropdown (pumping, inspection, repair, etc.)
   - Priority dropdown with color coding
   - Status dropdown with full workflow
   - Notes textarea

2. SCHEDULE TAB:
   - Manual scheduling: Date picker, Time slot dropdown, Technician dropdown, Duration input
   - Smart Scheduling: "Get AI Suggestions" button
   - Schedule suggestions panel
   - Conflict detection warnings

3. DOCUMENTATION TAB:
   - Required Photos checklist with capture buttons:
     - Before Service [Required] [Capture]
     - After Service [Required] [Capture]
     - Waste Manifest [Required] [Capture]
   - Photo Gallery grid showing captured photos
   - Customer Signature pad with Clear/Save buttons
   - Technician Signature pad with Clear/Save buttons

4. COMMUNICATION TAB:
   - Customer Notifications buttons:
     - Send Reminder
     - Tech En Route
     - Service Complete
   - Two-Way SMS conversation thread
   - SMS input with send button
   - Communication History log

5. PAYMENT TAB:
   - Invoice Preview section
   - Generate Invoice button
   - Payment Processing buttons:
     - Card Payment
     - Send Payment Link
     - Offer Financing
     - Cash/Check
   - Payment Status indicator

6. HISTORY TAB:
   - Timeline of all work order events
   - Status changes with timestamps
   - Activity log

REACT IMPLEMENTATION (from screenshots):
- Edit modal has tabs but content is minimal
- Detail page shows basic cards but missing:
  - Photo capture UI
  - Signature pads
  - SMS conversation
  - Payment buttons
  - Rich timeline

TASK: Review src/features/work-orders/ and document exactly what's missing.

```bash
find src/features/work-orders -name "*.tsx" | head -30
cat src/features/work-orders/components/WorkOrderForm.tsx
cat src/features/work-orders/pages/WorkOrderDetail.tsx
```

OUTPUT: Save gap list to docs/workorders-gaps.md

Output "GAP_ANALYSIS_COMPLETE" when done.
```

---

## PHASE 2: DETAILS TAB ENHANCEMENT
### Completion Promise: DETAILS_TAB_COMPLETE
### Depends On: GAP_ANALYSIS_COMPLETE

#### AGENT 2.1: Customer Selection Enhancement
```prompt
CUSTOMER SELECT AGENT: Enhance the customer selection in Work Order form.

REQUIREMENTS:
1. Customer dropdown with search/filter
2. Quick-add customer button (+) that opens modal
3. Customer preview card when selected showing:
   - Name, Phone, Email
   - Service Address
   - Account status
   - Last service date
   - Link to full customer profile

IMPLEMENTATION:

```tsx
// src/features/work-orders/components/CustomerSelect.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Command, 
  CommandInput, 
  CommandList, 
  CommandItem 
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, User, Phone, MapPin, Calendar } from 'lucide-react';
import { useCustomers } from '@/features/customers/hooks/useCustomers';

interface CustomerSelectProps {
  value?: string;
  onChange: (customerId: string) => void;
  onAddNew?: () => void;
}

export function CustomerSelect({ value, onChange, onAddNew }: CustomerSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: customers, isLoading } = useCustomers();
  
  const selectedCustomer = customers?.find(c => c.id === value);
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-1 justify-start">
              {selectedCustomer 
                ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                : "Select customer..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Search customers..." />
              <CommandList>
                {customers?.map(customer => (
                  <CommandItem
                    key={customer.id}
                    onSelect={() => {
                      onChange(customer.id);
                      setOpen(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">
                        {customer.first_name} {customer.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer.city}, {customer.state}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Button variant="outline" size="icon" onClick={onAddNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Customer Preview Card */}
      {selectedCustomer && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {selectedCustomer.first_name} {selectedCustomer.last_name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{selectedCustomer.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zip}
            </span>
          </div>
          {selectedCustomer.last_service_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Last service: {selectedCustomer.last_service_date}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Update WorkOrderForm.tsx to use this component.

Output "CUSTOMER_SELECT_COMPLETE" when done.
```

---

## PHASE 3: DOCUMENTATION TAB - FULL BUILD
### Completion Promise: DOCUMENTATION_TAB_COMPLETE
### Depends On: DETAILS_TAB_COMPLETE

#### AGENT 3.1: Photo Capture Section
```prompt
PHOTO CAPTURE AGENT: Build the complete photo documentation section.

REQUIREMENTS (matching legacy):
1. Required Photos Checklist:
   - Before Service [Required badge] [Capture button]
   - After Service [Required badge] [Capture button]  
   - Waste Manifest [Required badge] [Capture button]
   - Checkbox marks when photo captured

2. Photo Gallery:
   - Grid of captured photo thumbnails
   - Click to view fullscreen
   - Delete button on each
   - Photo type badge overlay

3. Camera Capture:
   - Live camera preview (getUserMedia)
   - Switch front/back camera
   - Capture button
   - Preview before accepting
   - Retake option
   - GPS + timestamp watermark

IMPLEMENTATION:

```tsx
// src/features/work-orders/components/Documentation/PhotoSection.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Camera, Trash2, Maximize2, CheckCircle } from 'lucide-react';
import { PhotoCapture } from './PhotoCapture';
import { PhotoGallery } from './PhotoGallery';

interface Photo {
  id: string;
  type: 'before' | 'after' | 'manifest' | 'other';
  data: string;
  thumbnail: string;
  timestamp: string;
  gps?: { lat: number; lng: number };
}

interface PhotoSectionProps {
  workOrderId: string;
  photos: Photo[];
  onPhotoCapture: (photo: Photo) => void;
  onPhotoDelete: (photoId: string) => void;
}

const REQUIRED_PHOTOS = [
  { type: 'before', label: 'Before Service', required: true },
  { type: 'after', label: 'After Service', required: true },
  { type: 'manifest', label: 'Waste Manifest', required: true },
] as const;

export function PhotoSection({ 
  workOrderId, 
  photos, 
  onPhotoCapture, 
  onPhotoDelete 
}: PhotoSectionProps) {
  const [captureType, setCaptureType] = useState<string | null>(null);
  
  const hasPhoto = (type: string) => photos.some(p => p.type === type);
  
  return (
    <div className="space-y-6">
      {/* Required Photos Checklist */}
      <div>
        <h4 className="font-semibold mb-3">Required Photos</h4>
        <div className="space-y-2">
          {REQUIRED_PHOTOS.map(({ type, label, required }) => (
            <div 
              key={type}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={hasPhoto(type)} disabled />
                <span className={hasPhoto(type) ? 'line-through text-muted-foreground' : ''}>
                  {label}
                </span>
                {required && (
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                )}
                {hasPhoto(type) && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <Button 
                size="sm" 
                onClick={() => setCaptureType(type)}
                variant={hasPhoto(type) ? 'outline' : 'default'}
              >
                <Camera className="h-4 w-4 mr-2" />
                {hasPhoto(type) ? 'Retake' : 'Capture'}
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Photo Gallery */}
      <div>
        <h4 className="font-semibold mb-3">Photo Gallery</h4>
        {photos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No photos captured yet
          </div>
        ) : (
          <PhotoGallery 
            photos={photos} 
            onDelete={onPhotoDelete}
          />
        )}
      </div>
      
      {/* Camera Modal */}
      {captureType && (
        <PhotoCapture
          photoType={captureType}
          onCapture={(photo) => {
            onPhotoCapture({ ...photo, type: captureType as Photo['type'] });
            setCaptureType(null);
          }}
          onClose={() => setCaptureType(null)}
        />
      )}
    </div>
  );
}
```

Also create PhotoCapture.tsx with live camera and PhotoGallery.tsx with grid display.

Output "PHOTO_SECTION_COMPLETE" when done.
```

#### AGENT 3.2: Signature Capture Section
```prompt
SIGNATURE CAPTURE AGENT: Build the signature capture section.

REQUIREMENTS (matching legacy):
1. Customer Signature:
   - Canvas signature pad
   - Touch and mouse support
   - Clear button
   - Save button
   - Show saved signature if exists

2. Technician Signature:
   - Same as customer
   - Separate storage

IMPLEMENTATION:

```tsx
// src/features/work-orders/components/Documentation/SignatureSection.tsx

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Save, Check } from 'lucide-react';
import SignaturePad from 'signature_pad';

interface SignatureSectionProps {
  customerSignature?: string;
  technicianSignature?: string;
  onSaveCustomer: (data: string) => void;
  onSaveTechnician: (data: string) => void;
}

function SignatureCapture({ 
  label, 
  existingSignature, 
  onSave 
}: { 
  label: string;
  existingSignature?: string;
  onSave: (data: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isSaved, setIsSaved] = useState(!!existingSignature);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);
    
    padRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });
    
    if (existingSignature) {
      padRef.current.fromDataURL(existingSignature);
    }
    
    return () => {
      padRef.current?.off();
    };
  }, [existingSignature]);
  
  const handleClear = () => {
    padRef.current?.clear();
    setIsSaved(false);
  };
  
  const handleSave = () => {
    if (!padRef.current || padRef.current.isEmpty()) {
      alert('Please provide a signature first');
      return;
    }
    onSave(padRef.current.toDataURL('image/png'));
    setIsSaved(true);
  };
  
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          {label}
          {isSaved && (
            <span className="text-green-500 flex items-center gap-1 text-xs">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="border rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-32 touch-none cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Eraser className="h-4 w-4 mr-1" /> Clear
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SignatureSection({
  customerSignature,
  technicianSignature,
  onSaveCustomer,
  onSaveTechnician,
}: SignatureSectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Digital Signatures</h4>
      <div className="grid md:grid-cols-2 gap-4">
        <SignatureCapture
          label="Customer Signature"
          existingSignature={customerSignature}
          onSave={onSaveCustomer}
        />
        <SignatureCapture
          label="Technician Signature"
          existingSignature={technicianSignature}
          onSave={onSaveTechnician}
        />
      </div>
    </div>
  );
}
```

Output "SIGNATURE_SECTION_COMPLETE" when done.
```

---

## PHASE 4: COMMUNICATION TAB - FULL BUILD
### Completion Promise: COMMUNICATION_TAB_COMPLETE
### Depends On: DOCUMENTATION_TAB_COMPLETE

#### AGENT 4.1: Notification Buttons
```prompt
NOTIFICATION AGENT: Build customer notification buttons section.

REQUIREMENTS (matching legacy):
1. Quick notification buttons:
   - Send Reminder (bell icon, primary)
   - Tech En Route (truck icon, info)
   - Service Complete (check icon, success)

2. Each button triggers API call and shows toast

IMPLEMENTATION:

```tsx
// src/features/work-orders/components/Communication/NotificationButtons.tsx

import { Button } from '@/components/ui/button';
import { Bell, Truck, CheckCircle, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendNotification } from '../../api/communicationsApi';

interface NotificationButtonsProps {
  workOrderId: string;
  customerPhone: string;
}

export function NotificationButtons({ workOrderId, customerPhone }: NotificationButtonsProps) {
  const mutation = useMutation({
    mutationFn: (type: string) => sendNotification(workOrderId, type),
    onSuccess: (_, type) => {
      toast.success(`${type} notification sent to ${customerPhone}`);
    },
    onError: () => {
      toast.error('Failed to send notification');
    },
  });
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Customer Notifications</h4>
      <div className="grid gap-2">
        <Button 
          className="w-full justify-start" 
          onClick={() => mutation.mutate('reminder')}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Bell className="h-4 w-4 mr-2" />
          )}
          Send Reminder
        </Button>
        <Button 
          variant="secondary"
          className="w-full justify-start" 
          onClick={() => mutation.mutate('enroute')}
          disabled={mutation.isPending}
        >
          <Truck className="h-4 w-4 mr-2" />
          Tech En Route
        </Button>
        <Button 
          variant="outline"
          className="w-full justify-start text-green-600 border-green-600 hover:bg-green-50" 
          onClick={() => mutation.mutate('complete')}
          disabled={mutation.isPending}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Service Complete
        </Button>
      </div>
    </div>
  );
}
```

Output "NOTIFICATION_BUTTONS_COMPLETE" when done.
```

#### AGENT 4.2: SMS Conversation Thread
```prompt
SMS CONVERSATION AGENT: Build two-way SMS conversation UI.

REQUIREMENTS (matching legacy):
1. Message thread display:
   - Sent messages on right (blue)
   - Received messages on left (gray)
   - Timestamps on each
   - Auto-scroll to bottom

2. Message input:
   - Text input field
   - Send button
   - Character count

IMPLEMENTATION:

```tsx
// src/features/work-orders/components/Communication/SMSConversation.tsx

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSMSMessages, sendSMS } from '../../api/communicationsApi';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  timestamp: string;
}

interface SMSConversationProps {
  workOrderId: string;
  customerPhone: string;
}

export function SMSConversation({ workOrderId, customerPhone }: SMSConversationProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['sms', workOrderId],
    queryFn: () => getSMSMessages(workOrderId),
    refetchInterval: 10000, // Poll every 10s for new messages
  });
  
  const sendMutation = useMutation({
    mutationFn: (body: string) => sendSMS(workOrderId, customerPhone, body),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['sms', workOrderId] });
    },
  });
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold">Two-Way SMS</h4>
      
      {/* Message Thread */}
      <div className="h-64 overflow-y-auto border rounded-lg bg-gray-50 p-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No messages yet
          </div>
        ) : (
          messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                msg.direction === 'outbound'
                  ? 'ml-auto bg-blue-500 text-white rounded-br-none'
                  : 'bg-white border rounded-bl-none'
              )}
            >
              <p>{msg.body}</p>
              <p className={cn(
                'text-xs mt-1',
                msg.direction === 'outbound' ? 'text-blue-100' : 'text-muted-foreground'
              )}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={160}
        />
        <Button 
          onClick={handleSend} 
          disabled={!message.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-right">
        {message.length}/160 characters
      </p>
    </div>
  );
}
```

Output "SMS_CONVERSATION_COMPLETE" when done.
```

---

## PHASE 5: PAYMENT TAB - FULL BUILD
### Completion Promise: PAYMENT_TAB_COMPLETE
### Depends On: COMMUNICATION_TAB_COMPLETE

#### AGENT 5.1: Payment Processing Section
```prompt
PAYMENT SECTION AGENT: Build the payment processing UI.

REQUIREMENTS (matching legacy):
1. Invoice Preview:
   - Line items table
   - Subtotal, Tax, Total
   - Generate Invoice button

2. Payment Processing Buttons:
   - Card Payment (green, credit card icon)
   - Send Payment Link (blue, link icon)
   - Offer Financing (yellow, calendar icon)
   - Cash/Check (gray, cash icon)

3. Payment Status:
   - Current status badge
   - Amount due/paid

IMPLEMENTATION:

```tsx
// src/features/work-orders/components/Payment/PaymentSection.tsx

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Link2, 
  Calendar, 
  Banknote,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PaymentSectionProps {
  workOrderId: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  amountPaid: number;
}

export function PaymentSection({
  workOrderId,
  lineItems,
  subtotal,
  tax,
  total,
  paymentStatus,
  amountPaid,
}: PaymentSectionProps) {
  
  const processPayment = useMutation({
    mutationFn: async (method: string) => {
      // API call to process payment
      const response = await fetch(`/api/work-orders/${workOrderId}/payment`, {
        method: 'POST',
        body: JSON.stringify({ method }),
      });
      return response.json();
    },
    onSuccess: (data, method) => {
      if (method === 'link') {
        navigator.clipboard.writeText(data.paymentLink);
        toast.success('Payment link copied to clipboard!');
      } else {
        toast.success('Payment processed successfully');
      }
    },
  });

  const statusBadge = {
    unpaid: { label: 'Unpaid', variant: 'destructive' as const, icon: AlertCircle },
    partial: { label: 'Partial', variant: 'warning' as const, icon: Clock },
    paid: { label: 'Paid', variant: 'success' as const, icon: CheckCircle },
    refunded: { label: 'Refunded', variant: 'secondary' as const, icon: Banknote },
  }[paymentStatus];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Invoice Preview */}
      <div className="space-y-4">
        <h4 className="font-semibold">Invoice Details</h4>
        <Card>
          <CardContent className="pt-4">
            {lineItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No invoice generated yet
              </p>
            ) : (
              <div className="space-y-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{item.description}</td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">${item.unitPrice.toFixed(2)}</td>
                        <td className="text-right py-2">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Button className="w-full">
          <FileText className="h-4 w-4 mr-2" />
          Generate Invoice
        </Button>
      </div>
      
      {/* Payment Processing */}
      <div className="space-y-4">
        <h4 className="font-semibold">Payment Processing</h4>
        
        <div className="grid gap-2">
          <Button 
            className="w-full justify-start bg-green-600 hover:bg-green-700"
            onClick={() => processPayment.mutate('card')}
            disabled={processPayment.isPending}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Card Payment
          </Button>
          
          <Button 
            className="w-full justify-start"
            onClick={() => processPayment.mutate('link')}
            disabled={processPayment.isPending}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Send Payment Link
          </Button>
          
          <Button 
            variant="outline"
            className="w-full justify-start text-yellow-600 border-yellow-600 hover:bg-yellow-50"
            onClick={() => processPayment.mutate('financing')}
            disabled={processPayment.isPending}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Offer Financing
          </Button>
          
          <Button 
            variant="secondary"
            className="w-full justify-start"
            onClick={() => processPayment.mutate('cash')}
            disabled={processPayment.isPending}
          >
            <Banknote className="h-4 w-4 mr-2" />
            Cash/Check
          </Button>
        </div>
        
        {/* Payment Status */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusBadge.variant}>
                <statusBadge.icon className="h-3 w-3 mr-1" />
                {statusBadge.label}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <div>Amount Due: ${(total - amountPaid).toFixed(2)}</div>
              <div>Amount Paid: ${amountPaid.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

Output "PAYMENT_SECTION_COMPLETE" when done.
```

---

## PHASE 6: WORK ORDER DETAIL PAGE ENHANCEMENT
### Completion Promise: DETAIL_PAGE_COMPLETE
### Depends On: PAYMENT_TAB_COMPLETE

#### AGENT 6.1: Full Detail Page Layout
```prompt
DETAIL PAGE AGENT: Enhance the Work Order Detail page to match legacy richness.

REQUIREMENTS (from Image 2 vs legacy):
Current React shows basic cards. Need to add:
1. Better status workflow visualization (already has dots but improve)
2. Quick action buttons (Edit, Delete, Print, Duplicate)
3. Collapsible sections
4. Activity feed/timeline in sidebar
5. Integration with new components

UPDATE: src/features/work-orders/pages/WorkOrderDetail.tsx

Layout should be:
- Left (2/3): Customer, Location, Notes, Photos, Signatures
- Right (1/3): Status Workflow, Schedule, Assignment, Job Details, Actions

Add tabbed view option to switch between:
- Overview (current card layout)
- Edit mode (full form with tabs like legacy modal)

```tsx
// Add to WorkOrderDetail.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoSection } from '../components/Documentation/PhotoSection';
import { SignatureSection } from '../components/Documentation/SignatureSection';
import { SMSConversation } from '../components/Communication/SMSConversation';
import { PaymentSection } from '../components/Payment/PaymentSection';
import { WorkOrderTimeline } from '../components/WorkOrderTimeline';

// In the component:
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="documentation">Documentation</TabsTrigger>
    <TabsTrigger value="communication">Communication</TabsTrigger>
    <TabsTrigger value="payment">Payment</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Current card layout */}
  </TabsContent>
  
  <TabsContent value="documentation">
    <PhotoSection ... />
    <SignatureSection ... />
  </TabsContent>
  
  <TabsContent value="communication">
    <NotificationButtons ... />
    <SMSConversation ... />
  </TabsContent>
  
  <TabsContent value="payment">
    <PaymentSection ... />
  </TabsContent>
  
  <TabsContent value="history">
    <WorkOrderTimeline ... />
  </TabsContent>
</Tabs>
```

Output "DETAIL_PAGE_COMPLETE" when done.
```

---

## PHASE 7: VERIFICATION & CLEANUP
### Completion Promise: WORKORDERS_UI_COMPLETE

#### AGENT 7.1: Final Verification
```prompt
VERIFICATION AGENT: Verify all Work Order UI components are complete.

CHECKLIST:
[ ] Details Tab
    [ ] Customer select with search
    [ ] Quick-add customer button
    [ ] Customer preview card
    [ ] Job type dropdown
    [ ] Priority dropdown (color coded)
    [ ] Status dropdown
    [ ] Notes textarea

[ ] Schedule Tab
    [ ] Date picker
    [ ] Time slot dropdown
    [ ] Technician dropdown
    [ ] Duration input
    [ ] Smart scheduling button

[ ] Documentation Tab
    [ ] Required photos checklist
    [ ] Photo capture with camera
    [ ] Photo gallery
    [ ] Customer signature pad
    [ ] Technician signature pad

[ ] Communication Tab
    [ ] Send Reminder button
    [ ] Tech En Route button
    [ ] Service Complete button
    [ ] SMS conversation thread
    [ ] SMS input/send

[ ] Payment Tab
    [ ] Invoice preview with line items
    [ ] Generate Invoice button
    [ ] Card Payment button
    [ ] Send Payment Link button
    [ ] Offer Financing button
    [ ] Cash/Check button
    [ ] Payment status display

[ ] History Tab
    [ ] Timeline of events
    [ ] Status changes
    [ ] Activity log

[ ] Detail Page
    [ ] Tabbed navigation works
    [ ] All sections render
    [ ] API integration functional
    [ ] Mobile responsive

RUN: 
```bash
npm run build
npm run test
```

Fix any errors found.

OUTPUT: Final status report to docs/workorders-completion.md

Output "WORKORDERS_UI_COMPLETE" when done.
```

---

# COMPLETION VERIFICATION

When all phases complete, output:

```
WORKORDERS_UI_COMPLETE
WORKORDERS_UI_COMPLETE  
WORKORDERS_UI_COMPLETE

Work Orders UI now matches legacy functionality:
✓ Photo capture with live camera
✓ Digital signatures
✓ SMS conversations
✓ Payment processing
✓ Full timeline history
✓ Rich tabbed interface

Ready for testing at: https://react.ecbtx.com/work-orders
```
