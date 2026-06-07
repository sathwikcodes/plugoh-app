import { filterSheetStyles as styles } from '@/components/inbox/filter-sheet/styles';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Props = {
  options: { value: string; label: string; description?: string }[];
  selected: string;
  onSelect: (value: string) => void;
};

/** Scrollable single-select option list (used for both the sort and status pages). */
export function FilterOptionPage({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentInner}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.groupCard}>
        {options.map((option, index) => {
          const isSelected = option.value === selected;
          return (
            <View key={option.value}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelect(option.value);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.description ? (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  ) : null}
                </View>
                <View style={[styles.optionCircle, isSelected && styles.optionCircleSelected]}>
                  {isSelected ? <Ionicons name="checkmark" size={14} color="#050509" /> : null}
                </View>
              </Pressable>
              {index < options.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
