import { AppInput } from '@/components/ui/app-input';
import { type TextInputProps } from 'react-native';

export type GlassSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  loading?: boolean;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  returnKeyType?: TextInputProps['returnKeyType'];
  spellCheck?: boolean;
};

export function GlassSearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel = 'Search campaigns',
  autoCapitalize = 'none',
  autoCorrect = false,
  loading = false,
  onSubmitEditing,
  returnKeyType = 'search',
  spellCheck = false,
}: GlassSearchFieldProps) {
  return (
    <AppInput
      variant="search"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={accessibilityLabel}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
      loading={loading}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={returnKeyType}
    />
  );
}
