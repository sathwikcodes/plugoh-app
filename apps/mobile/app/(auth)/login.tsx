import { GetStartedModal } from '@/components/auth/GetStartedModal';
import { OrbitalComposition } from '@/components/auth/OrbitalComposition';
import { authTypography } from '@/components/auth/typography';
import { supabase } from '@/lib/supabase/client';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const handleGoogle = async () => {
    const redirectTo = 'plugoh://google-callback';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      Alert.alert('Google sign-in unavailable', error.message);
      return;
    }
    if (data.url) {
      router.push({ pathname: '/(auth)/google-callback', params: { url: data.url } });
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
            <Text style={styles.brandSpark}>✦</Text>
          </View>
          <Text style={styles.title}>Delightful Events</Text>

          <MaskedView maskElement={<Text style={styles.subtitleMask}>Start Here</Text>}>
            <LinearGradient
              colors={['#5B7FFF', '#E84B8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.subtitleMask, styles.subtitleHidden]}>Start Here</Text>
            </LinearGradient>
          </MaskedView>

          <Pressable
            style={styles.ctaButton}
            onPress={() => {
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
    fontSize: 26,
    lineHeight: 30,
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
    ...authTypography.displaySm,
    marginLeft: 2,
    marginTop: 1,
    fontSize: 12,
    lineHeight: 14,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  title: {
    ...authTypography.displayLg,
    fontSize: 32,
    lineHeight: 40,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitleMask: {
    ...authTypography.bodyStrong,
    fontSize: 20,
    lineHeight: 26,
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
  ctaLabel: {
    ...authTypography.bodyStrong,
    fontSize: 17,
    lineHeight: 22,
    color: '#0D0D0D',
  },
});
