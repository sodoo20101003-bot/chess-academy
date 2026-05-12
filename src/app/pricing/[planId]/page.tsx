import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CheckoutFlow } from '@/components/pricing/CheckoutFlow'

interface PageProps {
  params: Promise<{ planId: string }>
}

export default async function CheckoutPage({ params }: PageProps) {
  const { planId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=/pricing/${planId}`)

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .eq('is_active', true)
    .single()

  if (!plan) notFound()

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-2xl">
          <CheckoutFlow plan={plan} userEmail={user.email ?? ''} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
