import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/database';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = ((token as any)?.role || '').toString().trim().toLowerCase();
    if (role !== 'osas') {
      return NextResponse.json({ error: 'Only OSAS can upload organization logos' }, { status: 403 });
    }

    const formData = await req.formData();
    const orgname = formData.get('orgname') as string;
    const file = formData.get('file') as File;

    if (!orgname || !file) {
      return NextResponse.json({ error: 'Missing orgname or file' }, { status: 400 });
    }

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      return NextResponse.json({ error: 'Only JPG and PNG images are allowed' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${orgname}-${Date.now()}.${fileExt}`;
    const filePath = `org-logos/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from('orglogos')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('orglogos')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabaseAdmin
      .from('orgs')
      .update({ avatar: publicUrl })
      .eq('username', orgname);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to upload logo' }, { status: 500 });
  }
}
