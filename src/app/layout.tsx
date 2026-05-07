import type { Metadata } from 'next'
import { Funnel_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const funnelSans = Funnel_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'LeadNav',
  description: 'Insurance lead management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${funnelSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  )
}
