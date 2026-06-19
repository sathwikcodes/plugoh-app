import { AnimatedPillButton } from '@/components/auth/animated-pill-button';
import { OtpInputRow } from '@/components/auth/otp-input-row';
import { authTypography } from '@/components/auth/typography';
import { theme } from '@/constants/theme';
import { sendEmailOtp } from '@/lib/auth/otp';
import { supabase } from '@/lib/supabase/client';
import { Feather } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyScreen() {
  const headerHeight = useHeaderHeight();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const normalizedToken = useMemo(() => token.replace(/\D/g, '').slice(0, CODE_LENGTH), [token]);
  const canContinue = normalizedToken.length === CODE_LENGTH;
  const canResend = Boolean(email) && !isResending && resendSeconds === 0;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [resendSeconds]);

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Go back and request a fresh code.');
      return;
    }
    if (!canContinue || isVerifying) return;

    setIsVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: normalizedToken,
      type: 'email',
    });
    setIsVerifying(false);

    if (error) {
      Alert.alert('Verification failed', error.message);
      return;
    }
    router.replace('/');
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Missing email', 'Go back and request a fresh code.');
      return;
    }
    if (!canResend) return;

    setIsResending(true);
    setResendMessage(null);
    try {
      await sendEmailOtp(email);
      setToken('');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setResendMessage('A fresh code is on its way.');
    } catch (error) {
      setResendSeconds(10);
      Alert.alert('Could not resend code', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { paddingTop: headerHeight + 20 }]}>
          <View style={styles.iconCircle}>
            <Feather name="message-circle" size={28} color={theme.colors.foreground} />
          </View>

          <Text style={styles.heading}>Enter Code</Text>
          <Text style={styles.subheading}>
            We sent a verification code to your email{'\n'}
            <Text style={styles.emailText}>{email ?? 'your email'}</Text>
          </Text>

          <OtpInputRow value={normalizedToken} onChange={setToken} length={CODE_LENGTH} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resend verification code"
            disabled={!canResend}
            style={({ pressed }) => [
              styles.resendButton,
              pressed && canResend && styles.resendPressed,
              !canResend && styles.resendDisabled,
            ]}
            onPress={handleResend}
          >
            <Text style={styles.resendText}>
              {isResending
                ? 'Sending...'
                : resendSeconds > 0
                  ? `Resend code in ${resendSeconds}s`
                  : 'Resend code'}
            </Text>
          </Pressable>
          {resendMessage ? <Text style={styles.resendMessage}>{resendMessage}</Text> : null}
        </View>

        <View style={styles.footer}>
          <AnimatedPillButton
            label={isVerifying ? 'Verifying...' : 'Next'}
            onPress={handleVerify}
            active={canContinue && !isVerifying}
            loading={isVerifying}
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
    gap: 14,
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
  emailText: {
    color: theme.colors.foreground,
    ...authTypography.bodyStrong,
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 2,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendPressed: {
    opacity: 0.76,
  },
  resendDisabled: {
    opacity: 0.58,
  },
  resendText: {
    ...authTypography.caption,
    color: theme.colors.muted,
  },
  resendMessage: {
    ...authTypography.caption,
    color: theme.colors.success,
    textAlign: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
