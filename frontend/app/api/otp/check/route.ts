// app/api/otp/check/route.ts
import { NextResponse } from 'next/server'
import { Vonage } from '@vonage/server-sdk'
import { z } from 'zod'
import { prisma } from '../../../../src/lib/db'

interface VerifyResponse {
  request_id: string
  status: 'completed' | 'SUCCESS' | string
  [key: string]: unknown
}

const Body = z.object({
  requestId: z.string().min(8),
  code: z.string().min(4),
  signerId: z.string().optional()
})

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY!,
  apiSecret: process.env.VONAGE_API_SECRET!
})

type VonageError = Error & {
  response?: { data: unknown }
  data?: unknown
}

function isVerifyResponse(obj: unknown): obj is VerifyResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'request_id' in obj &&
    'status' in obj
  )
}

export async function POST(req: Request) {
  try {
    const { requestId, code, signerId } = Body.parse(await req.json())

    const result = await vonage.verify2.checkCode(requestId, code)

    // Add type checking for the response
    if (!isVerifyResponse(result)) {
      throw new Error('Invalid response format from Vonage API')
    }

    const success = result.status === 'completed' || result.status === 'SUCCESS'

    let updated = null
    if (success && signerId) {
      updated = await prisma.signer.update({
        where: { id: signerId },
        data: { otpVerified: true }
      })
    }

    return NextResponse.json({ success, result, signer: updated })
  } catch (error: unknown) {
    const err = error as VonageError
    const details = err.response?.data || err.data || err.message || 'Unknown error'
    return NextResponse.json(
      { error: 'verify_check_failed', details },
      { status: 500 }
    )
  }
}