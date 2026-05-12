import { authTypography } from '@/components/auth/typography';
import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';

type Props = TextInputProps;

export const LumaTextField = forwardRef<TextInput, Props>(function LumaTextField(props, ref) {
  return <TextInput ref={ref} placeholderTextColor="#444444" style={styles.input} {...props} />;
});

const styles = StyleSheet.create({
  input: {
    ...authTypography.body,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
