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
  const { data: memberData } = await supabase
    .from('member')
    .select('*, orgs(*)')
    .eq('student_name', name);

    //extracts orgs from memberdata
  fetchedOrgs = memberData?.map((m) => m.orgs) ?? [];
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
