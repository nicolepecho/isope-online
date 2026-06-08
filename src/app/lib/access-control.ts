import { supabase } from '@/app/lib/database';
import { Orgs } from '@/app/lib/definitions';

export const fetchAccessibleOrgs = async ({
  role,
  name,
  orgIdentifier,
  email
}: {
  role: string;
  name?: string;
  orgIdentifier?: string;
  email?: string;
}) => {
  let fetchedOrgs: Orgs[] = [];

  if (role === 'osas') {
    const { data } = await supabase.from('orgs').select('*');
    fetchedOrgs = data || [];
  } else if (role === 'adviser') {
  const { data } = await supabase
    .from('orgs')
    .select('*')
    .eq('adviseremail', email);

  fetchedOrgs = data || [];
} else if (role === 'member') {
  // Primary: match by email (reliable, case-insensitive)
  if (email) {
    const { data: byEmail } = await supabase
      .from('member')
      .select('*, orgs(*)')
      .eq('email', email);

    if (byEmail && byEmail.length > 0) {
      fetchedOrgs = byEmail.map((m: any) => m.orgs).filter(Boolean) as Orgs[];
    }
  }

  // Fallback: match by name for rows uploaded without an email
  if (fetchedOrgs.length === 0 && name) {
    const { data: byName } = await supabase
      .from('member')
      .select('*, orgs(*)')
      .ilike('student_name', name);

    fetchedOrgs = byName?.map((m: any) => m.orgs).filter(Boolean) as Orgs[] ?? [];
  }
} 
else if (role === 'org') {
  // orgIdentifier should be the org's email
  if (orgIdentifier) {
    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .eq('email', orgIdentifier)
      .maybeSingle();

    if (error) {
      console.error('[fetchAccessibleOrgs][org]', error);
      fetchedOrgs = [];
    } else if (data) {
      fetchedOrgs = [data];
    } else {
      fetchedOrgs = [];
    }
  }
}
  return fetchedOrgs;
};
