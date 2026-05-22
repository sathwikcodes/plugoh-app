import { authTypography } from '@/components/auth/typography';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onEmail: () => void;
  onGoogle: () => void;
  googleLoading?: boolean;
};

export function GetStartedModal({
  visible,
  onClose,
  onEmail,
  onGoogle,
  googleLoading = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (!visible) {
      translateY.setValue(500);
      return;
    }
    Animated.spring(translateY, {
      toValue: 0,
      speed: 20,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlayTint} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              marginHorizontal: 8,
              marginBottom: 8,
              paddingBottom: 20 + insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.logoCircle}>
              <View style={styles.logoDiamond} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sign-in options"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={18} color="#666666" />
            </Pressable>
          </View>

          <Text style={styles.heading}>Start with Plugoh</Text>
          <Text style={styles.body}>
            Sign in to book creators, manage delivery, and keep campaign payments protected.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with email"
            style={({ pressed }) => [styles.button, styles.emailButton, pressed && styles.pressed]}
            onPress={onEmail}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </Pressable>

          <View style={styles.socialRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={({ pressed }) => [
                styles.socialButton,
                pressed && !googleLoading && styles.pressed,
                googleLoading && styles.disabled,
              ]}
              disabled={googleLoading}
              onPress={onGoogle}
            >
              <Ionicons name="logo-google" size={20} color="#FFFFFF" />
              <Text style={styles.socialText}>
                {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
              </Text>
              {googleLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
            </Pressable>
          </View>

          <Text style={styles.footnote}>
            By continuing, you agree to Plugoh&apos;s Terms of Service.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#181818',
    borderRadius: 34,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' } : null),
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#333333',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDiamond: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E76A92',
    transform: [{ rotate: '45deg' }],
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  heading: {
    ...authTypography.displaySm,
    fontSize: 22,
    lineHeight: 30,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  body: {
    ...authTypography.body,
    fontSize: 14,
    lineHeight: 21,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: '#252525',
  },
  emailButtonText: {
    ...authTypography.bodyStrong,
    color: '#FFFFFF',
    fontSize: 17,
  },
  socialRow: {
    marginTop: 2,
    marginBottom: 18,
  },
  socialButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabled: {
    opacity: 0.62,
  },
  socialText: {
    ...authTypography.bodyStrong,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  footnote: {
    ...authTypography.fine,
    textAlign: 'center',
    fontSize: 11.5,
    lineHeight: 16,
    color: '#FFFFFF',
  },
});
