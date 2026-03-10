/**
 * Photo Capture component for CRM Mobile
 * Allows camera capture or gallery selection
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PhotoData } from '../api/types';
import { colors, spacing, typography, borderRadius, shadows } from '../utils/theme';
import { Button } from './Button';

export interface PhotoCaptureProps {
  photos: PhotoData[];
  onPhotosChange: (photos: PhotoData[]) => void;
  type: 'before' | 'after' | 'manifest';
  maxPhotos?: number;
  label?: string;
}

export function PhotoCapture({
  photos,
  onPhotosChange,
  type,
  maxPhotos = 5,
  label,
}: PhotoCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in Settings to take photos.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsCapturing(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const photo: PhotoData = {
          uri: asset.uri,
          base64: asset.base64 || undefined,
          width: asset.width,
          height: asset.height,
          type,
          timestamp: new Date().toISOString(),
        };
        onPhotosChange([...photos, photo]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Required',
        'Please enable photo library access in Settings.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos - photos.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos: PhotoData[] = result.assets.map((asset) => ({
          uri: asset.uri,
          base64: asset.base64 || undefined,
          width: asset.width,
          height: asset.height,
          type,
          timestamp: new Date().toISOString(),
        }));
        onPhotosChange([...photos, ...newPhotos]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label || `${type.charAt(0).toUpperCase() + type.slice(1)} Photos`}
      </Text>
      <Text style={styles.counter}>
        {photos.length}/{maxPhotos} photos
      </Text>

      {/* Photo Thumbnails */}
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScroll}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.thumbnailWrapper}>
              <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
              >
                <Text style={styles.removeText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Capture Buttons */}
      {photos.length < maxPhotos && (
        <View style={styles.buttonRow}>
          <Button
            variant="primary"
            size="md"
            onPress={takePhoto}
            loading={isCapturing}
            style={styles.captureButton}
          >
            Take Photo
          </Button>
          <Button
            variant="secondary"
            size="md"
            onPress={pickFromGallery}
            style={styles.captureButton}
          >
            From Gallery
          </Button>
        </View>
      )}
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
    marginBottom: spacing.xs,
  },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  thumbnailScroll: {
    marginBottom: spacing.sm,
  },
  thumbnailContainer: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  removeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  captureButton: {
    flex: 1,
  },
});
