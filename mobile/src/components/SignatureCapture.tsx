/**
 * Signature Capture component for CRM Mobile
 * Wraps react-native-signature-canvas for capturing signatures
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { Button } from './Button';
import { colors, spacing, typography, borderRadius, shadows } from '../utils/theme';

export interface SignatureCaptureProps {
  label: string;
  signature: string | undefined;
  onSignatureChange: (signature: string | undefined) => void;
}

export function SignatureCapture({
  label,
  signature,
  onSignatureChange,
}: SignatureCaptureProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const signatureRef = useRef<typeof SignatureScreen extends React.ComponentType<infer P> ? React.ComponentRef<typeof SignatureScreen> : never>(null);

  const handleSignature = (sig: string) => {
    onSignatureChange(sig);
    setIsModalVisible(false);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const handleClearSaved = () => {
    onSignatureChange(undefined);
  };

  const webStyle = `.m-signature-pad {
    box-shadow: none;
    border: none;
    margin: 0;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body, html {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {signature ? (
        <View style={styles.signaturePreview}>
          <View style={styles.previewBox}>
            <Text style={styles.signedText}>Signature captured</Text>
          </View>
          <View style={styles.previewActions}>
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Text style={styles.actionText}>Re-sign</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearSaved}>
              <Text style={[styles.actionText, { color: colors.danger }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Button
          variant="secondary"
          size="md"
          onPress={() => setIsModalVisible(true)}
        >
          Capture Signature
        </Button>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>
            Sign with your finger in the area below
          </Text>

          <View style={styles.signaturePad}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() =>
                onSignatureChange(undefined)
              }
              webStyle={webStyle}
              backgroundColor="white"
              penColor="black"
              dotSize={2}
              minWidth={1.5}
              maxWidth={3}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleConfirm}
              style={styles.confirmButton}
            >
              Confirm Signature
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  signaturePreview: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  previewBox: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fff4',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  signedText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  clearText: {
    ...typography.body,
    color: colors.danger,
  },
  instructions: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  signaturePad: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  modalActions: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    width: '100%',
  },
});
