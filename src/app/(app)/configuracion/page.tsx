import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/types";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .single();

  return <SettingsView settings={settings as Settings} />;
}
