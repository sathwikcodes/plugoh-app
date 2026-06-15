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
    // Lift the (transparent) scroll content above the background layer with a
    // positive zIndex instead of pushing the background to a NEGATIVE zIndex.
    // Inside NativeTabs the tab screen has an opaque native backing; a negative
    // zIndex child (the SVG canvas) sinks behind it and gets covered, leaving
    // only the solid backgroundDeep color. Keeping both layers at >= 0 keeps the
    // canvas visible while preserving scrollHost as the first declared child
    // (required for RN Screens to discover the tab ScrollView).
    zIndex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
