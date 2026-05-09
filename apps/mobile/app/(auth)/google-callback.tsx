import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { theme } from "@/constants/theme";

export default function GoogleCallbackScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();

  useEffect(() => {
    if (!url) return;
    void WebBrowser.openAuthSessionAsync(url, "plugoh://google-callback").then(() => {
      router.replace("/");
    });
  }, [url]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
      <ActivityIndicator color={theme.colors.accentStrong} />
    </View>
  );
}
