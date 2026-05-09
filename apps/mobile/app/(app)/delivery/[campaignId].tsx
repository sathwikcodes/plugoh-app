import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { Card, LabeledField, PrimaryButton, Screen, SectionTitle } from "@/components/ui/primitives";
import { useMarketplaceMutations } from "@/hooks/use-marketplace";
import { theme } from "@/constants/theme";

export default function DeliveryScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const mutations = useMarketplaceMutations();

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    setSelectedFile({ uri: file.uri, name: file.name, mimeType: file.mimeType ?? undefined });
  };

  const submit = async () => {
    if (!selectedFile) {
      Alert.alert("Choose a file", "Select the final delivery asset before submitting.");
      return;
    }
    try {
      const upload = await mutations.uploadDelivery.mutateAsync({ campaignId, file: selectedFile });
      await mutations.submitDelivery.mutateAsync({ campaignId, storagePath: upload.storagePath, notes });
      router.back();
    } catch (error) {
      Alert.alert("Delivery failed", error instanceof Error ? error.message : "Try again.");
    }
  };

  return (
    <Screen>
      <SectionTitle title="Submit delivery" subtitle="Upload the final asset with clear notes for approval." />
      <Card>
        <Text style={{ ...theme.typography.cardTitle, color: theme.colors.foreground }}>
          {selectedFile ? selectedFile.name : "No file selected"}
        </Text>
        <PrimaryButton label="Choose file" onPress={pickFile} />
      </Card>
      <LabeledField label="Notes" value={notes} onChangeText={setNotes} placeholder="Add context, links, or revision notes." multiline />
      <PrimaryButton label="Submit delivery" onPress={submit} />
    </Screen>
  );
}
