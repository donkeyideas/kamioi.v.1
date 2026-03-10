import { useEffect } from 'react'
import { useSeoSettings } from '@/hooks/useSeoSettings'

let gaInjected = false
let fbInjected = false

/**
 * Injects Google Analytics and Facebook Pixel scripts based on
 * IDs stored in admin SEO settings. Only injects once per session.
 */
export function AnalyticsScripts() {
  const { seoSettings, loading } = useSeoSettings()

  useEffect(() => {
    if (loading) return

    // Google Analytics
    const gaId = seoSettings.google_analytics_id
    if (gaId && !gaInjected) {
      gaInjected = true
      const script = document.createElement('script')
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
      document.head.appendChild(script)

      const initScript = document.createElement('script')
      initScript.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `
      document.head.appendChild(initScript)
    }

    // Facebook Pixel
    const fbId = seoSettings.facebook_pixel_id
    if (fbId && !fbInjected) {
      fbInjected = true
      const script = document.createElement('script')
      script.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${fbId}');
        fbq('track', 'PageView');
      `
      document.head.appendChild(script)
    }
  }, [loading, seoSettings.google_analytics_id, seoSettings.facebook_pixel_id])

  return null
}
