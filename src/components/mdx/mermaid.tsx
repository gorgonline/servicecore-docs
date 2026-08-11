'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Mermaid diyagram bileşeni.
 *
 * MDX'te doğrudan kullanılmaz: `source.config.ts`'teki `remarkMdxMermaid`
 * eklentisi ```mermaid kod bloklarını `<Mermaid chart="..." />` çağrısına
 * çevirir. Yazar yalnızca kod bloğu yazar, bileşen sözdizimi öğrenmez.
 *
 * Tasarım kararları:
 * - `mermaid` paketi ~500 KB. Dinamik `import()` ile YALNIZCA diyagram olan
 *   sayfalarda yüklenir; ilk açılışta bundle'a girmez.
 * - Renkler `themeVariables` ile tokens.css'ten OKUNUR (hardcode yok). Tema
 *   değişince `resolvedTheme` bağımlılığı yeniden render tetikler.
 * - Hata sayfayı düşürmez: mermaid sözdizimi bozuksa diyagram yerine kaynağın
 *   kendisi kod olarak gösterilir. Boş kutu bırakmak sessiz hatadır.
 */
export function Mermaid({ chart }: { chart: string }) {
  const rawId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;

        // Renkleri token katmanından oku — tokens.css tek kaynak olarak kalsın.
        const styles = getComputedStyle(document.documentElement);
        const token = (name: string, fallback: string) =>
          styles.getPropertyValue(name).trim() || fallback;

        const isDark = document.documentElement.classList.contains('dark');
        const fg = token('--sc-fg', '#1a1a1a');
        const mutedFg = token('--sc-muted-fg', '#525252');
        const surface = token('--sc-surface', '#ffffff');
        const surface2 = token('--sc-surface-2', '#f2f1ed');
        const border = token('--sc-border', '#edebe5');
        const brand = token('--sc-brand', '#0057c2');
        const figureBg = token('--sc-figure-bg', '#f2f1ed');

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          fontFamily: token('--sc-font-sans', 'inherit'),
          fontSize: 14,
          theme: 'base',
          // Düz figür dili: gölge yok, keskin köşe, kağıt tonları.
          //
          // Kenarlık rengi bilinçli olarak --sc-border DEĞİL --sc-muted-fg:
          // sayfa kenarlığı ayırıcıdır, diyagram konturu ise ANLAM taşır
          // (kutunun nerede bittiği bilgidir). Soluk tonda kutular hem kağıt
          // hem koyu zeminde kayboluyordu; ok çizgisiyle aynı ağırlıkta olmalı.
          themeVariables: {
            // `base` teması açıkça verilmeyen renkleri (küme zemini, not
            // kutusu, gantt bölümleri…) primary'den TÜRETİR ve yönü bu bayrağa
            // bakarak seçer. Verilmezse koyu temada zaten koyu olan zemini bir
            // kez daha koyulaştırır.
            darkMode: isDark,
            background: figureBg,
            primaryColor: surface,
            primaryTextColor: fg,
            primaryBorderColor: mutedFg,
            secondaryColor: surface2,
            secondaryTextColor: fg,
            secondaryBorderColor: mutedFg,
            tertiaryColor: figureBg,
            tertiaryTextColor: mutedFg,
            tertiaryBorderColor: mutedFg,
            lineColor: mutedFg,
            textColor: fg,
            mainBkg: surface,
            nodeBorder: mutedFg,
            clusterBkg: figureBg,
            clusterBorder: border,
            edgeLabelBackground: figureBg,
            titleColor: fg,
            // Akış/dizi diyagramlarında vurgulanan aktör marka rengini alır.
            actorBkg: surface,
            actorBorder: brand,
            actorTextColor: fg,
            labelBoxBkgColor: surface,
            labelBoxBorderColor: mutedFg,
            noteBkgColor: surface2,
            noteTextColor: fg,
            noteBorderColor: mutedFg,
          },
          flowchart: { curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true },
          gantt: { useMaxWidth: true },
        });

        // mermaid id'si CSS seçicisine giriyor: useId'nin ':' karakterleri geçersiz.
        const id = `sc-mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const { svg: rendered } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch (err) {
        // Sessiz kalma: konsola yaz, ekranda kaynağı göster.
        console.error('[Mermaid] diyagram render edilemedi:', err);
        if (!cancelled) {
          setSvg(null);
          setFailed(true);
        }
        // mermaid hata durumunda body'ye geçici bir element bırakabiliyor.
        document
          .querySelectorAll('[id^="dsc-mermaid-"]')
          .forEach((el) => el.remove());
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme, rawId]);

  if (failed) {
    return (
      <pre className="sc-mermaid-error">
        <code>{chart}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="sc-mermaid"
      role="img"
      // Diyagram henüz gelmemişken kutu zıplamasın.
      data-loading={svg ? undefined : 'true'}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
