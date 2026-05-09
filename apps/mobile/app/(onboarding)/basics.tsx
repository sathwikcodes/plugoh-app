import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { AccentHero, LabeledField, PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { useMarketplaceMutations } from "@/hooks/use-marketplace";
import { influencerBasicsSchema, type InfluencerBasicsForm } from "@/lib/forms/onboarding";

export default function BasicsScreen() {
  const mutations = useMarketplaceMutations();
  const { handleSubmit, setValue, watch } = useForm<InfluencerBasicsForm>({
    resolver: zodResolver(influencerBasicsSchema),
    defaultValues: { full_name: "", phone: "", location: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutations.onboarding.mutateAsync(values);
      router.replace("/(onboarding)/instagram-connect");
    } catch (error) {
      Alert.alert("Could not save details", error instanceof Error ? error.message : "Try again.");
    }
  });

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <AccentHero title="Build a professional creator profile" subtitle="Keep this short, credible, and ready for campaign decisions." />
      <SectionTitle title="Your basics" subtitle="These details power profile trust, payout setup, and campaign coordination." />
      <LabeledField label="Full name" value={watch("full_name")} onChangeText={(value) => setValue("full_name", value, { shouldValidate: true })} placeholder="Sana Verma" />
      <LabeledField label="Phone" value={watch("phone")} onChangeText={(value) => setValue("phone", value, { shouldValidate: true })} keyboardType="phone-pad" placeholder="+91 98765 43210" />
      <LabeledField label="City" value={watch("location")} onChangeText={(value) => setValue("location", value, { shouldValidate: true })} placeholder="Hyderabad" />
      <PrimaryButton label={mutations.onboarding.isPending ? "Saving..." : "Continue"} onPress={onSubmit} disabled={mutations.onboarding.isPending} />
    </Screen>
  );
}
