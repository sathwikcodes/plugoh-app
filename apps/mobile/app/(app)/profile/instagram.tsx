import { GlassCard } from '@/components/ui/glass-card';
import { GlassCircleButton } from '@/components/ui/glass-circle-button';
import { PrimaryButton, SecondaryButton, StatusChip } from '@/components/ui/primitives';
import { theme } from '@/constants/theme';
import {
  useBootstrap,
  useBusinessProfile,
  useInfluencerProfile,
  useMarketplaceMutations,
} from '@/hooks/use-marketplace';
import { shouldShowInitialLoader } from '@/lib/query/loading';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCOUNT_CARD_RADIUS = 28;

export default function InstagramScreen() {
  const insets = useSafeAreaInsets();
  const bootstrap = useBootstrap();
  const role = bootstrap.data?.role;
  const profile = useInfluencerProfile();
  const businessProfile = useBusinessProfile({ enabled: role === 'business' });
  const mutations = useMarketplaceMutations();
  const activeProfile = role === 'business' ? businessProfile : profile;
  const connected = activeProfile.data?.instagram_connected;
  const username = activeProfile.data?.ig_username;
  const profileLoading =
    shouldShowInitialLoader(bootstrap) || shouldShowInitialLoader(activeProfile);
  const title = 'Instagram';
  const accountLabel = profileLoading
    ? 'Loading account status...'
    : username
      ? `@${username.replace(/^@/, '')}`
      : 'No account linked yet';
  const syncLabel = mutations.instagramSync.isPending
    ? connected
      ? 'Syncing...'
      : 'Connecting...'
    : connected
      ? 'Sync now'
      : 'Connect Instagram';
  const scrollBottomPad =
    theme.spacing.hero + theme.spacing.jumbo + theme.spacing.xxl + insets.bottom;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeaderRow}>
          <View style={styles.pageBackShadow}>
            <GlassCircleButton
              symbol="chevron.left"
              fallbackIcon="chevron-back"
              tintColor="#FFFFFF"
              size={44}
              symbolSize={19}
              accessibilityLabel="Go back"
              onPress={() => {
                router.back();
              }}
            />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.pageTitle}>{title}</Text>
          </View>
        </View>

        <GlassCard style={styles.accountCard} contentStyle={styles.accountCardInner}>
          <View style={styles.accountTopRow}>
            <View style={styles.instagramIconBox}>
              <Ionicons name="logo-instagram" size={22} color="#FFFFFF" />
            </View>
            <StatusChip
              label={profileLoading ? 'Checking...' : connected ? 'Connected' : 'Not connected'}
              status={connected ? 'success' : 'pending'}
            />
          </View>

          <View style={styles.accountCopy}>
            <Text style={styles.accountTitle}>Instagram account</Text>
            <Text style={styles.accountHandle} numberOfLines={1}>
              {accountLabel}
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.md,
          },
        ]}
      >
        <PrimaryButton
          label={syncLabel}
          disabled={profileLoading || mutations.instagramSync.isPending}
          onPress={async () => {
            try {
              await mutations.instagramSync.mutateAsync();
            } catch (error) {
              Alert.alert('Sync failed', error instanceof Error ? error.message : 'Try again.');
            }
          }}
          style={styles.footerButton}
        />
        {connected ? (
          <SecondaryButton
            label={mutations.instagramDisconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
            disabled={mutations.instagramDisconnect.isPending}
            onPress={async () => {
              try {
                await mutations.instagramDisconnect.mutateAsync();
              } catch (error) {
                Alert.alert(
                  'Disconnect failed',
                  error instanceof Error ? error.message : 'Try again.',
                );
              }
            }}
            style={styles.footerButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.section,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  pageBackShadow: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    ...theme.typography.display,
    color: theme.colors.foreground,
  },
  accountCard: {
    borderRadius: ACCOUNT_CARD_RADIUS,
    overflow: 'hidden',
  },
  accountCardInner: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  instagramIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C13584',
  },
  accountCopy: {
    gap: theme.spacing.sm,
  },
  accountTitle: {
    ...theme.typography.section,
    color: theme.colors.foreground,
  },
  accountHandle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 17,
  },
  footer: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  footerButton: {
    alignSelf: 'stretch',
  },
});
