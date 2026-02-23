import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { StoreProviders } from '@/lib/store/providers'
import { ComparisonBar } from '@/components/comparison/ComparisonBar'
import { CONTACTS } from '@/lib/contacts'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'LocalBusiness'],
  name: 'SEWTECH',
  url: 'https://sewtech.kz',
  telephone: CONTACTS.phone,
  email: CONTACTS.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Ауэзова 132',
    addressLocality: 'Алматы',
    postalCode: '050058',
    addressCountry: 'KZ',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: CONTACTS.coordinates.lat,
    longitude: CONTACTS.coordinates.lng,
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '10:00',
      closes: '14:00',
    },
  ],
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProviders>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Header />
      <main className="min-h-screen">{children}</main>
      <ComparisonBar />
      <Footer />
    </StoreProviders>
  )
}
