/**
 * React Hooks for Local AI (R730 ML Workstation)
 * Vision analysis, OCR, transcription, and heavy processing
 */
import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  localAIApi,
  isValidImageFile,
  isValidDocumentFile,
  type LocalAIHealthStatus,
  type WorkOrderPhotoResult,
  type DocumentOCRResult,
  type BatchOCRDocument,
  type BatchOCRJobStatus,
  type BatchOCRJobResults,
} from "@/api/localAI";

// ===== QUERY KEYS =====

export const localAIKeys = {
  all: ["local-ai"] as const,
  health: () => [...localAIKeys.all, "health"] as const,
  config: () => [...localAIKeys.all, "config"] as const,
};

// ===== HEALTH CHECK HOOK =====

/**
 * Check local AI service health status
 */
export function useLocalAIHealth() {
  return useQuery({
    queryKey: localAIKeys.health(),
    queryFn: async (): Promise<LocalAIHealthStatus> => {
      try {
        return await localAIApi.checkHealth();
      } catch {
        return {
          status: "unhealthy",
          use_local_ai: false,
          error: "Failed to connect to local AI services",
        };
      }
    },
    retry: false,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Check every minute
  });
}

// ===== PHOTO ANALYSIS HOOKS =====

interface UsePhotoAnalysisState {
  isAnalyzing: boolean;
  result: WorkOrderPhotoResult | null;
  error: string | null;
  preview: string | null;
}

/**
 * Hook for analyzing work order photos with LLaVA vision model
 */
