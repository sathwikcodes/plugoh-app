import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { Card, LabeledField, PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { supabase } from "@/lib/supabase/client";

export default function EmailScreen() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const handleNext = async () => {
    if (!isValidEmail || isSending) return;
    setIsSending(true);
    const cleaned = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleaned,
      options: { shouldCreateUser: true },
    });
    setIsSending(false);
    if (error) {
      Alert.alert("Could not send code", error.message);
      return;
    }
    router.push({ pathname: "/(auth)/verify", params: { email: cleaned } });
  };

  return (
    <Screen>
      <SectionTitle title="Continue with Email" subtitle="Enter your email to receive a one-time sign in code." />
      <Card>
        <LabeledField
          value={email}
          onChangeText={setEmail}
          label="Email address"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton label={isSending ? "Sending..." : "Send code"} onPress={handleNext} disabled={!isValidEmail || isSending} />
      </Card>
    </Screen>
  );
}
