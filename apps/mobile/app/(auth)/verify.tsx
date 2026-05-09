import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import { Card, LabeledField, PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { supabase } from "@/lib/supabase/client";

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const normalizedToken = useMemo(() => token.replace(/\D/g, "").slice(0, CODE_LENGTH), [token]);
  const canContinue = normalizedToken.length === CODE_LENGTH;

  const handleVerify = async () => {
    if (!email) {
      Alert.alert("Missing email", "Go back and request a fresh code.");
      return;
    }
    if (!canContinue || isVerifying) return;

    setIsVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: normalizedToken,
      type: "email",
    });
    setIsVerifying(false);

    if (error) {
      Alert.alert("Verification failed", error.message);
      return;
    }
    router.replace("/");
  };

  return (
    <Screen>
      <SectionTitle title="Verify code" subtitle={`Enter the code sent to ${email ?? "your email"}.`} />
      <Card>
        <LabeledField
          value={normalizedToken}
          onChangeText={setToken}
          label="One-time code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
        />
        <PrimaryButton label={isVerifying ? "Verifying..." : "Verify"} onPress={handleVerify} disabled={!canContinue || isVerifying} />
      </Card>
    </Screen>
  );
}
