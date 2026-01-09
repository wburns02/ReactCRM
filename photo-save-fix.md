# RALPH WIGGUM PHOTO SAVE DEBUG & FIX
# Work Orders - Photos capture but don't persist
# Run with: /ralph-loop photo-save-fix.md

---

## PHASE 1: INVESTIGATE PHOTO FLOW
### Completion Promise: PHOTO_FLOW_INVESTIGATED

#### AGENT 1.1: Trace Frontend Photo Code
```prompt
PHOTO DEBUG AGENT: Trace the photo capture and save flow in the frontend.

TASKS:
1. Find all photo-related files:
```bash
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l -i "photo\|camera\|capture" | head -20
grep -r "capturePhoto\|onCapture\|savePhoto\|uploadPhoto" src/ --include="*.tsx" --include="*.ts" | head -30
```

2. Read the PhotoCapture component:
```bash
cat src/features/work-orders/components/Documentation/PhotoCapture.tsx 2>/dev/null || \
cat src/features/work-orders/components/PhotoCapture/PhotoCapture.tsx 2>/dev/null || \
find src -name "PhotoCapture.tsx" -exec cat {} \;
```

3. Find where photos are submitted/saved:
```bash
grep -r "photo" src/features/work-orders/api/ --include="*.ts"
grep -r "attachment\|upload\|multipart" src/features/work-orders/ --include="*.ts"
```

4. Check the WorkOrderForm or parent component handling photo state:
```bash
grep -rn "photos\|setPhotos\|onPhotoCapture" src/features/work-orders/ --include="*.tsx" | head -20
```

5. Look for API calls related to photos:
```bash
grep -r "\/photos\|\/attachments\|\/upload" src/ --include="*.ts" --include="*.tsx" | head -20
```

IDENTIFY:
- Where does captured photo data go after capture?
- Is there an API call to save it?
- Is the API call being triggered?
- What's the endpoint URL?

OUTPUT: Save findings to docs/debug/photo-flow.md

Output "PHOTO_FLOW_INVESTIGATED" when done.
```

#### AGENT 1.2: Check Network Requests
```prompt
NETWORK DEBUG AGENT: Add console logging to trace photo save requests.

TASKS:
1. Find the photo upload/save function and add logging:

```typescript
// Add to the photo save function (wherever it is)
console.log('[Photo Debug] Attempting to save photo:', {
  workOrderId,
  photoType,
  dataLength: photoData?.length,
  timestamp: new Date().toISOString()
});

// Before API call
console.log('[Photo Debug] Making API request to:', endpoint);

// After API call
console.log('[Photo Debug] API response:', response);
```

2. Check if mutation/API function exists:
```bash
grep -rn "useMutation\|mutate\|mutateAsync" src/features/work-orders/ --include="*.tsx" | grep -i photo
```

3. Verify API endpoint exists in api file:
```bash
cat src/features/work-orders/api/workOrderApi.ts 2>/dev/null || \
cat src/features/work-orders/api/index.ts 2>/dev/null || \
find src/features/work-orders -name "*api*.ts" -exec cat {} \;
```

4. Check if photos are stored in component state vs sent to API:
```bash
grep -rn "useState.*photo\|photos.*useState" src/features/work-orders/ --include="*.tsx"
```

LIKELY ISSUES:
- Photo stored in local state but never sent to API
- API endpoint doesn't exist
- API call fails silently (no error handling)
- Photo saved to wrong work order ID
- Base64 data too large, request fails

OUTPUT: Add debug logging and document findings

Output "NETWORK_DEBUG_COMPLETE" when done.
```

---

## PHASE 2: CHECK BACKEND ENDPOINT
### Completion Promise: BACKEND_CHECKED
### Depends On: PHOTO_FLOW_INVESTIGATED

#### AGENT 2.1: Verify API Endpoint Exists
```prompt
BACKEND CHECK AGENT: Verify the photo upload endpoint exists and works.

TASKS:
1. Check FastAPI routes for photo/attachment endpoints:
```bash
find . -name "*.py" | xargs grep -l "photo\|attachment\|upload" | head -10
grep -rn "@router.post.*photo\|@router.post.*attachment\|@app.post.*photo" . --include="*.py"
```

2. Look at work order router:
```bash
cat src/api/work_orders/router.py 2>/dev/null || \
cat app/api/routes/work_orders.py 2>/dev/null || \
find . -path "*/api/*" -name "*.py" | xargs grep -l "work.order" | head -5 | xargs cat
```

3. Test the endpoint with curl:
```bash
# Get a valid token first (or use existing one)
TOKEN="your_auth_token"
WORK_ORDER_ID="test-id"

# Test if endpoint exists
curl -X POST "https://api.ecbtx.com/api/work-orders/${WORK_ORDER_ID}/photos" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":"data:image/png;base64,iVBORw0KGgo="}' \
  -v 2>&1 | head -50
