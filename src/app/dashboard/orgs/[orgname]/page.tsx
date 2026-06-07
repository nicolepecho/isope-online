import OrgsPage from "@/app/ui/snippets/OrgsPage";
import {getUserByUsername } from "@/app/lib/database"
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ orgname: string }> }) {
  const { orgname } = await props.params;
  const org = await getUserByUsername(orgname);

  if (!org) {
    notFound();
  }
  
  return (
    <>
      <OrgsPage org={org} />
    </>
  );
}
