import { AppBackground } from '@/components/ui/app-background';
import { theme } from '@/constants/theme';
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const TabScreenCanvasContext = createContext(false);

/** Marks descendants as native-tab screens so `Screen` renders its own canvas. */
export function TabScreenCanvasProvider({ children }: { children: ReactNode }) {
  return <TabScreenCanvasContext.Provider value={true}>{children}</TabScreenCanvasContext.Provider>;
}

export function useTabScreenCanvas() {
  return useContext(TabScreenCanvasContext);
}

/** Local premium mesh behind native tab content (root canvas does not show through NativeTabs). */
export function TabScreenCanvas({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      {/* Must stay first: RN Screens walks only subviews[0] to find the tab ScrollView. */}
      <View style={styles.scrollHost}>{children}</View>
      <AppBackground style={styles.backgroundLayer} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.backgroundDeep,
  },
  scrollHost: {
    flex: 1,
    backgroundColor: theme.colors.backgroundClear,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
});
