declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}

declare module '*.otf' {
  const value: import('expo-font').FontSource;
  export default value;
}
