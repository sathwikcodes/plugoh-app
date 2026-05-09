import { ExpoRoot } from "expo-router";

const ctx = require.context("./apps/mobile/app");

export default function App() {
  return <ExpoRoot context={ctx} />;
}
