import { AppInput } from '@/components/ui/app-input';
import { BackHeader } from '@/components/ui/app-header';
import { PrimaryButton } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import { useMarketplaceMutations } from '@/hooks/use-marketplace';
import contentDeliveryImage from '@/assets/images/content_delivery.png';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CARD_RADIUS = 28;

type SelectedFile = { uri: string; name: string; mimeType?: string };

function isImageFile(file: SelectedFile) {
  if (file.mimeType) return file.mimeType.startsWith('image/');
  return /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i.test(file.name);
}

// ─── Empty / preview asset card ───────────────────────────────────────────────

function AssetCard({ file, onPress }: { file: SelectedFile | null; onPress: () => void }) {
  const shell = styles.assetCardShell;
  const inner = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={file ? `Selected: ${file.name}. Tap to change` : 'Tap to choose file'}
      onPress={onPress}
      style={({ pressed }) => [styles.assetCardPressable, pressed && styles.pressed]}
    >
      {file ? (
        isImageFile(file) ? (
          // Image preview
          <>
            <Image
              source={{ uri: file.uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
            />
            <View style={styles.fileNameBadge}>
              {isLiquidGlassAvailable() ? (
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="dark"
                  style={styles.fileNameGlass}
                >
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {file.name}
                  </Text>
                </GlassView>
              ) : (
                <BlurView
                  tint="systemUltraThinMaterialDark"
                  intensity={80}
                  style={styles.fileNameGlass}
                >
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {file.name}
                  </Text>
                </BlurView>
              )}
            </View>
            <View style={styles.changeFileBadge}>
              {isLiquidGlassAvailable() ? (
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="dark"
                  style={styles.changeFileGlass}
                >
                  <Ionicons name="repeat" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.changeFileText}>Change</Text>
                </GlassView>
              ) : (
                <BlurView
                  tint="systemUltraThinMaterialDark"
                  intensity={80}
                  style={styles.changeFileGlass}
                >
                  <Ionicons name="repeat" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.changeFileText}>Change</Text>
                </BlurView>
              )}
            </View>
          </>
        ) : (
          // Non-image file preview
          <View style={styles.filePreviewInner}>
            <View style={styles.fileIconRing}>
              <Ionicons name="document" size={36} color="rgba(255,255,255,0.82)" />
            </View>
            <Text style={styles.filePreviewName} numberOfLines={2}>
              {file.name}
            </Text>
            <View style={styles.changeFilePill}>
              <Ionicons name="repeat" size={13} color="rgba(255,255,255,0.72)" />
              <Text style={styles.changeFilePillText}>Tap to change</Text>
            </View>
          </View>
        )
      ) : (
        // Empty state
        <View style={styles.emptyInner}>
          <Image
            source={contentDeliveryImage}
            style={styles.emptyImage}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.emptyTextBlock}>
            <Text style={styles.emptyTitle}>Upload your final asset</Text>
            <Text style={styles.emptySubtitle}>Tap to choose a file from your device</Text>
          </View>
          <View style={styles.emptyChip}>
            <Ionicons name="cloud-upload-outline" size={14} color="rgba(255,255,255,0.72)" />
            <Text style={styles.emptyChipText}>Choose file</Text>
          </View>
        </View>
      )}
    </Pressable>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={shell}>
        {inner}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={72} style={shell}>
      {inner}
    </BlurView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DeliveryScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const mutations = useMarketplaceMutations();

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    setSelectedFile({ uri: file.uri, name: file.name, mimeType: file.mimeType ?? undefined });
  };

  const submit = async () => {
    if (!selectedFile) {
      Alert.alert('Choose a file', 'Select the final delivery asset before submitting.');
      return;
    }
    try {
      const upload = await mutations.uploadDelivery.mutateAsync({ campaignId, file: selectedFile });
      await mutations.submitDelivery.mutateAsync({
        campaignId,
        storagePath: upload.storage_path,
        notes,
      });
      router.back();
    } catch (error) {
      Alert.alert('Delivery failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const isPending = mutations.uploadDelivery.isPending || mutations.submitDelivery.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      <View style={[styles.content, { paddingTop: insets.top + theme.spacing.xl }]}>
        {/* ── Header ── */}
        <BackHeader
          title="Submit"
          onBack={() => {
            router.back();
          }}
          style={styles.pageHeaderRow}
        />

        <Text style={styles.pageSubtitle}>
          Upload the final asset with clear notes for approval.
        </Text>

        {/* ── Asset card — flex:1 fills all remaining space ── */}
        <AssetCard file={selectedFile} onPress={pickFile} />

        {/* ── Notes ── */}
        <AppInput
          label="Add context"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add context that you want to say to the brand — links, notes, or anything they should know."
          autoGrow={{ minHeight: 110, maxHeight: 220 }}
          inputStyle={styles.notesInput}
          autoCorrect
        />
      </View>

      {/* ── Sticky footer ── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.md },
        ]}
      >
        <PrimaryButton
          label={
            mutations.uploadDelivery.isPending
              ? 'Uploading...'
              : mutations.submitDelivery.isPending
                ? 'Submitting...'
                : 'Submit Delivery'
          }
          disabled={isPending}
          onPress={submit}
          style={styles.submitButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  pageHeaderRow: {
    marginBottom: -theme.spacing.xs,
  },

  pageSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.54)',
  },

  // ── Asset card ──
  assetCardShell: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  assetCardPressable: {
    flex: 1,
  },
  pressed: {
    opacity: 0.78,
  },

  // ── Empty state ──
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyImage: {
    width: 80,
    height: 80,
  },
  emptyTextBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyTitle: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.48)',
    textAlign: 'center',
  },
  emptyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptyChipText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
  },

  // ── Image file preview ──
  fileNameBadge: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  fileNameGlass: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  fileNameText: {
    ...theme.typography.label,
    color: theme.colors.foreground,
    fontWeight: '600',
  },
  changeFileBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  changeFileGlass: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  changeFileText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },

  // ── Non-image file preview ──
  filePreviewInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  fileIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewName: {
    ...theme.typography.cardTitle,
    color: theme.colors.foreground,
    textAlign: 'center',
  },
  changeFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  changeFilePillText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '600',
  },

  notesInput: {
    textAlignVertical: 'top',
  },

  // ── Footer ──
  footer: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  submitButton: {
    alignSelf: 'stretch',
  },
});