```

4. Check if endpoint expects multipart/form-data vs JSON:
```bash
grep -rn "File\|UploadFile\|form-data\|multipart" . --include="*.py" | grep -i photo
```

POSSIBLE FINDINGS:
- Endpoint returns 404 (doesn't exist)
- Endpoint returns 405 (wrong HTTP method)
- Endpoint returns 422 (validation error - wrong data format)
- Endpoint returns 401 (auth issue)
- Endpoint returns 500 (server error)

OUTPUT: Document endpoint status and any errors

Output "BACKEND_CHECKED" when done.
```

---

## PHASE 3: FIX THE ISSUE
### Completion Promise: PHOTO_SAVE_FIXED
### Depends On: BACKEND_CHECKED

#### AGENT 3.1: Implement Photo Save (if missing)
```prompt
PHOTO SAVE FIX AGENT: Implement or fix the photo save functionality.

BASED ON INVESTIGATION, apply the appropriate fix:

### FIX A: If API call is missing in frontend

Add to workOrderApi.ts:
```typescript
// src/features/work-orders/api/workOrderApi.ts

export async function uploadWorkOrderPhoto(
  workOrderId: string,
  photo: {
    type: string;
    data: string; // base64
    timestamp: string;
    gps?: { lat: number; lng: number };
  }
): Promise<{ id: string; url: string }> {
  const response = await api.post(`/work-orders/${workOrderId}/photos`, photo);
  return response.data;
}

export async function getWorkOrderPhotos(workOrderId: string): Promise<Photo[]> {
  const response = await api.get(`/work-orders/${workOrderId}/photos`);
  return response.data;
}

export async function deleteWorkOrderPhoto(
  workOrderId: string, 
  photoId: string
): Promise<void> {
  await api.delete(`/work-orders/${workOrderId}/photos/${photoId}`);
}
```

### FIX B: If mutation hook is missing

Add to photo component or create hook:
```typescript
// src/features/work-orders/hooks/useWorkOrderPhotos.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadWorkOrderPhoto, getWorkOrderPhotos, deleteWorkOrderPhoto } from '../api/workOrderApi';
import { toast } from 'sonner';

