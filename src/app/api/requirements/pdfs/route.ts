import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/database';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

// Checks if the requesting user is allowed to access a given org's files.
// OSAS can access all orgs. Org accounts and advisers can only access their own org.
// All other roles (member, unknown) are denied.
async function checkOrgAccess(role: string, email: string, orgname: string): Promise<boolean> {
  if (role === 'osas') return true;

  if (role !== 'org' && role !== 'adviser') return false;

  const { data: orgData } = await supabaseAdmin
    .from('orgs')
    .select('email, adviseremail')
    .eq('username', orgname)
    .maybeSingle();

  if (!orgData) return false;

  if (role === 'org') return (orgData.email ?? '').toLowerCase() === email;
  if (role === 'adviser') return (orgData.adviseremail ?? '').toLowerCase() === email;

  return false;
}

export async function GET(req: Request) {
  try {
    // Identity check — must be logged in
    const token = await getToken({ req: req as any, secret });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = ((token as any)?.role || '').toString().trim().toLowerCase();
    const email = ((token as any)?.email || '').toString().trim().toLowerCase();

    const { searchParams } = new URL(req.url);

    const download = searchParams.get('download');
    const filepath = searchParams.get('filepath');

    if (download === '1' && filepath) {
      // Extract orgname from the filepath (format: orgname/reqid/.../filename)
      const orgname = filepath.split('/')[0];

      const allowed = await checkOrgAccess(role, email, orgname);
      if (!allowed) {
        return NextResponse.json(
          { error: 'Access denied. You do not have permission to access this organization\'s files.' },
          { status: 403 }
        );
      }

      const fileName = filepath.split('/').pop() || 'download';

      const { data, error } = await supabaseAdmin.storage
        .from('requirement-pdfs')
        .download(filepath);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const arrayBuffer = await data.arrayBuffer();
      const contentType = data.type || 'application/octet-stream';

      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const orgname = searchParams.get('orgname');
    const reqid = searchParams.get('reqid');
    const year = searchParams.get('year');

    if (!orgname || !reqid) {
      return NextResponse.json({ error: 'Missing orgname or reqid' }, { status: 400 });
    }

    // Ownership check — org and adviser can only access their own org
    const allowed = await checkOrgAccess(role, email, orgname);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to access this organization\'s files.' },
        { status: 403 }
      );
    }

    const folderPath = year ? `${orgname}/${reqid}/${year}` : `${orgname}/${reqid}`;

    const { data: files, error } = await supabaseAdmin.storage
      .from('requirement-pdfs')
      .list(folderPath, { limit: 200 });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pdfs = (files || []).filter((f: any) => f.metadata !== null).map((f: any) => {
      const filepath = `${folderPath}/${f.name}`;
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('requirement-pdfs')
        .getPublicUrl(filepath);

      return {
        id: filepath,
        filepath,
        publicUrl,
        uploadedby: null,
        uploadedat: f.created_at || null,
      };
    });

    return NextResponse.json({ pdfs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load files' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Identity check — must be logged in
    const token = await getToken({ req: req as any, secret });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = ((token as any)?.role || '').toString().trim().toLowerCase();
    const email = ((token as any)?.email || '').toString().trim().toLowerCase();

    const { filepath } = await req.json();

    if (!filepath) {
      return NextResponse.json({ error: 'Missing filepath' }, { status: 400 });
    }

    // Extract orgname from the filepath (format: orgname/reqid/.../filename)
    const orgname = filepath.split('/')[0];

    // Only OSAS and the org that owns the file can delete. Advisers cannot delete.
    if (role === 'adviser' || role === 'member') {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to delete files.' },
        { status: 403 }
      );
    }

    const allowed = await checkOrgAccess(role, email, orgname);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to delete this organization\'s files.' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin.storage
      .from('requirement-pdfs')
      .remove([filepath]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete file' }, { status: 500 });
  }
}
