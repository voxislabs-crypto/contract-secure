// app/api/otp/start/route.ts
import { NextResponse } from 'next/server'
import { Vonage } from '@vonage/server-sdk'
import { z } from 'zod'

// Define the workflow type
type Workflow = {
  channel: 'sms' | 'whatsapp' | 'voice' | 'email' | 'silent_auth',
  to: string
}

const Body = z.object({
  to: z.string().min(8, 'Phone required'),
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

export async function POST(req: Request) {
  try {
    const { to, signerId } = Body.parse(await req.json())

    // Clear the require cache to ensure we're using the latest code
    Object.keys(require.cache).forEach(key => {
      if (key.includes('start/route')) {
        delete require.cache[key]
      }
    })

    // Use the correct method and type assertion
    const resp = await (vonage.verify2 as any).newRequest({
      brand: process.env.VONAGE_BRAND || 'ContractSecure',
      workflow: [{ channel: 'sms', to }] as Workflow[]
    })

    return NextResponse.json({
      requestId: resp.request_id,
      signerId
    })
  } catch (error: unknown) {
    const err = error as VonageError
    const details = err.response?.data || err.data || err.message || 'Unknown error'
    console.error('OTP Start Error:', details)
    return NextResponse.json(
      { error: 'verify_start_failed', details },
      { status: 500 }
    )
  }
}