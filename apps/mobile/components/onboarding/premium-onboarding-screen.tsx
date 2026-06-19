import plugohLogo from '@/assets/images/logo.png';
import instagramImage from '@/assets/images/instagram.png';
import brandImage from '@/assets/images/locker.png';
import locationImage from '@/assets/images/location.png';
import { AppInput } from '@/components/ui/app-input';
import { PremiumEarningsGradientCard } from '@/components/ui/premium-earnings-gradient-card';
import { theme } from '@/constants/theme';
import { instagramConnect } from '@/lib/api/endpoints';
import { clearBasicsDraft, getBasicsDraft, setBasicsDraft } from '@/lib/onboarding/basics-draft';
import {
  onboardingLocationChannel,
  type LocationSelection,
} from '@/lib/location/location-selection';
import {
  BRAND_CATEGORY_OPTIONS,
  DEFAULT_PREMIUM_ONBOARDING_VALUES,
  buildBusinessOnboardingPayload,
  buildInfluencerOnboardingPayload,
  hasSelectedLocationCoordinates,
  isPrimaryActionEnabled,
  needsRoleBeforeInstagram,
  primaryActionLabel,
  type BrandCategory,
  type BrandInstagramChoice,
  type PremiumOnboardingValues,
} from '@/lib/onboarding/premium-flow';
import { getPreferredRole, setPreferredRole } from '@/lib/onboarding/role-preference';
import { useAuthStore } from '@/store/auth';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { UserRole } from '@plugoh/contracts';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type TextInputProps,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBootstrap, useMarketplaceMutations } from '@/hooks/use-marketplace';

export type PremiumOnboardingStage =
  | 'entry'
  | 'basics'
  | 'brand-choice'
  | 'brand-details'
  | 'instagram-connect';

type PremiumOnboardingScreenProps = {
  stage: PremiumOnboardingStage;
};

type RouterTarget = Parameters<typeof router.replace>[0];

const ROLE_INDEX: Record<UserRole, number> = {
  influencer: 0,
  business: 1,
};
const SEGMENT_GAP = 12;
const SEGMENT_PADDING = 6;
const FIELD_HEIGHT = 60;

function useReduceMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      subscription.remove();
    };
  }, []);

  return reduced;
}

function nextRouteAfterInstagram(role: UserRole, stage: PremiumOnboardingStage): RouterTarget {
  if (role === 'business' && stage !== 'instagram-connect') return '/(onboarding)/brand-details';
  return '/(onboarding)/ai-generating';
}

function LiquidFieldShell({ children }: { children: ReactNode }) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.fieldShell}>
        <View style={styles.fieldContent}>{children}</View>
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemUltraThinMaterialDark" intensity={88} style={styles.fieldShell}>
      <View style={styles.fieldContent}>{children}</View>
    </BlurView>
  );
}

function PremiumField({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <AppInput
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? label}
      inputStyle={style}
    />
  );
}

