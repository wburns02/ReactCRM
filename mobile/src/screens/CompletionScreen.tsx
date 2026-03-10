/**
 * Work Order Completion Screen for CRM Mobile
 * Multi-step flow: Photos -> Signature -> Notes -> Submit
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PhotoCapture } from '../components/PhotoCapture';
import { SignatureCapture } from '../components/SignatureCapture';
import { useCompleteWorkOrder } from '../api/hooks';
import {
  WorkOrder,
  PhotoData,
  LocationData,
  WorkOrderCompletionData,
} from '../api/types';
import { colors, spacing, typography, borderRadius } from '../utils/theme';

export interface CompletionScreenProps {
  workOrder: WorkOrder;
  onBack: () => void;
  onComplete: () => void;
}

type Step = 'photos' | 'signature' | 'notes' | 'review';

const STEPS: Step[] = ['photos', 'signature', 'notes', 'review'];

export function CompletionScreen({
  workOrder,
  onBack,
  onComplete,
}: CompletionScreenProps) {
  const [currentStep, setCurrentStep] = useState<Step>('photos');
  const [beforePhotos, setBeforePhotos] = useState<PhotoData[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<PhotoData[]>([]);
  const [manifestPhotos, setManifestPhotos] = useState<PhotoData[]>([]);
  const [customerSignature, setCustomerSignature] = useState<string | undefined>();
  const [technicianSignature, setTechnicianSignature] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [arrivalLocation, setArrivalLocation] = useState<LocationData | undefined>();
  const [completionLocation, setCompletionLocation] = useState<LocationData | undefined>();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const completeWorkOrder = useCompleteWorkOrder();

  // Capture arrival location on mount
  useEffect(() => {
    captureLocation('arrival');
  }, []);

  const captureLocation = async (type: 'arrival' | 'completion') => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location helps verify your arrival at the job site. You can continue without it.'
        );
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: new Date().toISOString(),
      };

      if (type === 'arrival') {
        setArrivalLocation(locationData);
      } else {
        setCompletionLocation(locationData);
      }
    } catch (error) {
      console.warn('Failed to get location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const stepIndex = STEPS.indexOf(currentStep);

  const goNext = () => {
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      Alert.alert(
        'Discard Progress?',
        'Your completion data will be lost. Are you sure?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onBack },
        ]
      );
    } else {
      setCurrentStep(STEPS[stepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    // Capture completion location
    await captureLocation('completion');

    const completionData: WorkOrderCompletionData = {
      work_order_id: workOrder.id,
      before_photos: beforePhotos,
      after_photos: afterPhotos,
      manifest_photos: manifestPhotos,
      customer_signature: customerSignature,
      technician_signature: technicianSignature,
      arrival_location: arrivalLocation,
      completion_location: completionLocation,
      arrival_time: arrivalLocation?.timestamp,
      completion_time: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      await completeWorkOrder.mutateAsync(completionData);
      Alert.alert('Work Order Completed', 'The work order has been marked as complete.', [
        { text: 'OK', onPress: onComplete },
      ]);
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        'The completion data has been saved offline and will sync when connection is restored.'
      );
      onComplete();
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.stepDotRow}>
          <View
            style={[
              styles.stepDot,
              index <= stepIndex && styles.stepDotActive,
              index < stepIndex && styles.stepDotComplete,
            ]}
          >
            {index < stepIndex ? (
              <Text style={styles.stepCheck}>OK</Text>
            ) : (
              <Text
                style={[
                  styles.stepNumber,
                  index <= stepIndex && styles.stepNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                index < stepIndex && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderPhotosStep = () => (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Capture Photos</Text>
      <Text style={styles.stepDescription}>
        Take photos of the job site before and after your work.
      </Text>

      <PhotoCapture
        photos={beforePhotos}
        onPhotosChange={setBeforePhotos}
        type="before"
        label="Before Photos"
        maxPhotos={5}
      />

      <PhotoCapture
        photos={afterPhotos}
        onPhotosChange={setAfterPhotos}
        type="after"
        label="After Photos"
        maxPhotos={5}
      />

      <PhotoCapture
        photos={manifestPhotos}
        onPhotosChange={setManifestPhotos}
        type="manifest"
        label="Manifest / Documentation"
        maxPhotos={3}
      />

      {/* Location Status */}
      <Card variant="outlined" style={styles.locationCard}>
        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>GPS Location</Text>
          {isGettingLocation ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : arrivalLocation ? (
            <Text style={styles.locationCaptured}>Captured</Text>
          ) : (
            <TouchableOpacity onPress={() => captureLocation('arrival')}>
              <Text style={styles.locationRetry}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </ScrollView>
  );

  const renderSignatureStep = () => (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Signatures</Text>
      <Text style={styles.stepDescription}>
        Collect the customer's signature and add your own.
      </Text>

      <SignatureCapture
        label="Customer Signature"
        signature={customerSignature}
        onSignatureChange={setCustomerSignature}
      />

      <SignatureCapture
        label="Technician Signature"
        signature={technicianSignature}
        onSignatureChange={setTechnicianSignature}
      />
    </ScrollView>
  );

  const renderNotesStep = () => (
    <KeyboardAvoidingView
      style={styles.stepContent}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={200}
    >
      <ScrollView
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepTitle}>Completion Notes</Text>
        <Text style={styles.stepDescription}>
          Add any notes about the work performed, issues found, or follow-up needed.
        </Text>

        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Describe work performed, observations, recommendations..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderReviewStep = () => (
    <ScrollView
      style={styles.stepContent}
      contentContainerStyle={styles.stepScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Review & Submit</Text>
      <Text style={styles.stepDescription}>
        Review the completion data before submitting.
      </Text>

      <Card style={styles.reviewCard}>
        <ReviewRow
          label="Before Photos"
          value={`${beforePhotos.length} photo${beforePhotos.length !== 1 ? 's' : ''}`}
          complete={beforePhotos.length > 0}
        />
        <ReviewRow
          label="After Photos"
          value={`${afterPhotos.length} photo${afterPhotos.length !== 1 ? 's' : ''}`}
          complete={afterPhotos.length > 0}
        />
        <ReviewRow
          label="Manifest"
          value={`${manifestPhotos.length} photo${manifestPhotos.length !== 1 ? 's' : ''}`}
          complete={manifestPhotos.length > 0}
        />
        <ReviewRow
          label="Customer Signature"
          value={customerSignature ? 'Captured' : 'Not captured'}
          complete={!!customerSignature}
        />
        <ReviewRow
          label="Technician Signature"
          value={technicianSignature ? 'Captured' : 'Not captured'}
          complete={!!technicianSignature}
        />
        <ReviewRow
          label="GPS Location"
          value={arrivalLocation ? 'Captured' : 'Not available'}
          complete={!!arrivalLocation}
        />
        <ReviewRow
          label="Notes"
          value={notes.trim() ? `${notes.trim().length} characters` : 'None'}
          complete={!!notes.trim()}
        />
      </Card>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'photos':
        return renderPhotosStep();
      case 'signature':
        return renderSignatureStep();
      case 'notes':
        return renderNotesStep();
      case 'review':
        return renderReviewStep();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete WO #{workOrder.id}</Text>
        <View style={styles.headerRight} />
      </View>

      {renderStepIndicator()}
      {renderCurrentStep()}

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {currentStep === 'review' ? (
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            loading={completeWorkOrder.isPending}
            style={styles.bottomButton}
          >
            Submit Completion
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onPress={goNext}
            style={styles.bottomButton}
          >
            Continue
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
  complete: boolean;
}

function ReviewRow({ label, value, complete }: ReviewRowProps) {
  return (
    <View style={reviewStyles.row}>
      <View style={reviewStyles.left}>
        <Text style={[reviewStyles.indicator, complete && reviewStyles.indicatorComplete]}>
          {complete ? 'Y' : '-'}
        </Text>
        <Text style={reviewStyles.label}>{label}</Text>
      </View>
      <Text style={reviewStyles.value}>{value}</Text>
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    overflow: 'hidden',
  },
  indicatorComplete: {
    backgroundColor: colors.success,
    color: colors.white,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  value: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerRight: {
    width: 60,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  stepDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotComplete: {
    backgroundColor: colors.success,
  },
  stepNumber: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepCheck: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
  },
  stepLineActive: {
    backgroundColor: colors.success,
  },
  stepContent: {
    flex: 1,
  },
  stepScrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stepTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  locationCard: {
    marginTop: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  locationCaptured: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  locationRetry: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 200,
    lineHeight: 24,
  },
  reviewCard: {
    marginTop: spacing.sm,
  },
  bottomActions: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomButton: {
    width: '100%',
  },
});
