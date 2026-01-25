/**
 * Local AI API (R730 ML Workstation)
 * Vision analysis, OCR, transcription, and heavy AI processing
 */
import { apiClient } from "./client";

// ===== TYPES =====

export interface LocalAIHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  use_local_ai: boolean;
  services?: {
    ollama: boolean;
    whisper: boolean;
  };
  config?: {
    ollama_url: string;
    ollama_model: string;
    whisper_url: string;
    whisper_model: string;
  };
  error?: string;
}

export interface ImageAnalysisResult {
  description: string;
  analysis: string;
  model_used: string;
  processing_time_seconds: number;
}

export interface WorkOrderPhotoResult {
  equipment_identified: string[];
  issues_detected: string[];
  condition_rating: number; // 1-10
  condition_description: string;
  recommendations: string[];
  urgent_issues: string[];
  maintenance_needed: string[];
  estimated_repair_cost?: string;
  model_used: string;
  processing_time_seconds: number;
}

export interface DocumentOCRResult {
  raw_text: string;
  structured_data: Record<string, string | null>;
  confidence: number;
  document_type: string;
  fields_extracted: string[];
  model_used: string;
  processing_time_seconds: number;
}

export interface TranscriptionResult {
  transcript: string;
  text?: string; // Alias for backward compatibility
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
  duration_seconds: number;
  model_used?: string;
}

export interface HeavyAnalysisResult {
  response: string;
  model_used: string;
  processing_time_seconds: number;
}

export interface CallAnalysisResult {
  sentiment: string;
  sentiment_score: number;
  quality_score: number;
  escalation_risk: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  disposition_suggestion: {
    disposition: string;
    confidence: number;
    reasoning: string;
  };
  model_used: string;
  processing_time_seconds: number;
}

export interface DispositionSuggestion {
  disposition: string;
  confidence: number;
  reasoning: string;
  alternative_suggestions: Array<{
    disposition: string;
    confidence: number;
  }>;
}

// ===== BATCH OCR TYPES =====

export interface BatchOCRDocument {
  id: string;
  image_base64: string;
  filename?: string;
}

export interface BatchOCRJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  total_documents: number;
  processed: number;
  failed: number;
  started_at: string;
  completed_at: string | null;
  processing_time_seconds: number | null;
}

export interface BatchOCRResult {
  document_id: string;
  filename: string;
  status: "success" | "failed";
  extraction: Record<string, unknown> | null;
  processing_time: number;
}

export interface BatchOCRJobResults extends BatchOCRJobStatus {
  results: BatchOCRResult[];
  errors: Array<{
    document_id: string;
    filename: string;
    error: string;
  }>;
}

// ===== API FUNCTIONS =====

