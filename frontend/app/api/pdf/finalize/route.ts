import { NextResponse } from 'next/server'

export async function POST() {
  // todo: load base PDF, draw signatures, write audit trail, store to S3/local, return url
  return NextResponse.json({ 
    ok: true, 
    note: 'PDF finalize not implemented yet',
    timestamp: new Date().toISOString()
  })
}
