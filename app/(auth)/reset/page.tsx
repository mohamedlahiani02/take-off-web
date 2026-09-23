import { redirect } from 'next/navigation'

/**
 * Superseded by phone + OTP sign-in; members have no password to reset.
 */
export default function ResetPasswordPage(): never {
  redirect('/login')
}
