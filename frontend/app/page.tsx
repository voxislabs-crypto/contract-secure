export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>ContractSecure</h1>
      <p>Skeleton online. Health: <code>/api/health</code></p>
      <ul>
        <li>POST <code>/api/contracts</code> → create stub contract</li>
        <li>POST <code>/api/otp/start</code> → send OTP via Vonage Verify v2</li>
        <li>POST <code>/api/otp/check</code> → verify code</li>
      </ul>
    </main>
  )
}
