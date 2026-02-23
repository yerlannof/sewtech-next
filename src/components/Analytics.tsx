import { getPayload } from 'payload'
import config from '@payload-config'
import Script from 'next/script'

export async function Analytics() {
  let settings: {
    yandexMetrikaId?: string | null
    googleAnalyticsId?: string | null
    googleVerification?: string | null
    yandexVerification?: string | null
  } = {}
  try {
    const payload = await getPayload({ config })
    const s = await payload.findGlobal({ slug: 'settings' })
    settings = s as typeof settings
  } catch {
    // Settings not available — skip analytics
    return null
  }

  const ymId = settings.yandexMetrikaId
  const gaId = settings.googleAnalyticsId
  const googleVerification = settings.googleVerification
  const yandexVerification = settings.yandexVerification

  return (
    <>
      {/* Verification meta tags */}
      {googleVerification && (
        <meta name="google-site-verification" content={googleVerification} />
      )}
      {yandexVerification && (
        <meta name="yandex-verification" content={yandexVerification} />
      )}

      {/* Yandex.Metrika */}
      {ymId && (
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${ymId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
        </Script>
      )}
      {ymId && (
        <noscript>
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${ymId}`}
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
      )}

      {/* Google Analytics 4 */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
    </>
  )
}
