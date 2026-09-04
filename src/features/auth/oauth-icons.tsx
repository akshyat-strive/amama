import type { SVGProps } from "react"

/**
 * The three marks each provider publishes for exactly this use — a
 * "Sign in with X" button — reproduced per their own developer branding
 * guidelines (Google Identity, Microsoft identity platform, Sign in with
 * Apple). Not decorative brand art; this is the intended integration usage.
 */

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

function MicrosoftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 23 23" aria-hidden {...props}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  )
}

function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.365 1.43c0 1.14-.416 2.06-1.246 2.897-.99 1.02-2.09 1.61-3.29 1.51-.14-1.13.42-2.34 1.24-3.19.83-.87 2.24-1.53 3.29-1.22zM20.6 17.06c-.55 1.28-.81 1.85-1.52 2.98-.99 1.58-2.39 3.55-4.12 3.57-1.54.01-1.94-1.01-4.03-1-2.09.01-2.53 1.02-4.07 1.01-1.73-.02-3.06-1.79-4.05-3.37-2.78-4.4-3.07-9.57-1.36-12.32 1.21-1.96 3.13-3.11 4.94-3.11 1.84 0 3 .99 4.52.99 1.47 0 2.37-1 4.5-1 1.61 0 3.32.88 4.53 2.4-3.98 2.18-3.33 7.86 1.66 9.85z" />
    </svg>
  )
}

export { GoogleIcon, MicrosoftIcon, AppleIcon }
