import { NextResponse } from 'next/server'
import { Verify2 } from '@vonage/verify2'

const vonage = new Verify2({
  apiKey: process.env.VONAGE_API_KEY!,
  apiSecret: process.env.VONAGE_API_SECRET!
})

export async function POST(req: Request) {
  try {
    const { to } = await req.json()
    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const brand = process.env.VONAGE_BRAND || 'ContractSecure'
    const resp = await vonage.newVerification({
      brand,
      workflow: [{ channel: 'sms', to }]
    })

    return NextResponse.json({ requestId: resp.requestId })
  } catch (error) {
    console.error('Error starting OTP verification:', error)
    return NextResponse.json(
      { error: 'Failed to start verification' },
      { status: 500 }
    )
  }
}