function IndiaFlagIcon() {
  return (
    <Svg width={36} height={24} viewBox="0 0 60 40" accessibilityLabel="India flag">
      <Rect width={60} height={40} rx={5} fill="#FFFFFF" />
      <Rect width={60} height={13.33} rx={5} fill="#FF9933" />
      <Rect y={26.67} width={60} height={13.33} rx={5} fill="#138808" />
      <Rect y={10} width={60} height={20} fill="#FFFFFF" />
      <Circle cx={30} cy={20} r={5.1} fill="none" stroke="#000080" strokeWidth={1.15} />
      <G stroke="#000080" strokeWidth={0.5} strokeLinecap="round">
        {Array.from({ length: 12 }, (_, index) => {
          const angle = (index * Math.PI) / 6;
          return (
            <Line
              key={index}
              x1={30}
              y1={20}
              x2={30 + Math.cos(angle) * 5}
              y2={20 + Math.sin(angle) * 5}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function PremiumPhoneField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.phoneRow}>
      <LiquidFieldShell>
        <View
          accessibilityLabel="India country code"
          accessibilityRole="text"
          style={styles.countryCodeBox}
        >
          <IndiaFlagIcon />
        </View>
      </LiquidFieldShell>

      <AppInput
        containerStyle={styles.phoneNumberBox}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel="Phone number"
        placeholder="Mobile number"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
      />
    </View>
  );
}

function PremiumLocationField({
  disabled,
  label,
  value,
  onPress,
}: {
  disabled: boolean;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <LiquidFieldShell>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `${label}: ${value}` : label}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.locationButton,
            pressed && !disabled ? styles.pressedSoft : null,
          ]}
        >
          <Image
            source={locationImage}
            style={styles.locationIcon}
            contentFit="contain"
            accessibilityElementsHidden
          />
          <Text
            numberOfLines={1}
            style={[styles.locationText, value ? null : styles.locationPlaceholder]}
          >
            {value || 'Choose on map'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.62)" />
        </Pressable>
      </LiquidFieldShell>
    </View>
  );
}

function RoleSegment({
  role,
  disabled,
  reduceMotion,
  onChange,
}: {
  role: UserRole;
  disabled: boolean;
  reduceMotion: boolean;
  onChange: (role: UserRole) => void;
}) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(ROLE_INDEX[role]);
  const thumbWidth = width > 0 ? (width - SEGMENT_PADDING * 2 - SEGMENT_GAP) / 2 : 0;

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(ROLE_INDEX[role], {
          duration: 0,
          easing: Easing.out(Easing.cubic),
        })
      : withSpring(ROLE_INDEX[role], {
          damping: 20,
          mass: 0.78,
          stiffness: 190,
        });
  }, [progress, reduceMotion, role]);

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: width > 0 ? 1 : 0,
    transform: [{ translateX: SEGMENT_PADDING + progress.value * (thumbWidth + SEGMENT_GAP) }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View onLayout={handleLayout} style={styles.segment}>
      <Animated.View
        pointerEvents="none"
        style={[styles.segmentThumb, { width: thumbWidth }, thumbStyle]}
      />
      <SegmentTab
        active={role === 'influencer'}
        disabled={disabled}
        icon={<Image source={instagramImage} style={styles.segmentImage} contentFit="contain" />}
        label="Influencer"
        onPress={() => {
          onChange('influencer');
        }}
      />
      <SegmentTab
        active={role === 'business'}
        disabled={disabled}
        icon={<Image source={brandImage} style={styles.segmentImage} contentFit="contain" />}
        label="Brand"
        onPress={() => {
          onChange('business');
        }}
      />
    </View>
  );
}

function SegmentTab({
  active,
  disabled,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentTab,
        active ? styles.segmentTabActive : styles.segmentTabInactive,
        pressed && !disabled ? styles.pressedSoft : null,
      ]}
    >
      {icon}
      <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ChoiceButton({
  active,
  disabled,
  label,
  onPress,
  tone,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  tone: 'green' | 'red';
}) {
  const shellStyle = tone === 'green' ? styles.choiceShellGreen : styles.choiceShellRed;
  const activeStyle = tone === 'green' ? styles.choiceActiveGreen : styles.choiceActiveRed;
  const content = (
    <View style={[styles.choiceButton, shellStyle, active ? activeStyle : null]}>
      <Text style={styles.choiceText}>{label}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceShell,
        pressed && !disabled ? styles.pressedSoft : null,
      ]}
    >
      {isLiquidGlassAvailable() ? (
        <GlassView
          isInteractive
          glassEffectStyle="regular"
          colorScheme="dark"
          style={styles.choiceGlass}
        >
          {content}
        </GlassView>
      ) : (
        <BlurView tint="systemUltraThinMaterialDark" intensity={92} style={styles.choiceGlass}>
          {content}
        </BlurView>
      )}
    </Pressable>
  );
}

