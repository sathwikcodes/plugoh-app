import { AnimatedPillButton } from '@/components/auth/animated-pill-button';
import { LumaTextField } from '@/components/auth/luma-text-field';
import { authTypography } from '@/components/auth/typography';
import { theme } from '@/constants/theme';
import { sendEmailOtp } from '@/lib/auth/otp';
import { Feather } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmailScreen() {
  const headerHeight = useHeaderHeight();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const handleNext = async () => {
    if (!isValidEmail || isSending) return;
    setIsSending(true);
    try {
      const cleaned = await sendEmailOtp(email);
      router.push({ pathname: '/(auth)/verify', params: { email: cleaned } });
    } catch (error) {
      Alert.alert('Could not send code', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailChange = (next: string) => {
    setEmail(next);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { paddingTop: headerHeight + 20 }]}>
          <View style={styles.iconCircle}>
            <Feather name="mail" size={28} color={theme.colors.foreground} />
          </View>

          <Text style={styles.heading}>Continue with Email</Text>
          <Text style={styles.subheading}>We’ll send a one-time code. No password needed.</Text>

          <LumaTextField
            value={email}
            onChangeText={handleEmailChange}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
            autoFocus
            accessibilityLabel="Email address"
          />
        </View>

        <View style={styles.footer}>
          <AnimatedPillButton
            label={isSending ? 'Sending...' : 'Next'}
            onPress={handleNext}
            active={isValidEmail && !isSending}
            loading={isSending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heading: {
    ...authTypography.displayMd,
    color: theme.colors.foreground,
  },
  subheading: {
    ...authTypography.body,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
