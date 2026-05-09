import { router } from "expo-router";
import { unregisterPush } from "@/lib/api/endpoints";
import { supabase } from "@/lib/supabase/client";

export async function logout() {
  try {
    await unregisterPush();
  } catch (error) {
    console.warn("Push unregister failed during logout", error);
  }

  await supabase.auth.signOut();
  router.replace("/(auth)/login");
}
