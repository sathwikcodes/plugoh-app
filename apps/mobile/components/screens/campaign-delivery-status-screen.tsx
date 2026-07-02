import { BackHeader } from '@/components/ui/app-header';
import { GlassCard } from '@/components/ui/glass-card';
import { ShimmerText } from '@/components/ui/shimmer';
import { TabScreenCanvas } from '@/components/ui/tab-screen-canvas';
import { theme } from '@/constants/theme';
import { useBootstrap, useCampaign, useMarketplaceMutations } from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import clockImage from '@/assets/images/clock.png';
import { Ionicons } from '@expo/vector-icons';
import type { CampaignListItem, CampaignStatus } from '@plugoh/contracts';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DeliveryDetails = {
  storage_path?: string;
  content_url?: string;
  creator_note?: string;
  notes?: string;
  change_request_note?: string;
  dispute_reason?: string;
  submitted_at?: string;
  approved_at?: string;
  changes_requested_at?: string;
  updated_at?: string;
};

const REVIEWABLE_STATUSES = new Set<CampaignStatus>(['delivery_submitted']);
const PREVIEWABLE_STATUSES = new Set<CampaignStatus>(['delivery_submitted', 'completed']);

function formatStatus(status?: string) {
  if (!status) return 'Status unavailable';
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function deliveryCopy(status?: CampaignStatus) {
  switch (status) {
    case 'delivery_submitted':
      return {
        title: 'Delivery submitted',
        subtitle: 'Preview the asset and release payment when everything looks good.',
        icon: 'sparkles' as const,
      };
    case 'completed':
      return {
        title: 'Delivery completed',
        subtitle: 'This campaign is complete and the creator payout has been released.',
        icon: 'checkmark-circle' as const,
      };
    case 'changes_requested':
      return {
        title: 'Waiting for creator update',
        subtitle: 'The creator can submit a revised delivery from their campaign page.',
        icon: 'refresh-circle' as const,
      };
    case 'in_escrow':
      return {
        title: 'Delivery Pending',
        subtitle: 'Payment is secured. The creator will submit the final asset here.',
        icon: 'time' as const,
      };
    default:
      return {
        title: formatStatus(status),
        subtitle: 'Delivery review becomes available after the creator submits the final asset.',
        icon: 'information-circle' as const,
      };
  }
}

function isDeliveryDetails(value: unknown): value is DeliveryDetails {
  return value != null && typeof value === 'object';
}

function deliveryDetailsFromCampaign(item: CampaignListItem | undefined): DeliveryDetails | null {
  if (!item || !('delivery' in item)) return null;
  const delivery = (item as { delivery?: unknown }).delivery;
  return isDeliveryDetails(delivery) ? delivery : null;
}

function ActionButton({
  label,
  icon,
  tone,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(isDisabled), busy: Boolean(loading) }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        tone === 'primary' ? styles.primaryAction : styles.secondaryAction,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={tone === 'primary' ? '#120914' : 'rgba(255,255,255,0.88)'}
        />
      ) : (
        <Ionicons
          name={icon}
          size={18}
          color={tone === 'primary' ? '#120914' : 'rgba(255,255,255,0.9)'}
        />
      )}
      <Text style={tone === 'primary' ? styles.primaryActionText : styles.secondaryActionText}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CampaignDeliveryStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const campaign = useCampaign(id);
  const mutations = useMarketplaceMutations();
  const [requestedPreviewFor, setRequestedPreviewFor] = useState<string | null>(null);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);

  const role = bootstrap.data?.role ?? 'influencer';
  const loading = shouldShowInitialLoader(bootstrap) || shouldShowInitialLoader(campaign);
  const item = campaign.data;
  const delivery = deliveryDetailsFromCampaign(item);
  const statusCopy = useMemo(() => deliveryCopy(item?.status), [item?.status]);
  const revisionNote = delivery?.change_request_note ?? delivery?.dispute_reason;
  const creatorNote = delivery?.creator_note ?? delivery?.notes;
  const hasPreviewableDelivery =
    Boolean(item?.status && PREVIEWABLE_STATUSES.has(item.status)) || Boolean(delivery);
  const canReview =
    role === 'business' && Boolean(item?.status && REVIEWABLE_STATUSES.has(item.status));
  const previewUrl = mutations.deliveryUrl.data?.signedUrl;
  const previewLoading = mutations.deliveryUrl.isPending;
  const previewUnavailable = mutations.deliveryUrl.isError;

  useEffect(() => {
    if (!id || !hasPreviewableDelivery || requestedPreviewFor === id) return;
    setRequestedPreviewFor(id);
    setImagePreviewFailed(false);
    void mutations.deliveryUrl.mutateAsync(id).catch(() => undefined);
  }, [hasPreviewableDelivery, id, mutations.deliveryUrl, requestedPreviewFor]);

  const approveDelivery = async () => {
    try {
      await mutations.approveCampaignDelivery.mutateAsync({
        id,
        idempotencyKey: `approve-${id}-${Date.now()}`,
      });
      await campaign.refetch();
    } catch (error) {
      Alert.alert('Could not approve', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const requestRevision = () => {
    Alert.alert(
      'Request revision?',
      'The creator will be asked to submit an updated delivery for this campaign.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request revision',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await mutations.disputeCampaignDelivery.mutateAsync({
                  id,
                  reason: 'Needs revision',
                });
                await campaign.refetch();
              } catch (error) {
                Alert.alert(
                  'Could not request revision',
                  error instanceof Error ? error.message : 'Try again.',
                );
              }
            })();
          },
        },
      ],
    );
  };

  const openPreview = async () => {
    if (!previewUrl) return;
    try {
      await Linking.openURL(previewUrl);
    } catch (error) {
      Alert.alert('Could not open delivery', error instanceof Error ? error.message : 'Try again.');
    }
  };

  return (
    <TabScreenCanvas>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.section,
          paddingHorizontal: theme.spacing.xxl,
        }}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          title="Delivery"
          onBack={() => {
            router.back();
          }}
          style={styles.header}
        />

        <GlassCard style={styles.heroCard} contentStyle={styles.heroContent}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.18)', 'rgba(253,29,29,0.18)', 'rgba(131,58,180,0.22)']}
            locations={[0, 0.52, 1]}
            start={{ x: 0.08, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTitleRow}>
            {loading ? (
              <>
                <ShimmerText width="62%" height={30} />
                <View style={styles.statusIcon}>
                  <Image
                    source={clockImage}
                    style={styles.clockImage}
                    contentFit="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
              </>
            ) : (
              <>
                <Text selectable style={styles.heroTitle}>
                  {statusCopy.title}
                </Text>
                <View style={styles.statusIcon}>
                  {statusCopy.icon === 'time' ? (
                    <Image
                      source={clockImage}
                      style={styles.clockImage}
                      contentFit="contain"
                      accessibilityIgnoresInvertColors
                    />
                  ) : (
                    <Ionicons name={statusCopy.icon} size={34} color="#FFFFFF" />
                  )}
                </View>
              </>
            )}
          </View>
          {loading ? (
            <ShimmerText width="88%" height={18} />
          ) : (
            <Text selectable style={styles.heroSubtitle}>
              {statusCopy.subtitle}
            </Text>
          )}
        </GlassCard>

        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Preview</Text>
            {previewUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open delivery preview"
                onPress={openPreview}
                hitSlop={8}
                style={({ pressed }) => [styles.openPreviewButton, pressed ? styles.pressed : null]}
              >
                <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.88)" />
                <Text style={styles.openPreviewText}>Open</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.previewFrame}>
            {loading || previewLoading ? (
              <View style={styles.previewState}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.previewStateText}>Loading delivery</Text>
              </View>
            ) : previewUrl && !imagePreviewFailed ? (
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel="Open delivery preview"
                onPress={openPreview}
                style={({ pressed }) => [styles.previewPressable, pressed ? styles.pressed : null]}
              >
                <Image
                  source={{ uri: previewUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  contentPosition="center"
                  onError={() => {
                    setImagePreviewFailed(true);
                  }}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.42)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.previewBadge}>
                  <Ionicons name="eye" size={14} color="#FFFFFF" />
                  <Text style={styles.previewBadgeText}>Tap to open</Text>
                </View>
              </Pressable>
            ) : previewUrl ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open delivery file"
                onPress={openPreview}
                style={({ pressed }) => [
                  styles.filePreviewFallback,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.fileIcon}>
                  <Ionicons name="document-text" size={34} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.filePreviewTitle}>Delivery file is ready</Text>
                <Text style={styles.filePreviewSubtitle}>
                  Open the signed preview to inspect the final asset.
                </Text>
              </Pressable>
            ) : previewUnavailable ? (
              <View style={styles.previewState}>
                <Ionicons name="alert-circle" size={26} color="rgba(255,255,255,0.86)" />
                <Text style={styles.previewStateText}>Delivery preview is not available yet</Text>
              </View>
            ) : (
              <View style={styles.previewState}>
                <Ionicons name="hourglass" size={26} color="rgba(255,255,255,0.72)" />
                <Text style={styles.previewStateText}>Waiting for the creator to submit</Text>
              </View>
            )}
          </View>
        </View>

        {creatorNote ? (
          <View style={styles.noteBlock}>
            <Text style={styles.sectionTitle}>Creator note</Text>
            <Text selectable style={styles.noteText}>
              {creatorNote}
            </Text>
          </View>
        ) : null}

        {revisionNote ? (
          <View style={styles.noteBlock}>
            <Text style={styles.sectionTitle}>Revision note</Text>
            <Text selectable style={styles.noteText}>
              {revisionNote}
            </Text>
          </View>
        ) : null}

        {canReview ? (
          <View style={styles.reviewActions}>
            <ActionButton
              label={mutations.disputeCampaignDelivery.isPending ? 'Requesting...' : 'Revise'}
              icon="refresh"
              tone="secondary"
              loading={mutations.disputeCampaignDelivery.isPending}
              disabled={mutations.approveCampaignDelivery.isPending}
              onPress={requestRevision}
            />
            <ActionButton
              label={
                mutations.approveCampaignDelivery.isPending ? 'Completing...' : 'Mark complete'
              }
              icon="checkmark"
              tone="primary"
              loading={mutations.approveCampaignDelivery.isPending}
              disabled={mutations.disputeCampaignDelivery.isPending}
              onPress={approveDelivery}
            />
          </View>
        ) : null}
      </ScrollView>
    </TabScreenCanvas>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  heroCard: {
    minHeight: 132,
    borderRadius: 28,
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
  },
  heroContent: {
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    overflow: 'hidden',
  },
  heroTitleRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
  },
  statusIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockImage: {
    width: 42,
    height: 42,
  },
  heroTitle: {
    ...theme.typography.display,
    flex: 1,
    minWidth: 0,
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  heroSubtitle: {
    ...theme.typography.bodyStrong,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 22,
  },
  section: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  sectionHeadingRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.headline,
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  openPreviewButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  openPreviewText: {
    ...theme.typography.label,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '800',
  },
  previewFrame: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(9,7,13,0.42)',
  },
  previewPressable: {
    flex: 1,
  },
  previewBadge: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 17,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  previewBadgeText: {
    ...theme.typography.label,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  previewState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  previewStateText: {
    ...theme.typography.bodyStrong,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '700',
  },
  filePreviewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  fileIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  filePreviewTitle: {
    ...theme.typography.headline,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  filePreviewSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    lineHeight: 22,
  },
  noteBlock: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  noteText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 24,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: 27,
    paddingHorizontal: theme.spacing.lg,
  },
  primaryAction: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    boxShadow: '0 12px 28px rgba(252,175,69,0.24)',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  primaryActionText: {
    ...theme.typography.callout,
    color: '#120914',
    fontWeight: '900',
  },
  secondaryActionText: {
    ...theme.typography.callout,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.58,
  },
});
