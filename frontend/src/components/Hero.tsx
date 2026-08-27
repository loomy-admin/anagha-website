
import { cmsSrc } from '@/lib/cmsAsset';

interface HeroMeta {
  filename: string | null;
  url?: string | null;
  type: 'image' | 'video' | 'gif' | null;
  originalName: string | null;
  uploadedAt: string | null;
}

export default async function Hero({ meta = { filename: null, url: null, type: null, originalName: null, uploadedAt: null } }: { meta?: HeroMeta | null }) {

  const src = cmsSrc(meta?.url || meta?.filename) || '/images/hero_banner.avif';
  const isVideo = meta?.type === 'video';

  return (
    <section className="relative w-full overflow-hidden bg-gray-100">
      {isVideo ? (
        <div className="relative w-full aspect-[4/5] xs:aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.4/1] max-h-[min(85vh,820px)]">
          <video
            className="absolute inset-0 w-full h-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            key={src}
          >
            <source src={src} />
          </video>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt="Anagha Hero Banner"
          className="block w-full h-auto"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 pointer-events-none" />
    </section>
  );
}
