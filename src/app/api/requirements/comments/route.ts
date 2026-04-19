import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/database';
import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret });
    const email = (token as any)?.email || '';

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orgname = searchParams.get('orgname');
    const reqid = searchParams.get('reqid');

    if (!orgname || !reqid) {
      return NextResponse.json({ error: 'Missing orgname or reqid' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('requirementcomments')
      .select('id, orgUsername, requirementId, authorEmail, authorName, content, createdAt')
      .eq('orgUsername', orgname)
      .eq('requirementId', reqid)
      .order('createdAt', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret });
    const email = (token as any)?.email || '';
    const name = (token as any)?.name || null;

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const orgname = body?.orgname;
    const reqid = body?.reqid;
    const content = (body?.content || '').toString().trim();

    if (!orgname || !reqid) {
      return NextResponse.json({ error: 'Missing orgname or reqid' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('requirementcomments')
      .insert({
        orgUsername: orgname,
        requirementId: reqid,
        authorEmail: email,
        authorName: name,
        content,
      })
      .select('id, orgUsername, requirementId, authorEmail, authorName, content, createdAt')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add comment' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = await getToken({ req: req as any, secret });
    const email = (token as any)?.email || '';

    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { data: comment, error: fetchError } = await supabaseAdmin
      .from('requirementcomments')
      .select('id, authorEmail')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!comment || (comment.authorEmail || '').toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'You can only delete your own comment' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('requirementcomments')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete comment' }, { status: 500 });
  }
}
