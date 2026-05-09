import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "react-native";
import { z } from "zod";
import { LabeledField, PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { useInfluencerProfile, useMarketplaceMutations } from "@/hooks/use-marketplace";

const categories = ["Food", "Fitness", "Beauty", "Lifestyle", "Travel", "Education", "Tech", "Fashion", "Other"] as const;

const schema = z.object({
  display_name: z.string().trim().min(1),
  bio: z.string().trim().min(1),
  city: z.string().trim().min(1),
  category: z.enum(categories),
});

export default function EditProfileScreen() {
  const profile = useInfluencerProfile();
  const mutations = useMarketplaceMutations();
  const { handleSubmit, setValue, watch } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: "", bio: "", city: "", category: "Lifestyle" },
  });

  useEffect(() => {
    if (!profile.data) return;
    setValue("display_name", profile.data.display_name ?? "");
    setValue("bio", profile.data.bio ?? "");
    setValue("city", profile.data.city ?? "");
    setValue("category", profile.data.category ?? "Lifestyle");
  }, [profile.data, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutations.updateProfile.mutateAsync(values);
      router.back();
    } catch (error) {
      Alert.alert("Could not update profile", error instanceof Error ? error.message : "Try again.");
    }
  });

  return (
    <Screen>
      <SectionTitle title="Edit profile" subtitle="Keep your creator summary short, credible, and commercially clear." />
      <LabeledField label="Display name" value={watch("display_name")} onChangeText={(value) => setValue("display_name", value, { shouldValidate: true })} />
      <LabeledField label="Bio" value={watch("bio")} onChangeText={(value) => setValue("bio", value, { shouldValidate: true })} multiline />
      <LabeledField label="City" value={watch("city")} onChangeText={(value) => setValue("city", value, { shouldValidate: true })} />
      <LabeledField label="Category" value={watch("category")} onChangeText={(value) => setValue("category", value, { shouldValidate: true })} />
      <PrimaryButton label="Save changes" onPress={onSubmit} />
    </Screen>
  );
}
