import { GetStartedModal } from '@/components/auth/GetStartedModal';
import { OrbitalComposition } from '@/components/auth/OrbitalComposition';
import { authTypography } from '@/components/auth/typography';
import { signInWithSupabaseGoogle, userMessageForGoogleAuth } from '@/lib/auth/google';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await signInWithSupabaseGoogle();
      router.replace('/');
    } catch (error) {
      const message = userMessageForGoogleAuth(error);
      if (message !== 'Google sign-in was cancelled.') {
        Alert.alert('Google sign-in unavailable', message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#050509', '#0a0a12']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroWrap}>
          <OrbitalComposition />
        </View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.bottomContent}>
          <View style={styles.brandLockup}>
            <Text style={styles.brand}>plugoh</Text>
            <View style={styles.brandSpark} />
          </View>
          <Text style={styles.title}>Book creators with confidence</Text>

          <MaskedView
            maskElement={<Text style={styles.subtitleMask}>Escrow-backed campaigns</Text>}
          >
            <LinearGradient
              colors={['#5B7FFF', '#E84B8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.subtitleMask, styles.subtitleHidden]}>
                Escrow-backed campaigns
              </Text>
            </LinearGradient>
          </MaskedView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
            onPress={() => {
              void Haptics.selectionAsync();
              setModalVisible(true);
            }}
          >
            <Text style={styles.ctaLabel}>Get Started</Text>
          </Pressable>
        </Animated.View>

        <GetStartedModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
          }}
          onEmail={() => {
            setModalVisible(false);
            router.push('/(auth)/email');
          }}
          onGoogle={async () => {
            setModalVisible(false);
            await handleGoogle();
          }}
          googleLoading={isGoogleLoading}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  heroWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 10,
  },
  brand: {
    ...authTypography.displaySm,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  brandLockup: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  brandSpark: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginLeft: 5,
    marginTop: 2,
    backgroundColor: '#E76A92',
    transform: [{ rotate: '45deg' }],
  },
  title: {
    ...authTypography.displayLg,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitleMask: {
    ...authTypography.section,
    textAlign: 'center',
  },
  subtitleHidden: {
    opacity: 0,
  },
  ctaButton: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    ...authTypography.bodyStrong,
    color: '#0D0D0D',
  },
});
