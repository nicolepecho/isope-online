import OrgsPage from "@/app/ui/snippets/OrgsPage";
import {getUserByUsername } from "@/app/lib/database"
import { notFound } from "next/navigation";

export default async function Page(props: any) {
  //type safety
  const params = (await props).params ? await (props as any).params : (await props).params;
  // ensure type for params
  const p = params as { orgname: string };
  const org = await getUserByUsername(p.orgname);

  if (!org) {
    notFound();
  }
  
  return (
    <>
      <OrgsPage org={org} />
    </>
  );
}
