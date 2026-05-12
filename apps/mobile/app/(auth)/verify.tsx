import { AnimatedPillButton } from '@/components/auth/AnimatedPillButton';
import { OtpInputRow } from '@/components/auth/OtpInputRow';
import { authTypography } from '@/components/auth/typography';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { Feather } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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

export default function VerifyScreen() {
  const headerHeight = useHeaderHeight();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const normalizedToken = useMemo(() => token.replace(/\D/g, '').slice(0, CODE_LENGTH), [token]);
  const canContinue = normalizedToken.length === CODE_LENGTH;

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
          <Pressable style={styles.resendButton}>
            <Text style={styles.resendText}>Resend code</Text>
          </Pressable>
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
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.foreground,
  },
  subheading: {
    ...authTypography.body,
    fontSize: 15,
    lineHeight: 22,
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
  },
  resendText: {
    ...authTypography.body,
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
