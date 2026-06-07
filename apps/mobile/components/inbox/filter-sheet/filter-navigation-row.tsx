import { filterSheetStyles as styles } from '@/components/inbox/filter-sheet/styles';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  onPress: () => void;
};

/** A tappable row on the main page that drills into a sort/status option page. */
export function FilterNavigationRow({ label, value, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.62)" />
      </View>
    </Pressable>
  );
}
