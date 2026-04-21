import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/database';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret });
    const role = ((token as any)?.role || '').toString().trim().toLowerCase();

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (role !== 'osas') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { orgname, year, requirementIds } = await req.json() as {
      orgname: string;
      year: number;
      requirementIds: string[];
    };

    if (!orgname || !year || !Array.isArray(requirementIds)) {
      return NextResponse.json({ error: 'Missing orgname, year, or requirementIds' }, { status: 400 });
    }

    for (const requirementId of requirementIds) {
      const rootPath = `${orgname}/${requirementId}`;

      const { data: files } = await supabaseAdmin.storage
        .from('requirement-pdfs')
        .list(rootPath, { limit: 200 });

      if (!files || files.length === 0) continue;

      // Only move actual files (not subfolders — folders have no metadata)
      const actualFiles = files.filter((f: any) => f.metadata !== null);

      for (const file of actualFiles) {
        const fromPath = `${rootPath}/${file.name}`;
        const toPath = `${rootPath}/${year}/${file.name}`;

        await supabaseAdmin.storage.from('requirement-pdfs').copy(fromPath, toPath);
        await supabaseAdmin.storage.from('requirement-pdfs').remove([fromPath]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[archive-files]', err);
    return NextResponse.json({ error: err.message || 'Failed to archive files' }, { status: 500 });
  }
}
