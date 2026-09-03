import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'GC Teleprompter · UN Studios', description: 'Teleprompter ligero para tus presentaciones.' }
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="es"><body>{children}</body></html> }
