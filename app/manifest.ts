import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nima',
    short_name: 'Nima',
    description: 'Nima — try-on and shopping PWA',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    screenshots: [
      {
        src: '/screenshot-mobile.png', 
        sizes: '404x869',            
        type: 'image/png',
        label: 'App Mobile View',
  
      },
      {
        src: '/screenshot-desktop.png', 
        sizes: '1913x967',            
        type: 'image/png',
        label: 'Desktop view',
        form_factor: 'wide'          
      }
    ]
  }
}
