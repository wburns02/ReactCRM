import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface CompletionData {
  notes: string;
  photos: File[];
  signature: string | null;
}

/**
 * Step-by-step job completion flow for technicians
 */
export function JobCompletionFlow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<CompletionData>({
    notes: '',
    photos: [],
    signature: null,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/work-orders/${id}`, {
        status: 'completed',
        completion_notes: data.notes,
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] });
      navigate('/field');
    },
  });

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setData(prev => ({
        ...prev,
        photos: [...prev.photos, ...Array.from(files)],
      }));
    }
  };

  const removePhoto = (index: number) => {
    setData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleComplete = () => {
    completeMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-bg-body">
      {/* Header */}
      <div className="bg-bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Link to={`/field/job/${id}`} className="text-text-secondary">
            &larr; Cancel
          </Link>
          <h1 className="font-semibold text-text-primary">Complete Job</h1>
          <div className="w-16" />
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-medium text-text-primary mb-4">
              Step 1: Add Photos
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Capture photos of the completed work
            </p>

            <label className="block">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
                <span className="text-4xl block mb-2">📷</span>
                <span className="text-text-secondary">Tap to capture or upload photos</span>
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </label>

            {/* Photo Preview */}
            {data.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {data.photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-danger text-white rounded-full text-sm"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full mt-6 py-3 bg-primary text-white rounded-lg font-medium"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-medium text-text-primary mb-4">
              Step 2: Add Notes
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Describe the work performed
            </p>

            <textarea
              value={data.notes}
              onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter completion notes..."
              rows={6}
              className="w-full px-4 py-3 border border-border rounded-lg bg-bg-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-bg-card border border-border rounded-lg font-medium text-text-primary"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-medium text-text-primary mb-4">
              Step 3: Capture Signature
            </h2>
            <p className="text-sm text-text-muted mb-4">
              Get customer signature to confirm completion
            </p>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-bg-card">
              <span className="text-4xl block mb-2">✍️</span>
              <span className="text-text-muted">Signature capture coming soon</span>
            </div>

            <p className="text-xs text-text-muted mt-4 text-center">
              By signing, the customer confirms the work has been completed satisfactorily.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-bg-card border border-border rounded-lg font-medium text-text-primary"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="flex-1 py-3 bg-success text-white rounded-lg font-medium disabled:opacity-50"
              >
                {completeMutation.isPending ? 'Completing...' : 'Complete Job'}
              </button>
            </div>

            {/* Skip signature option */}
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="w-full mt-3 py-2 text-sm text-text-muted underline"
            >
              Complete without signature
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