export function usePhotoAnalysis() {
  const [state, setState] = useState<UsePhotoAnalysisState>({
    isAnalyzing: false,
    result: null,
    error: null,
    preview: null,
  });

  const analyzePhoto = useCallback(async (file: File, workOrderType: string = "septic") => {
    // Validate file type
    if (!isValidImageFile(file)) {
      setState(prev => ({
        ...prev,
        error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
      }));
      return null;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setState(prev => ({ ...prev, preview: previewUrl, isAnalyzing: true, error: null }));

    try {
      const result = await localAIApi.uploadAndAnalyzePhoto(file, workOrderType);
      setState(prev => ({ ...prev, result, isAnalyzing: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Photo analysis failed";
      setState(prev => ({ ...prev, error: errorMessage, isAnalyzing: false }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
    }
    setState({
      isAnalyzing: false,
      result: null,
      error: null,
      preview: null,
    });
  }, [state.preview]);

  return {
    ...state,
    analyzePhoto,
    reset,
  };
}

/**
 * Mutation hook for photo analysis (for use with react-query)
 */
export function usePhotoAnalysisMutation() {
  return useMutation({
    mutationFn: async ({ file, workOrderType }: { file: File; workOrderType?: string }) => {
      return localAIApi.uploadAndAnalyzePhoto(file, workOrderType || "septic");
    },
  });
}

// ===== DOCUMENT OCR HOOKS =====

interface UseDocumentOCRState {
  isExtracting: boolean;
  result: DocumentOCRResult | null;
  error: string | null;
  preview: string | null;
}

/**
 * Hook for extracting data from documents using LLaVA OCR
 */
export function useDocumentOCR() {
  const [state, setState] = useState<UseDocumentOCRState>({
    isExtracting: false,
    result: null,
    error: null,
    preview: null,
  });

  const extractDocument = useCallback(async (file: File, documentType: string = "service_record") => {
    // Validate file type
    if (!isValidDocumentFile(file)) {
      setState(prev => ({
        ...prev,
        error: "Invalid file type. Please upload a JPEG, PNG, TIFF, or PDF file.",
      }));
      return null;
    }

    // Create preview (only for images)
    let previewUrl: string | null = null;
    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
    }
    setState(prev => ({ ...prev, preview: previewUrl, isExtracting: true, error: null }));

    try {
      const result = await localAIApi.uploadAndExtractDocument(file, documentType);
      setState(prev => ({ ...prev, result, isExtracting: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Document extraction failed";
      setState(prev => ({ ...prev, error: errorMessage, isExtracting: false }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
    }
    setState({
      isExtracting: false,
      result: null,
      error: null,
      preview: null,
    });
  }, [state.preview]);

  return {
    ...state,
    extractDocument,
    reset,
  };
}

/**
 * Mutation hook for document OCR
 */
export function useDocumentOCRMutation() {
  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType?: string }) => {
      return localAIApi.uploadAndExtractDocument(file, documentType || "service_record");
    },
  });
}

// ===== CALL ANALYSIS HOOKS =====

/**
 * Mutation hook for analyzing call transcripts
 */
export function useCallAnalysisMutation() {
  return useMutation({
    mutationFn: async ({
      transcript,
      callMetadata,
    }: {
      transcript: string;
      callMetadata?: Record<string, unknown>;
    }) => {
      return localAIApi.analyzeTranscript(transcript, callMetadata);
    },
  });
}

/**
 * Mutation hook for getting disposition suggestions
 */
export function useDispositionSuggestionMutation() {
  return useMutation({
    mutationFn: async ({
      transcript,
      availableDispositions,
    }: {
      transcript: string;
      availableDispositions: string[];
    }) => {
      return localAIApi.suggestDisposition(transcript, availableDispositions);
    },
  });
}

// ===== TRANSCRIPTION HOOKS =====

/**
 * Mutation hook for audio transcription from URL
 */
export function useTranscriptionMutation() {
  return useMutation({
    mutationFn: async ({ audioUrl, language }: { audioUrl: string; language?: string }) => {
      return localAIApi.transcribeAudio(audioUrl, language || "en");
    },
  });
}

/**
 * Mutation hook for audio file upload and transcription
 */
export function useAudioUploadTranscriptionMutation() {
  return useMutation({
    mutationFn: async ({
      file,
      language,
      filename,
    }: {
      file: Blob;
      language?: string;
      filename?: string;
    }) => {
      return localAIApi.uploadAndTranscribeAudio(
        file,
        language || "en",
        filename || "recording.webm"
      );
    },
  });
}

// ===== HEAVY ANALYSIS HOOKS =====

/**
 * Mutation hook for heavy AI analysis (qwen2.5:32b on RTX 5090)
 */
export function useHeavyAnalysisMutation() {
  return useMutation({
    mutationFn: async ({ prompt, context }: { prompt: string; context?: string }) => {
      return localAIApi.heavyAnalysis(prompt, context);
    },
  });
}

// ===== COMPOSITE HOOKS =====

/**
 * Hook for work order photo workflow:
 * 1. Upload photo
 * 2. Analyze with LLaVA
 * 3. Generate repair recommendations
 */
export function useWorkOrderPhotoWorkflow() {
  const photoAnalysis = usePhotoAnalysisMutation();
  const heavyAnalysis = useHeavyAnalysisMutation();

  const processPhoto = useCallback(async (
    file: File,
    workOrderType: string,
    workOrderContext?: string
  ) => {
    // Step 1: Analyze photo
    const photoResult = await photoAnalysis.mutateAsync({ file, workOrderType });

    // Step 2: If urgent issues detected, get detailed analysis
    if (photoResult.urgent_issues.length > 0 || photoResult.condition_rating <= 4) {
      const detailedPrompt = `
        Based on the following septic system inspection results, provide a detailed repair plan:

        Equipment: ${photoResult.equipment_identified.join(", ")}
        Issues: ${photoResult.issues_detected.join(", ")}
        Urgent: ${photoResult.urgent_issues.join(", ")}
        Condition: ${photoResult.condition_rating}/10 - ${photoResult.condition_description}

        ${workOrderContext ? `Work Order Context: ${workOrderContext}` : ""}

        Provide:
        1. Priority repair steps
        2. Parts and materials needed
        3. Estimated labor time
        4. Safety considerations
        5. Customer communication recommendations
      `;

      const detailedAnalysis = await heavyAnalysis.mutateAsync({
        prompt: detailedPrompt,
        context: workOrderType,
      });

      return {
        photoAnalysis: photoResult,
        detailedPlan: detailedAnalysis.response,
        needsUrgentAttention: true,
      };
    }

    return {
      photoAnalysis: photoResult,
      detailedPlan: null,
      needsUrgentAttention: false,
    };
  }, [photoAnalysis, heavyAnalysis]);

  return {
    processPhoto,
    isProcessing: photoAnalysis.isPending || heavyAnalysis.isPending,
    error: photoAnalysis.error || heavyAnalysis.error,
  };
}

/**
 * Hook for customer document workflow:
 * 1. OCR the document
 * 2. Extract structured data
 * 3. Match to existing customer records
 */
export function useCustomerDocumentWorkflow() {
  const documentOCR = useDocumentOCRMutation();

  const processDocument = useCallback(async (file: File, documentType: string) => {
    const result = await documentOCR.mutateAsync({ file, documentType });

    // Extract customer-relevant fields
    const customerData = {
      name: result.structured_data.customer_name || result.structured_data.name,
      address: result.structured_data.service_address || result.structured_data.address,
      phone: result.structured_data.phone,
      email: result.structured_data.email,
      // Septic-specific
      tankSize: result.structured_data.tank_size_gallons,
      lastService: result.structured_data.last_pumping_date || result.structured_data.last_service_date,
      nextDue: result.structured_data.next_service_due,
    };

    return {
      ocrResult: result,
      customerData,
      rawText: result.raw_text,
      confidence: result.confidence,
    };
  }, [documentOCR]);

  return {
    processDocument,
    isProcessing: documentOCR.isPending,
    error: documentOCR.error,
  };
}

// ===== BATCH OCR HOOKS =====

export const batchOCRKeys = {
  all: ["batch-ocr"] as const,
  status: (jobId: string) => [...batchOCRKeys.all, "status", jobId] as const,
  results: (jobId: string) => [...batchOCRKeys.all, "results", jobId] as const,
  jobs: () => [...batchOCRKeys.all, "jobs"] as const,
};

/**
 * Hook for starting batch OCR jobs
 */
export function useBatchOCRMutation() {
  return useMutation({
    mutationFn: async ({
      documents,
      documentType,
    }: {
      documents: BatchOCRDocument[];
      documentType?: string;
    }) => {
      return localAIApi.startBatchOCR(documents, documentType || "service_record");
    },
  });
}

/**
 * Hook for checking batch job status with polling
 */
export function useBatchJobStatus(jobId: string | null, enabled = true) {
  return useQuery({
    queryKey: batchOCRKeys.status(jobId || ""),
    queryFn: async (): Promise<BatchOCRJobStatus> => {
      if (!jobId) throw new Error("No job ID");
      return localAIApi.getBatchStatus(jobId);
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as BatchOCRJobStatus | undefined;
      // Poll every 2 seconds while processing, stop when complete
      if (data?.status === "processing" || data?.status === "pending") {
        return 2000;
      }
      return false;
    },
  });
}

/**
 * Hook for getting batch job results
 */
export function useBatchJobResults(jobId: string | null, enabled = true) {
  return useQuery({
    queryKey: batchOCRKeys.results(jobId || ""),
    queryFn: async (): Promise<BatchOCRJobResults> => {
      if (!jobId) throw new Error("No job ID");
      return localAIApi.getBatchResults(jobId);
    },
    enabled: enabled && !!jobId,
    staleTime: Infinity, // Results don't change once complete
  });
}

/**
 * Hook for listing batch jobs
 */
export function useBatchJobsList(limit = 50) {
  return useQuery({
    queryKey: batchOCRKeys.jobs(),
    queryFn: async () => {
      return localAIApi.listBatchJobs(limit);
    },
    staleTime: 30 * 1000,
  });
}
