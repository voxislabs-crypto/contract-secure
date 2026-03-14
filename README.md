# ContractSecure - Digital Contract Platform MVP

A secure, legally-compliant digital contract platform enabling parties to create, review, and execute contracts with verifiable identity authentication and tamper-proof document generation.

## Features

### Core MVP Features
- ✅ **Contract Creation**: Upload PDF contracts or create from templates
- ✅ **Identity Verification**: Email/SMS OTP verification (Light level)
- ✅ **Digital Signatures**: Canvas-based signature capture with consent recording
- ✅ **GPS Location Tracking**: Capture signer location with accuracy validation
- ✅ **Tamper-Proof PDFs**: SHA-256 hashing with embedded audit trails
- ✅ **Secure Invite Links**: JWT-protected signing links with expiration
- ✅ **Real-time Status Tracking**: Dashboard with contract progress monitoring

### Security & Compliance
- 🔒 **End-to-End Security**: HTTPS, JWT tokens, encrypted storage
- 📍 **Location Verification**: GPS coordinates with accuracy logging
- 🔍 **Comprehensive Audit Trail**: All actions logged with timestamps
- 📋 **Legal Consent Flow**: Clear electronic signature consent process
- 🏛️ **Court-Ready Documentation**: Professional audit trail formatting

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd contract-secure
npm install
cd server && npm install
```

2. **Start the development servers:**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run dev
```

3. **Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Usage Flow

### 1. Create Contract
- Upload PDF or use built-in templates
- Add contract title and description
- Add signers (name + email)

### 2. Send Invites
- Generate secure signing links for each signer
- Copy links to share via email/SMS
- Links expire in 48 hours for security

### 3. Digital Signing Process
- **Identity Verification**: Email OTP (6-digit code)
- **Contract Review**: Full contract preview
- **Location Consent**: GPS permission with clear disclosure
- **Digital Signature**: Canvas-based signature capture
- **Legal Consent**: Electronic signature agreement

### 4. Contract Finalization
- When all parties sign, contract moves to "Ready to Finalize"
- Click "Finalize" to generate tamper-proof PDF
- PDF includes embedded signatures + comprehensive audit trail
- SHA-256 hash generated for integrity verification

## Fast Manual Revenue Flow ($5)

For immediate offline/quick-cash testing with Marketplace deals, this repo now includes:

- `public/secure-deal.html` — standalone intake + QR payment page (Venmo/PayPal/Cash App)
- `marketplace-extension/` — Chrome extension stub that injects a "Secure Deal" button

### Run locally

1. Start frontend: `npm run dev`
2. Open: `http://localhost:5173/secure-deal.html`
3. Edit payment handles inside `public/secure-deal.html` under `PAYMENT_CONFIG`

### Extension quick test

1. Open Chrome `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked extension from `marketplace-extension/`
4. In popup, set App Base URL to your frontend URL (`http://localhost:5173`)
5. Visit a Marketplace/Craigslist listing and click "Secure Deal"

## Stripe Escrow Hold + Release (Connect)

The escrow deal flow now supports seller payout onboarding with Stripe Connect and transfer-on-release.

### What this enables

- Buyer pays into your platform Stripe account through Checkout.
- Funds are marked as `paid_held` after webhook confirmation.
- Seller connects a Stripe payout account from the escrow detail page.
- On buyer receipt confirmation, the app creates a Stripe transfer to the seller account.

### Required backend env

Set these in `backend/.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_COUNTRY=US
```

### Stripe webhook events to enable

Create a webhook endpoint pointing to your backend:

- POST /api/webhooks/stripe

Enable these events:

- checkout.session.completed
- payment_intent.payment_failed
- charge.refunded

### Database migration

Apply `backend/migrations/002_add_stripe_connect_columns.sql` to add:

- `seller_stripe_account_id`
- `stripe_transfer_id`

Then regenerate Prisma client if needed:

```bash
npx prisma generate --schema backend/prisma/schema.prisma
```

## API Endpoints

