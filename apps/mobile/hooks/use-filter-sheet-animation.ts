import { HIDDEN_OFFSET } from '@/components/inbox/filter-sheet/styles';
import type { SheetPage } from '@/lib/inbox/filter-options';
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated } from 'react-native';

/**
 * Drives the premium filter sheet's mount/visibility spring and the cross-fade
 * page transition. No-op (but hook order preserved) when `enabled` is false.
 */
export function useFilterSheetAnimation({
  visible,
  enabled,
}: {
  visible: boolean;
  enabled: boolean;
}) {
  const [mounted, setMounted] = useState(visible);
  const [page, setPage] = useState<SheetPage>('main');
  const translateY = useRef(new RNAnimated.Value(HIDDEN_OFFSET)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const pageOpacity = useRef(new RNAnimated.Value(1)).current;
  const pageTranslateX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;

    if (visible) {
      setMounted(true);
      setPage('main');
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        RNAnimated.spring(translateY, {
          toValue: 0,
          speed: 22,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    RNAnimated.parallel([
      RNAnimated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }),
      RNAnimated.timing(translateY, {
        toValue: HIDDEN_OFFSET,
        duration: 170,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [enabled, opacity, translateY, visible]);

  function navigate(nextPage: SheetPage) {
    RNAnimated.parallel([
      RNAnimated.timing(pageOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      RNAnimated.timing(pageTranslateX, {
        toValue: nextPage === 'main' ? 14 : -14,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPage(nextPage);
      pageTranslateX.setValue(nextPage === 'main' ? -10 : 10);
      RNAnimated.parallel([
        RNAnimated.timing(pageOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        RNAnimated.timing(pageTranslateX, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    });
  }

  return { mounted, page, navigate, translateY, opacity, pageOpacity, pageTranslateX };
}
