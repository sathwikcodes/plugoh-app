import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { authTypography } from '@/components/auth/typography';

type Props = TextInputProps;

export const LumaTextField = forwardRef<TextInput, Props>(function LumaTextField(props, ref) {
  return <TextInput ref={ref} placeholderTextColor="#CCCCCC" style={styles.input} {...props} />;
});

const styles = StyleSheet.create({
  input: {
    ...authTypography.body,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
  },
});