### Contract Management
- `POST /api/contracts` - Create new contract
- `GET /api/contracts` - List all contracts
- `GET /api/contracts/:id` - Get contract details
- `POST /api/contracts/:id/signers` - Add signers
- `POST /api/contracts/:id/invite/:signerId` - Generate invite link
- `POST /api/contracts/:id/finalize` - Finalize contract
- `GET /api/contracts/:id/download` - Download executed PDF

### Signing Process
- `GET /api/sign/:token` - Get signing page data
- `POST /api/sign/otp/start` - Send OTP verification
- `POST /api/sign/otp/verify` - Verify OTP code
- `POST /api/sign/:token/sign` - Submit signature

## Environment Variables

Create `.env` file in server directory:

```env
# Server Configuration
PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
FRONTEND_URL=http://localhost:5173

# Email Configuration (Optional - will log to console if not set)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Database Schema

### SQLite Tables (Auto-created)

**contracts**
- `id` - Unique contract identifier
- `title` - Contract title
- `status` - draft | pending | pending_finalization | executed
- `base_pdf_path` - Original uploaded PDF
- `final_pdf_path` - Executed PDF with signatures
- `pdf_sha256` - Document integrity hash
- `created_at` - Creation timestamp

**signers**
- `id` - Unique signer identifier
- `contract_id` - Associated contract
- `name` - Signer full name
- `email` - Signer email address
- `otp_verified_at` - Identity verification timestamp
- `signature_image_path` - Signature file path
- `gps_lat/lng/accuracy` - Location data
- `ip_address` - Signing IP address
- `user_agent` - Device information
- `signed_at` - Signature timestamp

**audit**
- `id` - Audit entry identifier
- `contract_id` - Associated contract
- `signer_id` - Associated signer (if applicable)
- `event` - Action type (CREATED, SIGNED, etc.)
- `payload_json` - Event details
- `created_at` - Event timestamp

## Legal Compliance

### Electronic Signature Consent
The platform includes comprehensive consent flows that meet ESIGN Act requirements:

- Clear disclosure of electronic signature use
- Explicit consent to electronic records
- Location sharing consent for fraud prevention
- Right to receive paper copies (upon request)
- Audit trail preservation

### Consent Text (Production Ready)
```
"By checking this box, I consent to use of electronic records and signatures 
for this agreement. I also agree to share my device's location (GPS) for 
fraud prevention and jurisdiction purposes. Location accuracy may vary 
depending on your device."
```

## Production Deployment

### Backend Deployment
1. Set production environment variables
2. Use PostgreSQL instead of SQLite
3. Configure proper SMTP service (SendGrid, AWS SES)
4. Enable HTTPS with SSL certificates
5. Set up file storage (AWS S3, Google Cloud Storage)

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to CDN (Vercel, Netlify, AWS CloudFront)
3. Configure proper CORS origins
4. Set up domain with SSL

### Security Checklist
- [ ] Change JWT_SECRET to cryptographically secure value
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Configure file upload limits
- [ ] Set up backup strategy for contracts database
- [ ] Implement proper error handling and monitoring

## Future Enhancements

### Identity Verification Upgrades
- **Standard**: Government ID + selfie verification (Stripe Identity, Onfido)
- **Strong**: Biometric verification + liveness detection

### Advanced Features
- Multi-party contracts (3+ signers)
- Contract template library with variables
- Blockchain anchoring for notarization
- Mobile app wrappers (iOS/Android)
- Advanced analytics and reporting
- Integration with DocuSign, HelloSign APIs

### Enterprise Features
- SSO integration (SAML, OAuth)
- Advanced user management
- Custom branding
- API rate limiting and quotas
- Webhook notifications
- Advanced audit reporting

## Support

For technical support or questions:
- Check the API documentation in `/docs`
- Review the audit trail format for legal compliance
- Test the signing flow with multiple devices
- Verify GPS accuracy in different environments

## License

MIT License - see LICENSE file for details.# ContractSecure

# contract-secure

