import { AnimatedPillButton } from '@/components/auth/AnimatedPillButton';
import { LumaTextField } from '@/components/auth/LumaTextField';
import { authTypography } from '@/components/auth/typography';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
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
    const cleaned = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleaned,
      options: { shouldCreateUser: true },
    });
    setIsSending(false);
    if (error) {
      Alert.alert('Could not send code', error.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { email: cleaned } });
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
          <Text style={styles.subheading}>Sign in or sign up with your email.</Text>

          <LumaTextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
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
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