export const localAIApi = {
  /**
   * Check health of local AI services
   */
  async checkHealth(): Promise<LocalAIHealthStatus> {
    const { data } =
      await apiClient.get<LocalAIHealthStatus>("/local-ai/health");
    return data;
  },

  /**
   * Get local AI configuration
   */
  async getConfig(): Promise<Record<string, unknown>> {
    const { data } = await apiClient.get("/local-ai/config");
    return data;
  },

  // ===== VISION / PHOTO ANALYSIS =====

  /**
   * Analyze an image with LLaVA vision model
   */
  async analyzeImage(
    imageBase64: string,
    prompt?: string,
    context?: string,
  ): Promise<ImageAnalysisResult> {
    const { data } = await apiClient.post<ImageAnalysisResult>(
      "/local-ai/vision/analyze",
      {
        image_base64: imageBase64,
        prompt,
        context,
      },
    );
    return data;
  },

  /**
   * Analyze a work order photo with structured output
   */
  async analyzeWorkOrderPhoto(
    imageBase64: string,
    workOrderType: string = "septic",
  ): Promise<WorkOrderPhotoResult> {
    const { data } = await apiClient.post<WorkOrderPhotoResult>(
      "/local-ai/vision/analyze-photo",
      {
        image_base64: imageBase64,
        work_order_type: workOrderType,
      },
    );
    return data;
  },

  /**
   * Upload and analyze a photo file
   */
  async uploadAndAnalyzePhoto(
    file: File,
    workOrderType: string = "septic",
  ): Promise<
    WorkOrderPhotoResult & { filename: string; file_size_bytes: number }
  > {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("work_order_type", workOrderType);

    const { data } = await apiClient.post(
      "/local-ai/vision/upload-photo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return data;
  },

  // ===== OCR / DOCUMENT EXTRACTION =====

  /**
   * Extract data from a document image
   */
  async extractDocumentData(
    imageBase64: string,
    documentType: string = "service_record",
  ): Promise<DocumentOCRResult> {
    const { data } = await apiClient.post<DocumentOCRResult>(
      "/local-ai/ocr/extract",
      {
        image_base64: imageBase64,
        document_type: documentType,
      },
    );
    return data;
  },

  /**
   * Upload and extract data from a document
   */
  async uploadAndExtractDocument(
    file: File,
    documentType: string = "service_record",
  ): Promise<
    DocumentOCRResult & { filename: string; file_size_bytes: number }
  > {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    const { data } = await apiClient.post(
      "/local-ai/ocr/upload-document",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return data;
  },

  // ===== TRANSCRIPTION =====

  /**
   * Transcribe audio from URL using local Whisper
   */
  async transcribeAudio(
    audioUrl: string,
    language: string = "en",
  ): Promise<TranscriptionResult> {
    const { data } = await apiClient.post<TranscriptionResult>(
      "/local-ai/transcribe",
      {
        audio_url: audioUrl,
        language,
      },
    );
    return data;
  },

  /**
   * Upload and transcribe an audio file using local Whisper
   */
  async uploadAndTranscribeAudio(
    file: Blob,
    language: string = "en",
    filename: string = "recording.webm",
  ): Promise<
    TranscriptionResult & { filename: string; file_size_bytes: number }
  > {
    const formData = new FormData();
    formData.append("file", file, filename);
    formData.append("language", language);

    const { data } = await apiClient.post(
      "/local-ai/transcribe/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return data;
  },

  // ===== CALL ANALYSIS =====

  /**
   * Analyze a call transcript
   */
  async analyzeTranscript(
    transcript: string,
    callMetadata?: Record<string, unknown>,
  ): Promise<CallAnalysisResult> {
    const { data } = await apiClient.post<CallAnalysisResult>(
      "/local-ai/analyze",
      {
        transcript,
        call_metadata: callMetadata,
      },
    );
    return data;
  },

  /**
   * Get AI-suggested disposition for a call
   */
  async suggestDisposition(
    transcript: string,
    availableDispositions: string[],
  ): Promise<DispositionSuggestion> {
    const { data } = await apiClient.post<DispositionSuggestion>(
      "/local-ai/suggest-disposition",
      {
        transcript,
        available_dispositions: availableDispositions,
      },
    );
    return data;
  },

  /**
   * Generate call summary
   */
  async summarizeCall(transcript: string): Promise<{ summary: string }> {
    const { data } = await apiClient.post<{ summary: string }>(
      "/local-ai/summarize",
      transcript,
      {
        headers: {
          "Content-Type": "text/plain",
        },
      },
    );
    return data;
  },

  // ===== HEAVY PROCESSING (HCTG-AI / 5090) =====

  /**
   * Perform heavy AI analysis using qwen2.5:32b on RTX 5090
   */
  async heavyAnalysis(
    prompt: string,
    context?: string,
  ): Promise<HeavyAnalysisResult> {
    const { data } = await apiClient.post<HeavyAnalysisResult>(
      "/local-ai/heavy/analyze",
      {
        prompt,
        context,
      },
    );
    return data;
  },

  // ===== BATCH OCR PROCESSING =====

  /**
   * Start a batch OCR job for multiple documents
   */
  async startBatchOCR(
    documents: BatchOCRDocument[],
    documentType: string = "service_record",
  ): Promise<{
    job_id: string;
    status: string;
    total_documents: number;
    message: string;
  }> {
    const { data } = await apiClient.post("/local-ai/batch/ocr", {
      documents,
      document_type: documentType,
    });
    return data;
  },

  /**
   * Get status of a batch OCR job
   */
  async getBatchStatus(jobId: string): Promise<BatchOCRJobStatus> {
    const { data } = await apiClient.get<BatchOCRJobStatus>(
      `/local-ai/batch/status/${jobId}`,
    );
    return data;
  },

  /**
   * Get full results of a completed batch OCR job
   */
  async getBatchResults(jobId: string): Promise<BatchOCRJobResults> {
    const { data } = await apiClient.get<BatchOCRJobResults>(
      `/local-ai/batch/results/${jobId}`,
    );
    return data;
  },

  /**
   * List recent batch OCR jobs
   */
  async listBatchJobs(
    limit: number = 50,
  ): Promise<{ jobs: BatchOCRJobStatus[] }> {
    const { data } = await apiClient.get<{ jobs: BatchOCRJobStatus[] }>(
      `/local-ai/batch/jobs?limit=${limit}`,
    );
    return data;
  },
};

// ===== UTILITY FUNCTIONS =====

/**
 * Convert a File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/tiff",
  ];
  return validTypes.includes(file.type);
}

/**
 * Validate document file type
 */
export function isValidDocumentFile(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/tiff",
    "application/pdf",
  ];
  return validTypes.includes(file.type);
}