export function useWorkOrderPhotos(workOrderId: string) {
  const queryClient = useQueryClient();
  
  const photosQuery = useQuery({
    queryKey: ['workOrderPhotos', workOrderId],
    queryFn: () => getWorkOrderPhotos(workOrderId),
    enabled: !!workOrderId,
  });
  
  const uploadMutation = useMutation({
    mutationFn: (photo: { type: string; data: string; timestamp: string }) => 
      uploadWorkOrderPhoto(workOrderId, photo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrderPhotos', workOrderId] });
      toast.success('Photo saved successfully');
    },
    onError: (error) => {
      console.error('[Photo Save Error]', error);
      toast.error('Failed to save photo');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deleteWorkOrderPhoto(workOrderId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrderPhotos', workOrderId] });
      toast.success('Photo deleted');
    },
  });
  
  return {
    photos: photosQuery.data ?? [],
    isLoading: photosQuery.isLoading,
    uploadPhoto: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deletePhoto: deleteMutation.mutate,
  };
}
```

### FIX C: If PhotoCapture doesn't call the save

Update PhotoCapture to actually save:
```typescript
// In PhotoCapture.tsx - ensure onCapture triggers API call

function PhotoCapture({ workOrderId, photoType, onCapture }) {
  const { uploadPhoto, isUploading } = useWorkOrderPhotos(workOrderId);
  
  const handleAccept = async () => {
    if (!capturedImage) return;
    
    const photoData = {
      type: photoType,
      data: capturedImage,
      timestamp: new Date().toISOString(),
      gps: currentPosition,
    };
    
    // THIS IS THE KEY - actually call the API
    uploadPhoto(photoData, {
      onSuccess: (savedPhoto) => {
        onCapture(savedPhoto); // Notify parent
        setMode('idle');
        setCapturedImage(null);
      },
    });
  };
  
  // ... rest of component
}
```

### FIX D: If backend endpoint is missing

Create FastAPI endpoint:
```python
# In work_orders router

from fastapi import APIRouter, UploadFile, File, Depends
from typing import Optional
import base64
import uuid

@router.post("/{work_order_id}/photos")
async def upload_photo(
    work_order_id: str,
    photo_data: PhotoUpload,  # Pydantic model
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate work order exists
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Save photo
    photo = WorkOrderPhoto(
        id=str(uuid.uuid4()),
        work_order_id=work_order_id,
        type=photo_data.type,
        data=photo_data.data,  # Store base64 or save to S3
        timestamp=photo_data.timestamp,
        gps_lat=photo_data.gps.lat if photo_data.gps else None,
        gps_lng=photo_data.gps.lng if photo_data.gps else None,
    )
    db.add(photo)
    db.commit()
    
    return {"id": photo.id, "url": f"/api/work-orders/{work_order_id}/photos/{photo.id}"}
```

OUTPUT: Apply the appropriate fix(es) based on investigation findings.

Output "PHOTO_SAVE_FIXED" when done.
```

---

## PHASE 4: ADD ERROR HANDLING & FEEDBACK
### Completion Promise: ERROR_HANDLING_ADDED
### Depends On: PHOTO_SAVE_FIXED

#### AGENT 4.1: Add User Feedback
```prompt
ERROR HANDLING AGENT: Add proper loading states and error feedback.

TASKS:
1. Add loading indicator while saving:
```typescript
// In PhotoCapture component
{isUploading && (
  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
    <div className="text-white flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span>Saving photo...</span>
    </div>
  </div>
)}
```

2. Add error display:
```typescript
// After failed upload
{uploadError && (
  <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
    Failed to save photo: {uploadError.message}
    <Button variant="link" onClick={retry}>Retry</Button>
  </div>
)}
```

3. Add success confirmation:
```typescript
// Use toast notifications
toast.success('Photo saved!', {
  description: `${photoType} photo uploaded successfully`,
});
```

4. Handle offline scenario:
```typescript
// Check if online before upload
if (!navigator.onLine) {
  // Queue for later
  queueOfflinePhoto(photoData);
  toast.info('Photo saved offline', {
    description: 'Will upload when connection restored',
  });
  return;
}
```

5. Add console logging for debugging:
```typescript
console.log('[Photo] Capture complete:', { photoType, dataLength: data.length });
console.log('[Photo] Uploading to work order:', workOrderId);
console.log('[Photo] Upload response:', response);
```

OUTPUT: Implement error handling and feedback

Output "ERROR_HANDLING_ADDED" when done.
```

---

## PHASE 5: TEST & VERIFY
### Completion Promise: PHOTO_SAVE_VERIFIED

#### AGENT 5.1: End-to-End Test
```prompt
TEST AGENT: Verify photo capture and save works end-to-end.

TASKS:
1. Build and check for errors:
```bash
npm run build 2>&1 | grep -i error
npm run lint 2>&1 | grep -i error
```

2. Manual test checklist:
   [ ] Open Work Order detail or edit modal
   [ ] Click Documentation tab
   [ ] Click "Capture" on "Before Service"
   [ ] Camera opens (or file picker)
   [ ] Take/select photo
   [ ] Click "Use Photo" / Accept
   [ ] Loading indicator shows
   [ ] Success toast appears
   [ ] Photo appears in gallery
   [ ] Refresh page
   [ ] Photo still shows (persisted)

3. Check browser console for:
   [ ] No red errors during capture
   [ ] No red errors during save
   [ ] Network request to /photos endpoint
   [ ] 200/201 response from API

4. Check network tab:
```
Request URL: https://api.ecbtx.com/api/work-orders/{id}/photos
Request Method: POST
Status Code: 201 Created (or 200 OK)
Response: { "id": "...", "url": "..." }
```

5. Verify in database (if accessible):
```sql
SELECT * FROM work_order_photos WHERE work_order_id = 'xxx' ORDER BY created_at DESC LIMIT 5;
```

OUTPUT: Test results report

Output "PHOTO_SAVE_VERIFIED" when done.
```

---

## PHASE 6: CLEAN UP DEBUG CODE
### Completion Promise: PHOTO_SAVE_COMPLETE

#### AGENT 6.1: Remove Debug Logging
```prompt
CLEANUP AGENT: Remove excessive debug logging, keep essential error logging.

TASKS:
1. Remove temporary console.logs added for debugging
2. Keep error logging with proper levels:
```typescript
// Keep these
console.error('[Photo] Upload failed:', error);

// Remove these
console.log('[Photo Debug] Attempting to save...');
```

3. Ensure toast messages are user-friendly
4. Commit changes:
```bash
git add -A
git commit -m "fix(work-orders): Photo capture now saves to backend

- Added uploadWorkOrderPhoto API function
- Created useWorkOrderPhotos hook with React Query
- PhotoCapture now calls API on accept
- Added loading state and error handling
- Photos persist across page refresh

Fixes: Photos capture but don't save"

git push
```

OUTPUT: Clean commit pushed

Output "PHOTO_SAVE_COMPLETE" when done.
```

---

# COMPLETION VERIFICATION

When all phases complete, output:

```
PHOTO_SAVE_COMPLETE
PHOTO_SAVE_COMPLETE
PHOTO_SAVE_COMPLETE

Photo save issue resolved:
✓ Identified missing API call / endpoint
✓ Implemented photo upload function
✓ Added useWorkOrderPhotos hook
✓ Connected PhotoCapture to API
✓ Added loading states and error handling
✓ Verified photos persist after refresh
✓ Cleaned up debug code

Test at: https://react.ecbtx.com/work-orders/{id}
1. Open any work order
2. Go to Documentation tab
3. Capture a photo
4. Verify it saves and persists
```