function BrandCategorySelector({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean;
  value: BrandCategory;
  onChange: (value: BrandCategory) => void;
}) {
  const selectedLabel =
    BRAND_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? 'Select category';

  const openCategoryPicker = () => {
    if (disabled) return;
    void Haptics.selectionAsync();

    if (Platform.OS === 'ios') {
      const optionLabels = BRAND_CATEGORY_OPTIONS.map((option) => option.label);
      const cancelIndex = optionLabels.length;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Brand category',
          options: [...optionLabels, 'Cancel'],
          cancelButtonIndex: cancelIndex,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex === cancelIndex) return;
          onChange(BRAND_CATEGORY_OPTIONS[buttonIndex].value);
        },
      );
      return;
    }

    Alert.alert(
      'Brand category',
      undefined,
      [
        ...BRAND_CATEGORY_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () => {
            onChange(option.value);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
      { cancelable: true },
    );
  };

  return (
    <View style={styles.fieldWrap}>
      <LiquidFieldShell>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Brand category"
          accessibilityValue={{ text: selectedLabel }}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={openCategoryPicker}
          style={({ pressed }) => [
            styles.categorySelector,
            pressed && !disabled ? styles.pressedSoft : null,
          ]}
        >
          <Text style={styles.categorySelectorText} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.66)" />
        </Pressable>
      </LiquidFieldShell>
    </View>
  );
}

function PrimaryOnboardingButton({
  disabled,
  label,
  loading,
  showInstagramIcon,
  onPress,
}: {
  disabled: boolean;
  label: string;
  loading: boolean;
  showInstagramIcon: boolean;
  onPress: () => void;
}) {
  const content = (
    <View style={styles.primarySurfaceContent}>
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
      {showInstagramIcon ? (
        <Image
          source={instagramImage}
          style={styles.buttonIcon}
          contentFit="contain"
          accessibilityElementsHidden
        />
      ) : null}
      <Text style={styles.primaryLabel}>{label}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled ? styles.primaryButtonDisabled : null,
        pressed && !disabled ? styles.primaryPressed : null,
      ]}
    >
      <PremiumEarningsGradientCard style={styles.primarySurface}>
        {content}
      </PremiumEarningsGradientCard>
    </Pressable>
  );
}

