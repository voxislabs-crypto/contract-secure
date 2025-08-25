import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/db.ts'
import { z } from 'zod'

const Body = z.object({
  title: z.string().min(1),
  signers: z.array(z.object({
    phone: z.string().min(8),
    email: z.string().email().optional()
  })).min(1)
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = Body.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { title, signers } = parsed.data
    const contract = await prisma.contract.create({
      data: {
        title,
        signers: { create: signers }
      },
      include: { signers: true }
    })

    return NextResponse.json({ contract })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    )
  }
}
