import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PricingTable } from '@/components/pricing/PricingTable'

export const metadata = {
  title: 'Үнэ — GrandMaster.mn',
  description: 'Өөрт тохирох гишүүнчлэлийн төлбөрөө сонгож шатрын мастер болох замаа эхэлээрэй.',
}

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_mnt', { ascending: true })

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6">
          <header className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-sm font-mono text-emerald-400 uppercase tracking-widest mb-4">
              Гишүүнчлэл
            </p>
            <h1 className="font-display text-5xl md:text-7xl text-white mb-6">
              Хөрөнгө оруулалт <em className="italic text-gold-400">өөрийнхөө</em><br />
              ирээдүйд
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Эхний 5 хичээл бүрэн үнэгүй. Цааш үргэлжлүүлэхийг хүсвэл өөрт тохирох төлбөрийг сонгоорой.
            </p>
          </header>

          <PricingTable plans={plans ?? []} />

          <section className="mt-24 max-w-3xl mx-auto">
            <h2 className="font-display text-3xl text-white text-center mb-12">
              Түгээмэл асуултууд
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Цуцлах боломжтой юу?',
                  a: 'Тийм. Та гишүүнчлэлээ хэдийд ч цуцалж болно. Цуцалсан тохиолдолд төлсөн хугацааны эцэс хүртэл үргэлжлүүлэн ашиглах боломжтой.'
                },
                {
                  q: 'QPay-р яаж төлдөг вэ?',
                  a: 'Сонгосон төлбөрийн дараа QR код гарч ирнэ. Та өөрийн банкны аппаараа уншуулан төлбөрөө хийнэ. Төлбөр баталгаажмагц гишүүнчлэл нэн даруй идэвхждэг.'
                },
                {
                  q: 'Хичээлүүдийг гар утаснаас үзэж болох уу?',
                  a: 'Тийм. Манай платформ бүх төхөөрөмж дээр төгс ажилладаг — гар утас, таблет, ноутбук, дэлгэц.'
                },
                {
                  q: 'Багш нар хэн бэ?',
                  a: 'Манай багш нар Олон улсын гросмастер болон Монголын шилдэг тоглогчид. Туршлагатай дасгалжуулагч нар таны түвшинд тохирсон хичээл заана.'
                },
              ].map((item, i) => (
                <details key={i} className="group glass border border-white/10 rounded-xl p-6">
                  <summary className="flex justify-between items-center cursor-pointer text-white font-medium">
                    {item.q}
                    <span className="text-emerald-400 group-open:rotate-45 transition-transform text-2xl">+</span>
                  </summary>
                  <p className="mt-4 text-white/60 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