export function PremiumOnboardingScreen({ stage }: PremiumOnboardingScreenProps) {
  const reduceMotion = useReduceMotion();
  const session = useAuthStore((state) => state.session);
  const bootstrap = useBootstrap();
  const mutations = useMarketplaceMutations();
  const initialRole = bootstrap.data?.role ?? getPreferredRole() ?? 'influencer';
  const [role, setRole] = useState<UserRole>(stage === 'brand-details' ? 'business' : initialRole);
  const [brandInstagramChoice, setBrandInstagramChoice] = useState<BrandInstagramChoice>(
    stage === 'brand-details' ? 'no' : null,
  );
  const [values, setValues] = useState<PremiumOnboardingValues>(DEFAULT_PREMIUM_ONBOARDING_VALUES);
  const [busy, setBusy] = useState(false);

  const applyLocationSelection = useCallback((selection: LocationSelection) => {
    setValues((current) => ({
      ...current,
      location: selection.label,
      location_label: selection.label,
      location_latitude: selection.latitude,
      location_longitude: selection.longitude,
    }));
  }, []);

  useEffect(() => {
    if (stage === 'brand-details') {
      setRole('business');
      setBrandInstagramChoice('no');
      return;
    }
    if (bootstrap.data?.role) {
      setRole(bootstrap.data.role);
    }
  }, [bootstrap.data?.role, stage]);

  useEffect(() => {
    const draft = getBasicsDraft();
    if (!draft) return;
    setValues((current) => ({
      ...current,
      full_name: draft.full_name,
      phone: draft.phone,
      location: draft.location,
      location_label: draft.location_label ?? draft.location,
      location_latitude: draft.location_latitude ?? null,
      location_longitude: draft.location_longitude ?? null,
    }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      const selection = onboardingLocationChannel.consume();
      if (selection) applyLocationSelection(selection);
    }, [applyLocationSelection]),
  );

  const roleLocked = stage === 'brand-details';
  const needsCommonProfile = stage !== 'instagram-connect' && stage !== 'brand-details';
  const needsBrandDetails =
    role === 'business' && (stage === 'brand-details' || brandInstagramChoice === 'no');
  const showInstagramQuestion =
    role === 'business' && stage !== 'brand-details' && stage !== 'instagram-connect';
  const showCommonFields =
    needsCommonProfile && (role !== 'business' || brandInstagramChoice !== 'no');
  const showBrandDetails = needsBrandDetails;
  const showPrimaryButton =
    role === 'influencer' ||
    stage === 'instagram-connect' ||
    stage === 'brand-details' ||
    brandInstagramChoice !== null;
  const isLoading =
    busy || mutations.onboarding.isPending || mutations.businessOnboarding.isPending;
  const primaryEnabled = isPrimaryActionEnabled({
    role,
    values,
    brandInstagramChoice,
    needsCommonProfile,
    needsBrandDetails,
  });
  const label = primaryActionLabel({
    role,
    brandInstagramChoice,
    needsBrandDetails,
    loading: isLoading,
  });

  const setField = useCallback(
    <Key extends keyof PremiumOnboardingValues>(key: Key, value: PremiumOnboardingValues[Key]) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const changeRole = (nextRole: UserRole) => {
    if (role === nextRole || roleLocked || busy) return;
    setRole(nextRole);
    setPreferredRole(nextRole);
    setBrandInstagramChoice(nextRole === 'influencer' ? null : brandInstagramChoice);
    void Haptics.selectionAsync();
  };

  const openLocationPicker = () => {
    if (busy) return;
    void Haptics.selectionAsync();
    router.push('/(onboarding)/location-picker');
  };

  const connectInstagram = async (selectedRole: UserRole, nextRoute: RouterTarget) => {
    if (!session?.user.id) {
      Alert.alert('Session unavailable', 'Sign in again, then continue onboarding.');
      return;
    }
    const { url } = await instagramConnect(session.user.id, selectedRole);
    const result = await WebBrowser.openAuthSessionAsync(url, 'plugoh://instagram/callback');
    if (result.type === 'success') {
      router.replace(nextRoute);
    }
  };

  const submitInfluencer = async () => {
    setPreferredRole('influencer');
    if (needsCommonProfile) {
      await mutations.onboarding.mutateAsync(buildInfluencerOnboardingPayload(values));
    } else if (needsRoleBeforeInstagram()) {
      await mutations.setRole.mutateAsync({ role: 'influencer' });
    }
    await connectInstagram('influencer', nextRouteAfterInstagram('influencer', stage));
  };

  const submitBrand = async () => {
    setPreferredRole('business');
    if (needsBrandDetails) {
      if (stage === 'brand-details') {
        const patch = {
          brand_name: values.brand_name.trim(),
          brand_category: values.brand_category,
          ...(values.location.trim() ? { brand_location: values.location.trim() } : {}),
          ...(hasSelectedLocationCoordinates(values)
            ? {
                brand_latitude: values.location_latitude ?? undefined,
                brand_longitude: values.location_longitude ?? undefined,
              }
            : {}),
        };
        await mutations.updateBusinessProfile.mutateAsync(patch);
      } else {
        await mutations.businessOnboarding.mutateAsync(buildBusinessOnboardingPayload(values));
      }
      clearBasicsDraft();
      router.replace('/(app)/(brand-tabs)');
      return;
    }

    if (brandInstagramChoice !== 'yes' && stage !== 'instagram-connect') return;

    if (needsCommonProfile) {
      const common = buildInfluencerOnboardingPayload(values);
      setBasicsDraft({
        ...common,
        location_label: values.location_label,
        location_latitude: values.location_latitude,
        location_longitude: values.location_longitude,
      });
      await mutations.updateMeProfile.mutateAsync(common);
      await mutations.setRole.mutateAsync({ role: 'business' });
    } else {
      await mutations.setRole.mutateAsync({ role: 'business' });
    }
    await connectInstagram('business', nextRouteAfterInstagram('business', stage));
  };

  const handleSubmit = async () => {
    if (!primaryEnabled || isLoading) return;
    setBusy(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (role === 'influencer') {
        await submitInfluencer();
      } else {
        await submitBrand();
      }
    } catch (error) {
      Alert.alert(
        role === 'business' ? 'Could not continue brand setup' : 'Could not connect Instagram',
        error instanceof Error ? error.message : 'Check the form and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Animated.View
              entering={reduceMotion ? undefined : FadeIn.duration(360)}
              style={styles.logoWrap}
            >
              <Image
                source={plugohLogo}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="Plugoh"
              />
            </Animated.View>

            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(120).duration(420)}
              style={styles.panel}
            >
              <Text style={styles.title}>{"Let's get started"}</Text>
              <RoleSegment
                role={role}
                disabled={roleLocked || isLoading}
                reduceMotion={reduceMotion}
                onChange={changeRole}
              />

              <Animated.View
                key={stage}
                entering={reduceMotion ? undefined : FadeIn.duration(180)}
                layout={reduceMotion ? undefined : LinearTransition.duration(240)}
                style={styles.formBlock}
              >
                {showCommonFields ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeIn.duration(200)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(140)}
                    layout={reduceMotion ? undefined : LinearTransition.duration(240)}
                    style={styles.fieldGroup}
                  >
                    <PremiumField
                      label="Full name"
                      value={values.full_name}
                      onChangeText={(value) => {
                        setField('full_name', value);
                      }}
                      placeholder="Your full name"
                      textContentType="name"
                      autoComplete="name"
                      returnKeyType="next"
                    />
                    <PremiumPhoneField
                      value={values.phone}
                      onChangeText={(value) => {
                        setField('phone', value);
                      }}
                    />
                    <PremiumLocationField
                      label="City / place"
                      disabled={isLoading}
                      value={values.location}
                      onPress={openLocationPicker}
                    />
                  </Animated.View>
                ) : null}

                {showInstagramQuestion ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeIn.duration(200)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(140)}
                    layout={reduceMotion ? undefined : LinearTransition.duration(240)}
                    style={styles.choiceWrap}
                  >
                    <Text style={styles.question} numberOfLines={1}>
                      Does your brand has Instagram?
                    </Text>
                    <View style={styles.choiceRow}>
                      <ChoiceButton
                        active={brandInstagramChoice === 'yes'}
                        disabled={isLoading}
                        label="Yes"
                        tone="green"
                        onPress={() => {
                          setBrandInstagramChoice('yes');
                          void Haptics.selectionAsync();
                        }}
                      />
                      <ChoiceButton
                        active={brandInstagramChoice === 'no'}
                        disabled={isLoading}
                        label="No"
                        tone="red"
                        onPress={() => {
                          setBrandInstagramChoice('no');
                          void Haptics.selectionAsync();
                        }}
                      />
                    </View>
                  </Animated.View>
                ) : null}

                {showBrandDetails ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeIn.duration(200)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(140)}
                    layout={reduceMotion ? undefined : LinearTransition.duration(240)}
                    style={styles.brandDetails}
                  >
                    <PremiumField
                      label="Brand name"
                      value={values.brand_name}
                      onChangeText={(value) => {
                        setField('brand_name', value);
                      }}
                      placeholder="Plugoh Cafe"
                      textContentType="organizationName"
                      autoComplete="organization"
                    />
                    <BrandCategorySelector
                      disabled={isLoading}
                      value={values.brand_category}
                      onChange={(value) => {
                        setField('brand_category', value);
                      }}
                    />
                  </Animated.View>
                ) : null}
              </Animated.View>

              {showPrimaryButton ? (
                <PrimaryOnboardingButton
                  disabled={!primaryEnabled || isLoading}
                  label={label}
                  loading={isLoading}
                  onPress={handleSubmit}
                  showInstagramIcon={
                    role === 'influencer' ||
                    brandInstagramChoice === 'yes' ||
                    stage === 'instagram-connect'
                  }
                />
              ) : null}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  keyboard: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 30,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 132,
    height: 64,
  },
  panel: {
    gap: 22,
  },
  title: {
    ...theme.typography.title,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
  },
  segment: {
    minHeight: 68,
    flexDirection: 'row',
    gap: SEGMENT_GAP,
    padding: SEGMENT_PADDING,
    borderRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.075)',
    overflow: 'hidden',
  },
  segmentThumb: {
    position: 'absolute',
    top: SEGMENT_PADDING,
    bottom: SEGMENT_PADDING,
    left: 0,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(215, 163, 35, 0.72)',
    backgroundColor: 'rgba(113, 69, 14, 0.76)',
  },
  segmentTab: {
    flex: 1,
    minHeight: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    zIndex: 1,
    borderWidth: 1,
  },
  segmentTabActive: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  segmentTabInactive: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  segmentImage: {
    width: 28,
    height: 28,
  },
  segmentLabel: {
    ...theme.typography.cardTitle,
    color: 'rgba(255,255,255,0.55)',
  },
  segmentLabelActive: {
    color: '#FFFFFF',
  },
  formBlock: {
    gap: 18,
  },
  fieldGroup: {
    gap: 18,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldShell: {
    height: FIELD_HEIGHT,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  fieldContent: {
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneNumberBox: {
    flex: 1,
  },
  countryCodeBox: {
    width: 78,
    height: FIELD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  locationButton: {
    height: FIELD_HEIGHT,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  locationIcon: {
    width: 26,
    height: 26,
  },
  locationText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 20,
  },
  locationPlaceholder: {
    color: 'rgba(255,255,255,0.48)',
  },
  choiceWrap: {
    gap: 14,
  },
  question: {
    ...theme.typography.bodyStrong,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 14,
  },
  choiceShell: {
    flex: 1,
    minHeight: FIELD_HEIGHT,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  choiceGlass: {
    minHeight: FIELD_HEIGHT,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
  },
  choiceButton: {
    height: FIELD_HEIGHT,
    flex: 1,
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  choiceShellGreen: {
    borderColor: 'rgba(136,255,191,0.42)',
    backgroundColor: 'rgba(0,220,116,0.42)',
  },
  choiceShellRed: {
    borderColor: 'rgba(255,150,157,0.44)',
    backgroundColor: 'rgba(255,63,79,0.4)',
  },
  choiceActiveGreen: {
    borderColor: 'rgba(173,255,211,0.9)',
    backgroundColor: 'rgba(18,214,117,0.86)',
  },
  choiceActiveRed: {
    borderColor: 'rgba(255,190,194,0.9)',
    backgroundColor: 'rgba(255,72,88,0.88)',
  },
  choiceText: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
  },
  brandDetails: {
    gap: 17,
  },
  categorySelector: {
    height: FIELD_HEIGHT,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  categorySelectorText: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: theme.typography.body.fontFamily,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 64,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  primarySurface: {
    minHeight: 64,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  primarySurfaceContent: {
    minHeight: 64,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.46,
  },
  primaryLabel: {
    ...theme.typography.cardTitle,
    color: '#FFFFFF',
    fontSize: 18,
  },
  buttonIcon: {
    width: 24,
    height: 24,
  },
  primaryPressed: {
    transform: [{ scale: 0.985 }],
  },
  pressedSoft: {
    opacity: 0.78,
  },
});
