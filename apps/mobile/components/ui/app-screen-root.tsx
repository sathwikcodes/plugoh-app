import { AppBackground } from '@/components/ui/app-background';
import { theme } from '@/constants/theme';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type AppScreenRootProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Full-screen wrapper: hero canvas behind transparent content. */
export function AppScreenRoot({ children, style }: AppScreenRootProps) {
  return (
    <View style={[styles.root, style]}>
      <AppBackground />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
