import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authTypography } from '@/components/auth/typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  onEmail: () => void;
  onGoogle: () => void;
};

export function GetStartedModal({ visible, onClose, onEmail, onGoogle }: Props) {
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
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={18} color="#666666" />
            </Pressable>
          </View>

          <Text style={styles.heading}>Get Started</Text>
          <Text style={styles.body}>
            Register for events, subscribe to calendars and manage campaigns.
          </Text>

          <Pressable style={[styles.button, styles.emailButton]} onPress={onEmail}>
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </Pressable>

          <View style={styles.socialRow}>
            <Pressable style={styles.socialButton}>
              <Ionicons name="logo-apple" size={22} color="#F2EDE8" />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>

            <Pressable style={styles.socialButton} onPress={onGoogle}>
              <Ionicons name="logo-google" size={20} color="#F2EDE8" />
              <Text style={styles.socialText}>Google</Text>
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
  heading: {
    ...authTypography.displaySm,
    fontSize: 22,
    lineHeight: 30,
    color: '#F2EDE8',
    marginBottom: 8,
  },
  body: {
    ...authTypography.body,
    fontSize: 14,
    lineHeight: 21,
    color: '#9A8A83',
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
    color: '#F2EDE8',
    fontSize: 17,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
    marginBottom: 18,
  },
  socialButton: {
    flex: 1,
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
  socialText: {
    ...authTypography.bodyStrong,
    fontSize: 16,
    lineHeight: 20,
    color: '#F2EDE8',
  },
  footnote: {
    ...authTypography.fine,
    textAlign: 'center',
    fontSize: 11.5,
    lineHeight: 16,
    color: '#5A5A5A',
  },
});
