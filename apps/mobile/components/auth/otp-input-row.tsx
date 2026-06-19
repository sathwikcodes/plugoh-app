import { authTypography } from '@/components/auth/typography';
import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  value: string;
  length?: number;
  onChange: (value: string) => void;
};

export function OtpInputRow({ value, length = 6, onChange }: Props) {
  const inputRef = useRef<TextInput>(null);

  const normalized = useMemo(() => value.replace(/\D/g, '').slice(0, length), [length, value]);

  return (
    <Pressable style={styles.wrapper} onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        value={normalized}
        onChangeText={(next) => {
          onChange(next.replace(/\D/g, '').slice(0, length));
        }}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
      />
      <View style={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const digit = normalized[index];
          const isActive = index === normalized.length && normalized.length < length;

          return (
            <Pressable
              key={index}
              style={[styles.box, isActive && styles.activeBox]}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={digit ? styles.digit : styles.placeholder}>{digit || '0'}</Text>
            </Pressable>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    padding: 16,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  box: {
    width: 46,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeBox: {
    borderColor: '#FFFFFF',
  },
  placeholder: {
    ...authTypography.mono,
    fontSize: 24,
    lineHeight: 28,
    color: '#444444',
  },
  digit: {
    ...authTypography.mono,
    fontSize: 24,
    lineHeight: 28,
    color: '#FFFFFF',
  },
});
