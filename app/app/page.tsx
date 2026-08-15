import type { Metadata } from "next";
import Workspace from "@/components/Workspace";

export const metadata: Metadata = {
  title: "Workspace — SalesSheet AI",
  description: "Structure, review, and question your sales data.",
};

export default function AppPage() {
  return <Workspace />;
}
