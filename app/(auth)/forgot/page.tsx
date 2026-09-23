import { redirect } from 'next/navigation'

/**
 * There is no member password to recover — access is proven with a one-time code sent to the
 * member's phone, so signing in again is the recovery path.
 */
export default function ForgotPasswordPage(): never {
  redirect('/login')
}
