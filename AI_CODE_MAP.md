# ReactCRM AI Integration Code Map

**For R730 Claude** - Complete reference of AI-related files

Last updated: 2026-01-13

## Overview

This CRM uses a hybrid AI architecture:
- **R730 ML Workstation**: Local AI (Ollama, Whisper, LLaVA) via Tailscale Funnel
- **HCTG-AI (5090)**: Heavy AI processing (qwen2.5:32b)
- **OpenAI API**: Fallback when local AI unavailable

## Core AI Files

### Frontend Components (`src/components/ai/`)

| File | Purpose |
|------|---------|
| `AIChatWidget.tsx` | General AI chat widget |
| `AICustomerPanel.tsx` | Customer insights panel with AI |
| `AIWorkOrderHelper.tsx` | AI-powered work order assistance |
| `AutoTaggingWidget.tsx` | AI auto-tagging for records |
| `BatchOCRProcessor.tsx` | **NEW** Multi-document OCR processing |
| `CustomerSupportChat.tsx` | **NEW** RAG-powered support chat |
| `DocumentScanner.tsx` | Document scanning with OCR |
| `PhotoAnalyzer.tsx` | LLaVA photo analysis |
| `SmartSearchBar.tsx` | AI-enhanced search |
| `VoiceMemoRecorder.tsx` | **NEW** Whisper voice transcription |
| `index.ts` | Component exports |

### API Layer (`src/api/`)

| File | Purpose |
|------|---------|
| `ai.ts` | General AI API functions |
| `localAI.ts` | **CRITICAL** R730 Local AI API |

### Hooks (`src/hooks/` and `src/api/hooks/`)

**Local AI Hooks** (`src/hooks/useLocalAI.ts`):
- `useLocalAIHealth()` - Check R730 health
- `usePhotoAnalysis()` / `usePhotoAnalysisMutation()` - LLaVA photo analysis
- `useDocumentOCR()` / `useDocumentOCRMutation()` - LLaVA OCR
- `useCallAnalysisMutation()` - Call transcript analysis
- `useDispositionSuggestionMutation()` - AI disposition suggestions
- `useTranscriptionMutation()` - Whisper URL transcription
- `useAudioUploadTranscriptionMutation()` - **NEW** Browser recording transcription
- `useHeavyAnalysisMutation()` - 5090 heavy processing
- `useBatchOCRMutation()` - **NEW** Start batch OCR job
- `useBatchJobStatus()` - **NEW** Poll batch job progress
- `useBatchJobResults()` - **NEW** Get batch results
- `useBatchJobsList()` - **NEW** List batch jobs
- `useWorkOrderPhotoWorkflow()` - Photo + heavy analysis combo
- `useCustomerDocumentWorkflow()` - Document OCR + extraction

**AI Assistant Adapters** (`src/api/hooks/ai-assistant/adapters/`):
- `BaseAIAdapter.ts` - Abstract base class
- `ActivityAIAdapter.ts` - Activity AI functions
- `DispatchAIAdapter.ts` - Dispatch optimization AI
- `SearchAIAdapter.ts` - Search AI functions
- `TicketAIAdapter.ts` - Ticket handling AI

**Domain-Specific AI Hooks** (`src/api/hooks/`):
- `useActivityAI.ts` - Activity predictions
- `useAIDispatch.ts` - Dispatch optimization
- `useAIInsights.ts` - Customer insights
- `useAutoTaggingAI.ts` - Auto-tagging
- `useCommunicationAI.ts` - Communication AI
- `useComplianceAI.ts` - Compliance checks
- `useContractAI.ts` - Contract analysis
- `useCustomerSegmentationAI.ts` - Segmentation
- `useDocumentAI.ts` - Document processing
- `useEmailClassificationAI.ts` - Email classification
- `useFleetEfficiencyAI.ts` - Fleet optimization
- `useInventoryAI.ts` - Inventory predictions
- `useJobProfitabilityAI.ts` - Job profitability
- `useMaintenanceAI.ts` - Predictive maintenance
- `useOnboardingAI.ts` - Onboarding assistance
- `usePaymentAI.ts` - Payment predictions
- `usePhotoAnalysisAI.ts` - Photo analysis
- `usePredictiveMaintenance.ts` - Maintenance predictions

## Backend Endpoints

### Local AI (`/api/v2/local-ai/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | R730 health check |
| `/config` | GET | Get AI config |
| `/analyze` | POST | Analyze transcript |
| `/transcribe` | POST | Transcribe audio URL |
| `/transcribe/upload` | POST | **NEW** Upload audio for transcription |
| `/suggest-disposition` | POST | Get disposition suggestion |
| `/summarize` | POST | Summarize transcript |
| `/vision/analyze` | POST | LLaVA image analysis |
| `/vision/analyze-photo` | POST | Work order photo analysis |
| `/vision/upload-photo` | POST | Upload photo for analysis |
| `/ocr/extract` | POST | Document OCR extraction |
| `/ocr/upload-document` | POST | Upload document for OCR |
| `/heavy/analyze` | POST | 5090 heavy analysis |
| `/rag/ask` | POST | **NEW** RAG knowledge query |
| `/chat` | POST | **NEW** Basic Ollama chat |
| `/batch/ocr` | POST | **NEW** Start batch OCR job |
| `/batch/status/{job_id}` | GET | **NEW** Get job status |
| `/batch/results/{job_id}` | GET | **NEW** Get job results |
| `/batch/jobs` | GET | **NEW** List batch jobs |

## R730 Configuration

Backend settings (react-crm-api):
```python
OLLAMA_BASE_URL = "https://localhost-0.tailad2d5f.ts.net/ollama"
WHISPER_BASE_URL = "https://localhost-0.tailad2d5f.ts.net/whisper"
OLLAMA_MODEL = "llama3.2:3b"
LOCAL_WHISPER_MODEL = "medium"
LLAVA_MODEL = "llava:13b"
HCTG_AI_URL = "https://hctg-ai.tailad2d5f.ts.net"
HCTG_AI_MODEL = "qwen2.5:32b"
```

## Critical Dependencies

- All local AI features require `USE_LOCAL_AI=true` in backend config
- Frontend checks `/local-ai/health` to determine if local AI is available
- Falls back to OpenAI if local AI unavailable

## File Locations for Backend

| File | Path |
|------|------|
| Local AI API | `react-crm-api/app/api/v2/local_ai.py` |
| Local AI Service | `react-crm-api/app/services/local_ai_service.py` |
| Settings | `react-crm-api/app/config.py` |

## Notes for R730 Claude

1. **RAG System**: Uses Qdrant on R730 for vector search (collection: "septic_knowledge")
2. **Batch OCR**: In-memory job storage, max 100 docs per batch
3. **Audio**: Browser recordings sent as base64 to Whisper
4. **Photos**: LLaVA (llava:13b) for work order photo analysis
5. **Heavy Tasks**: Route to HCTG-AI (5090) for qwen2.5:32b

## Safety Notes

- Never modify the health check endpoint response format
- The frontend relies on `status: "healthy" | "degraded" | "unhealthy"`
- Always maintain fallback behavior when R730 is unavailable
- Keep timeout at 300s (5 min) for heavy operations
