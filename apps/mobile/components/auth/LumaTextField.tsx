import { AppInput } from '@/components/ui/app-input';
import { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

type Props = TextInputProps;

export const LumaTextField = forwardRef<TextInput, Props>(function LumaTextField(
  { style, ...props },
  ref,
) {
  return <AppInput ref={ref} {...props} inputStyle={style} />;
});
