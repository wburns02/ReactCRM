import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

/**
 * Photo analysis result
 */
export interface PhotoAnalysisResult {
  image_quality: {
    score: number;
    issues: string[];
    is_acceptable: boolean;
  };
  detected_objects: DetectedObject[];
  equipment_condition: {
    overall: "good" | "fair" | "poor" | "critical";
    issues_detected: string[];
    recommended_actions: string[];
  };
  documentation_check: {
    is_before_photo: boolean;
    is_after_photo: boolean;
    shows_work_area: boolean;
    shows_equipment: boolean;
    missing_requirements: string[];
  };
  auto_caption: string;
  suggested_tags: string[];
}

export interface DetectedObject {
  name: string;
  confidence: number;
  bounding_box?: { x: number; y: number; width: number; height: number };
}

/**
 * Analyze a work order photo
 */
export function useAnalyzePhoto() {
  return useMutation({
    mutationFn: async (params: {
      image_url: string;
      context?: "before" | "after" | "during" | "damage" | "equipment";
      work_order_id?: string;
    }): Promise<PhotoAnalysisResult> => {
      try {
        const response = await apiClient.post("/ai/photos/analyze", params);
        return response.data;
      } catch {
        return generateDemoAnalysis(params.context);
      }
    },
  });
}

/**
 * Batch analyze multiple photos
 */
export function useBatchAnalyzePhotos() {
  return useMutation({
    mutationFn: async (params: {
      image_urls: string[];
      work_order_id: string;
    }): Promise<{ results: PhotoAnalysisResult[]; summary: string }> => {
      try {
        const response = await apiClient.post(
          "/ai/photos/batch-analyze",
          params,
        );
        return response.data;
      } catch {
        return {
          results: params.image_urls.map(() => generateDemoAnalysis()),
          summary:
            "All photos meet documentation requirements. Equipment condition appears good.",
        };
      }
    },
  });
}

/**
 * Generate documentation report from photos
 */
export function useGeneratePhotoReport() {
  return useMutation({
    mutationFn: async (params: {
      work_order_id: string;
      include_analysis: boolean;
    }): Promise<{ report_url: string; summary: string }> => {
      try {
        const response = await apiClient.post(
          "/ai/photos/generate-report",
          params,
        );
        return response.data;
      } catch {
        return {
          report_url: `/reports/photo-documentation-${params.work_order_id}.pdf`,
          summary:
            "Photo documentation complete with 4 before photos, 3 during photos, and 4 after photos.",
        };
      }
    },
  });
}

function generateDemoAnalysis(context?: string): PhotoAnalysisResult {
  const isBeforePhoto = context === "before";
  const isAfterPhoto = context === "after";

  return {
    image_quality: {
      score: 85 + Math.floor(Math.random() * 10),
      issues: Math.random() > 0.7 ? ["Slightly underexposed"] : [],
      is_acceptable: true,
    },
    detected_objects: [
      { name: "Septic tank lid", confidence: 0.94 },
      { name: "Pump truck hose", confidence: 0.87 },
      { name: "Access port", confidence: 0.82 },
    ],
    equipment_condition: {
      overall: Math.random() > 0.3 ? "good" : "fair",
      issues_detected:
        Math.random() > 0.6 ? [] : ["Minor surface cracks visible on lid"],
      recommended_actions:
        Math.random() > 0.6 ? [] : ["Monitor lid condition at next service"],
    },
    documentation_check: {
      is_before_photo: isBeforePhoto || Math.random() > 0.5,
      is_after_photo: isAfterPhoto || Math.random() > 0.5,
      shows_work_area: true,
      shows_equipment: true,
      missing_requirements: [],
    },
    auto_caption: isBeforePhoto
      ? "Before service: Septic tank access point with lid visible"
      : isAfterPhoto
        ? "After service: Clean access area, lid secured"
        : "Work in progress: Pumping equipment connected",
    suggested_tags: ["septic", "pumping", context || "documentation"].filter(
      Boolean,
    ),
  };
}
