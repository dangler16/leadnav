import type { Metadata } from 'next'
import { Inter, Funnel_Sans, DM_Mono } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const funnelSans = Funnel_Sans({
  variable: '--font-mono',
  subsets: ['latin'],
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: 'LeadNav',
  description: 'Insurance lead management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${funnelSans.variable} ${GeistMono.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="h-full">
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')})()` }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
