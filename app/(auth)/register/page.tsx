import { redirect } from 'next/navigation'

/**
 * Members are created by the phone + OTP flow: entering a phone number that has no account
 * yet prompts for a name and registers on verification. The old email/password form here
 * collected credentials the API no longer accepts and logged them to the console.
 */
export default function RegisterPage(): never {
  redirect('/login')
}
