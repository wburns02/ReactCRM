/**
 * Photo Analyzer Component
 * Upload and analyze work order photos using LLaVA vision AI on R730
 */
import { useState, useCallback, useRef } from "react";
import { Camera, Upload, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { usePhotoAnalysis, useLocalAIHealth } from "@/hooks/useLocalAI";

interface PhotoAnalyzerProps {
  workOrderType?: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  className?: string;
}

interface AnalysisResult {
  equipment_identified: string[];
  issues_detected: string[];
  condition_rating: number;
  condition_description: string;
  recommendations: string[];
  urgent_issues: string[];
  maintenance_needed: string[];
}

/**
 * Work order photo analyzer with AI vision analysis
 */
export function PhotoAnalyzer({
  workOrderType = "septic",
  onAnalysisComplete,
  className = "",
}: PhotoAnalyzerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const { data: aiHealth } = useLocalAIHealth();
  const {
    isAnalyzing,
    result,
    error,
    preview,
    analyzePhoto,
    reset,
  } = usePhotoAnalysis();

  const isAIAvailable = aiHealth?.status === "healthy" || aiHealth?.status === "degraded";

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    const analysisResult = await analyzePhoto(file, workOrderType);
    if (analysisResult && onAnalysisComplete) {
      onAnalysisComplete(analysisResult);
    }
  }, [analyzePhoto, workOrderType, onAnalysisComplete]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Trigger file input click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get condition color based on rating
  const getConditionColor = (rating: number): string => {
    if (rating >= 8) return "text-success";
    if (rating >= 5) return "text-warning";
    return "text-danger";
  };

  const getConditionBadgeVariant = (rating: number): "success" | "warning" | "danger" => {
    if (rating >= 8) return "success";
    if (rating >= 5) return "warning";
    return "danger";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            AI Photo Analysis
          </span>
          {aiHealth && (
            <Badge variant={isAIAvailable ? "success" : "secondary"}>
              {isAIAvailable ? "AI Ready" : "AI Offline"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Unavailable Warning */}
        {!isAIAvailable && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <p className="text-xs text-warning">
              Local AI services are currently unavailable. Photo analysis will be queued.
            </p>
          </div>
        )}

        {/* Upload Area */}
        {!preview && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">
              Drop a photo here or click to upload
            </p>
            <p className="text-xs text-text-muted mt-1">
              JPEG, PNG, GIF, WebP (max 10MB)
            </p>
          </div>
        )}

        {/* Preview and Analysis */}
        {preview && (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden bg-bg-muted">
              <img
                src={preview}
                alt="Upload preview"
                className="w-full h-48 object-cover"
              />
              {!isAnalyzing && !result && (
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 p-1 bg-bg-card/80 rounded-full hover:bg-bg-card"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-card/80">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-text-secondary">Analyzing photo...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            {/* Analysis Results */}
            {result && (
              <div className="space-y-4">
                {/* Condition Rating */}
                <div className="flex items-center justify-between p-3 bg-bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-text-muted">Condition Rating</p>
                    <p className={`text-lg font-bold ${getConditionColor(result.condition_rating)}`}>
                      {result.condition_rating}/10
                    </p>
                  </div>
                  <Badge variant={getConditionBadgeVariant(result.condition_rating)}>
                    {result.condition_description}
                  </Badge>
                </div>

                {/* Urgent Issues */}
                {result.urgent_issues.length > 0 && (
                  <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                      <h4 className="text-sm font-medium text-danger">Urgent Issues</h4>
                    </div>
                    <ul className="space-y-1">
                      {result.urgent_issues.map((issue, index) => (
                        <li key={index} className="text-xs text-danger flex items-start gap-1">
                          <span className="mt-0.5">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Equipment Identified */}
                {result.equipment_identified.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase mb-2">
                      Equipment Identified
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {result.equipment_identified.map((equipment, index) => (
                        <Badge key={index} variant="default">
                          {equipment}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues Detected */}
                {result.issues_detected.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase mb-2">
                      Issues Detected
                    </h4>
                    <ul className="space-y-1">
                      {result.issues_detected.map((issue, index) => (
                        <li key={index} className="text-xs text-text-secondary flex items-start gap-1">
                          <span className="text-warning mt-0.5">!</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase mb-2">
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-xs text-text-secondary flex items-start gap-1">
                          <CheckCircle className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Maintenance Needed */}
                {result.maintenance_needed.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase mb-2">
                      Maintenance Needed
                    </h4>
                    <ul className="space-y-1">
                      {result.maintenance_needed.map((item, index) => (
                        <li key={index} className="text-xs text-text-secondary flex items-start gap-1">
                          <span className="mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={reset} className="flex-1">
                    <Camera className="w-4 h-4 mr-1" />
                    New Photo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact photo upload button for inline use
 */
export function PhotoUploadButton({
  workOrderType = "septic",
  onAnalysisComplete,
  disabled = false,
}: {
  workOrderType?: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAnalyzing, analyzePhoto } = usePhotoAnalysis();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await analyzePhoto(file, workOrderType);
      if (result && onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    }
  }, [analyzePhoto, workOrderType, onAnalysisComplete]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-1" />
            Add Photo
          </>
        )}
      </Button>
    </>
  );
}

export default PhotoAnalyzer;
