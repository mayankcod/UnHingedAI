import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function parseMessages(messages) {
  if (!Array.isArray(messages) || messages.some((message) => !['user', 'assistant'].includes(message?.role) || typeof message?.content !== 'string')) {
    return null;
  }
  return messages.slice(-100);
}

// GET all chats for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const chats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json(chats);
}

// POST to create a new chat
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, messages } = await req.json();
  const safeMessages = parseMessages(messages);
  if (!safeMessages) return NextResponse.json({ error: 'Invalid chat messages.' }, { status: 400 });

  const chat = await prisma.chat.create({
    data: {
      userId: session.user.id,
      title: typeof title === 'string' ? title.trim().slice(0, 80) || 'New conversation' : 'New conversation',
      messages: JSON.stringify(safeMessages),
    },
  });

  return NextResponse.json(chat);
}

// PUT to update an existing chat
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, messages, title } = await req.json();
  const safeMessages = parseMessages(messages);
  if (typeof id !== 'string' || !safeMessages) return NextResponse.json({ error: 'Invalid chat update.' }, { status: 400 });

  // Verify ownership
  const existing = await prisma.chat.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const chat = await prisma.chat.update({
    where: { id },
    data: {
      messages: JSON.stringify(safeMessages),
      ...(typeof title === 'string' && title.trim() && { title: title.trim().slice(0, 80) }),
    },
  });

  return NextResponse.json(chat);
}

// GET a single chat's messages
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (typeof id !== 'string') return NextResponse.json({ error: 'Invalid chat id.' }, { status: 400 });

  const chat = await prisma.chat.findUnique({ where: { id } });
  if (!chat || chat.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    return NextResponse.json({ ...chat, messages: JSON.parse(chat.messages) });
  } catch {
    return NextResponse.json({ error: 'This chat could not be read.' }, { status: 500 });
  }
}

// DELETE a chat owned by the current user
export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (typeof id !== 'string') return NextResponse.json({ error: 'Invalid chat id.' }, { status: 400 });

  const result = await prisma.chat.deleteMany({ where: { id, userId: session.user.id } });
  if (!result.count) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id });
}
