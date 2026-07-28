#!/usr/bin/env python3
"""docs-eski (Docusaurus build çıktısı) → Fumadocs MDX kaynak ağacı dönüştürücü.

Girdi : /Users/leventusta/Desktop/docs/docs-eski  (522 HTML build çıktısı)
Çıktı : /Users/leventusta/Desktop/docs/servicecore-docs-content/
          content/docs/**/*.mdx  + meta.json'lar
          public/img/**          (base64 çözümü + hash'i kırpılmış kopyalar)
          report.json            (istatistik + uyarılar)
"""
import base64
import os
import hashlib
import json
import re
import shutil
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

from bs4 import BeautifulSoup, NavigableString, Tag

# Yollar: script'in konumuna göre çözülür (repo taşınsa da çalışır)
_ROOT = Path(__file__).resolve().parents[2]          # …/servicecore-docs
SRC = Path(os.environ.get('DOCS_ESKI', _ROOT.parent / 'docs-eski'))
OUT = Path(os.environ.get('DOCS_OUT', _ROOT))
CONTENT = OUT / 'content' / 'docs'
PUBLIC = OUT / 'public'

# Eski bölüm klasörü -> (yeni klasör, bölüm başlığı)
SECTION_MAP = {
    'teknisyenkullanımkilavuzu': ('teknisyen', 'Teknisyen Kılavuzu'),
    'enduser': ('kullanici', 'Kullanıcı Kılavuzu'),
    'adminpaneli': ('yonetici', 'Yönetici Kılavuzu'),
    'entegrasyonlar': ('entegrasyonlar', 'Entegrasyon Kılavuzu'),
    'migration': ('migration', 'Migration Kılavuzu'),
    'kurulumkilavuzu': ('kurulum', 'Kurulum Kılavuzu'),
    'Esm': ('esm', 'ESM Kılavuzu'),
    'Adminegitimi': ('admin-egitimleri', 'Admin Eğitimleri (CSSM-A)'),
    'Teknisyen': ('teknisyen-egitimleri', 'Teknisyen Eğitimleri (CSSM-P)'),
    'CSSMAAdmin': ('cssma-admin', 'CSSM-A Admin (Arşiv)'),
}
SECTION_ORDER = ['teknisyen', 'kullanici', 'yonetici', 'entegrasyonlar',
                 'migration', 'kurulum', 'esm', 'admin-egitimleri',
                 'teknisyen-egitimleri']

# Yayınlanmayan bölümler: sayfaları üretilmez, URL'leri karşılığına yönlendirilir.
# CSSMAAdmin, Adminegitimi/Genel Panel Ayarları'nın eski bir kopyasıdır —
# aynı 12 konu orada çalışan YouTube videoları ve açıklama metniyle mevcut.
# Bu bölümün videoları client-side yükleniyordu, statik HTML'de URL'leri yok.
ARCHIVED_SECTIONS = {
    'cssma-admin/genel-panel-ayarlari': 'admin-egitimleri/genel-panel-ayarlari',
    'cssma-admin': 'admin-egitimleri',
}

ADMONITION_TYPE = {'info': 'info', 'note': 'info', 'tip': 'info',
                   'warning': 'warn', 'caution': 'warn', 'danger': 'error'}

report = {'pages': 0, 'images_copied': 0, 'base64_extracted': 0,
          'warnings': [], 'skipped_variants': [], 'video_stubs': [],
          'internal_links_rewritten': 0, 'unresolved_links': []}


def warn(msg):
    report['warnings'].append(msg)


def slugify(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('ı', 'i').replace('İ', 'i').replace('ß', 'ss')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    s = re.sub(r'-{2,}', '-', s)
    return s or 'sayfa'


def norm_key(s):
    """Unicode-varyant kopyaları eşlemek için agresif normalizasyon."""
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('ı', 'i')


# ---------------------------------------------------------------- sayfa keşfi
def discover_pages():
    sm = (SRC / 'sitemap.xml').read_text()
    urls = [unquote(u.replace('https://docs.servicecore.app', '')).rstrip('/')
            for u in re.findall(r'<loc>(.*?)</loc>', sm)]
    canon = [u for u in urls if u.startswith('/docs/')
             and '/category/' not in u and not u.startswith('/docs/tags')]

    # diskte olup sitemap'te olmayan gerçek sayfalar
    disk = []
    for f in sorted((SRC / 'docs').rglob('index.html')):
        rel = '/' + str(f.parent.relative_to(SRC))
        if '/category/' in rel or rel.startswith('/docs/docs') or '/blog' in rel:
            continue
        if rel in ('/docs', '/docs/markdown-page', '/docs/search'):
            continue
        disk.append(rel)

    have = {norm_key(p) for p in canon}
    extras = []
    for p in disk:
        k = norm_key(p)
        if k in have:
            if p not in canon:
                report['skipped_variants'].append(p)
            continue
        have.add(k)
        extras.append(p)

    # extras içindeki kendi-aralarında varyantları da ele (isakisi/isakısı)
    pages = canon + extras
    return sorted(set(pages))


def page_file(url):
    p = SRC / url.lstrip('/') / 'index.html'
    if p.exists():
        return p
    p2 = SRC / (url.lstrip('/') + '.html')
    return p2 if p2.exists() else None


# ------------------------------------------------------------- yol eşlemesi
def new_path_for(url):
    """/docs/Bölüm/Alt Klasör/sayfa -> ('bolum/alt-klasor/sayfa', parçalar)"""
    parts = [p for p in url.split('/') if p][1:]  # 'docs' at
    if parts == ['intro']:
        return 'index'
    sec = parts[0]
    mapped = SECTION_MAP.get(sec, (slugify(sec), sec))[0]
    rest = [slugify(p) for p in parts[1:]]
    return '/'.join([mapped] + rest)


# ------------------------------------------------------------- görsel işleme
img_hashes = {}   # hedef yol -> içerik sha1 (çakışma tespiti)


def unique_target(target: Path, digest: str) -> Path:
    i = 2
    t = target
    while t in img_hashes and img_hashes[t] != digest:
        t = target.with_stem(f'{target.stem}-{i}')
        i += 1
    return t


def save_image_bytes(data: bytes, target: Path) -> Path:
    digest = hashlib.sha1(data).hexdigest()
    t = unique_target(target, digest)
    if t not in img_hashes:
        t.parent.mkdir(parents=True, exist_ok=True)
        t.write_bytes(data)
        img_hashes[t] = digest
    return t


def handle_img_src(src, section_new, page_slug, counter):
    """src -> yeni site yolu (/img/...) veya None"""
    if src.startswith('data:image/'):
        m = re.match(r'data:image/([a-z+]+);base64,(.*)', src, re.S)
        if not m:
            return None
        ext = {'jpeg': 'jpg', 'svg+xml': 'svg'}.get(m.group(1), m.group(1))
        try:
            data = base64.b64decode(m.group(2))
        except Exception:
            return None
        name = f'{page_slug}-g{next(counter)}.{ext}'
        t = save_image_bytes(data, PUBLIC / 'img' / section_new / name)
        report['base64_extracted'] += 1
        return '/img/' + str(t.relative_to(PUBLIC / 'img'))
    # yerel dosya
    path = unquote(urlparse(src).path)
    local = SRC / path.lstrip('/')
    if not local.exists():
        return None
    name = local.name
    # docusaurus hash'ini kırp: name-8hex... .ext
    m = re.match(r'(.+)-[0-9a-f]{8,}(\.[a-z]+)$', name, re.I)
    if m:
        name = slugify(m.group(1)) + m.group(2).lower()
    else:
        name = slugify(local.stem) + local.suffix.lower()
    data = local.read_bytes()
    t = save_image_bytes(data, PUBLIC / 'img' / section_new / name)
    report['images_copied'] += 1
    return '/img/' + str(t.relative_to(PUBLIC / 'img'))


# ---------------------------------------------------------- metin kaçışları
def clean_chars(text):
    """Görünmez/bozuk karakterleri temizle: zero-width space (Docusaurus
    çapa artığı), NUL ve NUL'dan türeyen U+FFFD."""
    return text.replace('​', '').replace('\x00', '').replace('�', '')


def esc(text):
    text = clean_chars(text)
    text = text.replace('\\', '\\\\')
    for ch in '{}<>*_':
        text = text.replace(ch, '\\' + ch)
    text = re.sub(r'\s+', ' ', text)
    return text


def esc_attr(text):
    text = clean_chars(text)
    return re.sub(r'\s+', ' ', text).replace('"', '&quot;').strip()


# ------------------------------------------------------------- HTML -> MDX
class Converter:
    def __init__(self, section_new, page_slug, old_url, link_map):
        self.section = section_new
        self.page_slug = page_slug
        self.old_url = old_url
        self.link_map = link_map
        self._imgc = iter(range(1, 1000))

    # --- inline düzeyi ---
    def inline(self, node):
        out = []
        for c in node.children:
            out.append(self.inline_one(c))
        return ''.join(out)

    def inline_one(self, c):
        if isinstance(c, NavigableString):
            return esc(str(c))
        if not isinstance(c, Tag):
            return ''
        name = c.name
        if name in ('strong', 'b'):
            inner = self.inline(c).strip()
            return f'**{inner}**' if inner else ''
        if name in ('em', 'i'):
            inner = self.inline(c).strip()
            return f'*{inner}*' if inner else ''
        if name == 'u':
            return self.inline(c)
        if name == 'code':
            txt = clean_chars(c.get_text()).replace('`', '').strip()
            if not txt:
                return ''
            # Orijinal içerik cümlelerin yarısını <code> içine almış; bunlar
            # koca monospace bloklara dönüşüp okunmuyor. Üç kademe:
            #   kısa UI terimi        -> inline kod   (`Genel Ayarlar`)
            #   orta uzunlukta etiket -> kalın        (**Çözüm Süresi**)
            #   uzun liste/cümle      -> düz metin    (vurgu bilgi taşımıyor)
            words = txt.split()
            if len(txt) > 60 or txt.count(',') >= 2:
                return esc(txt)
            if len(txt) > 24 or len(words) > 3 or ',' in txt:
                return f'**{esc(txt)}**'
            return f'`{txt}`'
        if name == 'a':
            return self.link(c)
        if name == 'img':
            return self.image(c)
        if name == 'br':
            return '\\\n'
        if name in ('span', 'small', 'sub', 'sup', 'mark', 'abbr'):
            return self.inline(c)
        if name == 'iframe':
            return self.iframe(c)
        return self.inline(c)

    def link(self, a):
        href = a.get('href', '')
        text = self.inline(a).strip() or href
        if href.startswith('/docs/'):
            key = norm_key(unquote(href.split('#')[0]).rstrip('/'))
            if key in self.link_map:
                report['internal_links_rewritten'] += 1
                href = '/docs/' + self.link_map[key]
                href = href.replace('/docs/index', '/docs')
            else:
                report['unresolved_links'].append(
                    {'page': self.old_url, 'href': href})
        if href.startswith('/assets/') or href.startswith('/img/'):
            new = handle_img_src(href, self.section, self.page_slug, self._imgc)
            if new:
                href = new
        return f'[{text}]({href})'

    def image(self, img):
        src = img.get('src', '')
        alt = (img.get('alt') or '').replace('[', '').replace(']', '')
        new = handle_img_src(src, self.section, self.page_slug, self._imgc)
        if not new:
            warn(f'{self.old_url}: görsel çözülemedi: {src[:80]}')
            return ''
        return f'![{esc_attr(alt)}]({new})'

    def iframe(self, f):
        src = f.get('src', '')
        title = esc_attr(f.get('title') or 'Video')
        return (f'<iframe src="{src}" title="{title}" '
                f'className="w-full aspect-video rounded-xl border" '
                f'allowFullScreen />')

    # --- blok düzeyi ---
    def block(self, node, depth=0):
        out = []
        for c in node.children:
            if isinstance(c, NavigableString):
                t = esc(str(c)).strip()
                if t:
                    out.append(t + '\n')
                continue
            if not isinstance(c, Tag):
                continue
            out.append(self.block_one(c, depth))
        return ''.join(out)

    def block_one(self, c, depth=0):
        name = c.name
        cls = ' '.join(c.get('class', []))

        if name == 'h1':
            return ''  # frontmatter'da
        if name in ('h2', 'h3', 'h4', 'h5', 'h6'):
            level = int(name[1])
            return '#' * level + ' ' + esc(c.get_text(' ', strip=True)) + '\n\n'
        if name == 'p':
            # Kaynak yazarları bölüm başlıklarını <p><strong>…</strong></p>
            # olarak yazmış (gerçek h2 hiç kullanılmamış). Bunları gerçek
            # başlığa çevir: sayfalar yapı kazanır, TOC dolar.
            if depth == 0:
                kids = [k for k in c.children
                        if not (isinstance(k, NavigableString) and not str(k).strip())]
                if (len(kids) == 1 and isinstance(kids[0], Tag)
                        and kids[0].name in ('strong', 'b')):
                    txt = clean_chars(kids[0].get_text(' ', strip=True))
                    if 0 < len(txt) <= 80:
                        return '## ' + esc(txt).strip() + '\n\n'
            return self.paragraph(c)
        if name == 'details':
            summary = c.find('summary')
            title = summary.get_text(' ', strip=True) if summary else 'Detaylar'
            if summary:
                summary.extract()
            inner = self.block(c).strip()
            return (f'<Accordions type="single">\n'
                    f'<Accordion title="{esc_attr(title)}">\n\n'
                    f'{inner}\n\n</Accordion>\n</Accordions>\n\n')
        if name == 'summary':
            # details içindekiler extract edilir; buraya düşen summary
            # kaynakta başlık gibi kullanılmış çıplak bir summary'dir
            inner = self.inline(c).strip()
            return f'**{inner}**\n\n' if inner else ''
        if name == 'pre':
            return self.code_block(c)
        if 'theme-admonition' in cls:
            return self.admonition(c)
        if name in ('ul', 'ol'):
            return self.list(c, name, depth) + ('\n' if depth == 0 else '')
        if name == 'blockquote':
            inner = self.block(c).strip().replace('\n', '\n> ')
            return f'> {inner}\n\n'
        if name == 'table':
            return self.table(c)
        if name == 'iframe':
            return self.iframe(c) + '\n\n'
        if name == 'video':
            src = c.get('src') or (c.source.get('src') if c.source else '')
            return f'<video src="{src}" controls className="w-full rounded-xl" />\n\n'
        if name == 'img':
            r = self.image(c)
            return r + '\n\n' if r else ''
        if name in ('div', 'section', 'article', 'main', 'header', 'footer'):
            return self.block(c, depth)
        if name in ('hr',):
            return '---\n\n'
        if name in ('script', 'style', 'button', 'svg', 'nav'):
            return ''
        # bilinmeyen blok: inline_one ile işle ki <b>/<code> gibi
        # etiketlerin biçimlendirmesi korunarak paragraf olsun
        inner = self.inline_one(c).strip()
        return inner + '\n\n' if inner else ''

    def paragraph(self, p):
        # iframe/img içeren paragraflar
        text = self.inline(p).strip()
        if not text:
            return ''
        # '•' madde imli sözde-listeleri gerçek listeye çevir
        # (kaynakta her madde kendi paragrafında olabilir — tek madde de çevrilir)
        if text.lstrip('\\\n ').startswith('•') or '\\\n•' in text or ' • ' in text:
            items = [i.strip(' \\\n') for i in text.split('•') if i.strip(' \\\n')]
            if items:
                return '\n'.join(f'- {i}' for i in items) + '\n\n'
        text = re.sub(r'(\\\n\s*)+$', '', text)  # sondaki br'leri temizle
        # paragraf içine gömülü görselleri kendi bloklarına ayır (okunabilirlik)
        text = re.sub(r'\s*(?<!\[)(!\[[^\]]*\]\([^)\s]+\))\s*',
                      r'\n\n\1\n\n', text).strip()
        return text + '\n\n'

    def code_block(self, pre):
        cls = ' '.join(pre.get('class', []))
        m = re.search(r'language-([\w-]+)', cls)
        lang = m.group(1) if m else ''
        if lang == 'text':
            lang = ''
        lines = []
        for tl in pre.select('.token-line'):
            lines.append(tl.get_text())
        if not lines:
            lines = pre.get_text().split('\n')
        body = clean_chars('\n'.join(l.rstrip() for l in lines)).strip('\n')
        return f'```{lang}\n{body}\n```\n\n'

    def admonition(self, div):
        cls = ' '.join(div.get('class', []))
        m = re.search(r'theme-admonition-(\w+)', cls)
        typ = ADMONITION_TYPE.get(m.group(1) if m else 'info', 'info')
        head = div.select_one('[class*="admonitionHeading"]')
        title = head.get_text(strip=True) if head else ''
        content_el = div.select_one('[class*="admonitionContent"]') or div
        inner = self.block(content_el).strip()
        t = f' title="{esc_attr(title)}"' if title else ''
        return f'<Callout type="{typ}"{t}>\n{inner}\n</Callout>\n\n'

    def list(self, node, kind, depth):
        out = []
        # <ol start="N"> numaralandırmasını koru
        try:
            idx = int(node.get('start', 1))
        except (TypeError, ValueError):
            idx = 1
        for li in node.find_all('li', recursive=False):
            marker = f'{idx}. ' if kind == 'ol' else '- '
            idx += 1
            # alt listeleri ayır
            subs = li.find_all(['ul', 'ol'], recursive=False)
            for s in subs:
                s.extract()
            text = self.inline(li).strip()
            out.append('    ' * depth + marker + text)
            for s in subs:
                out.append(self.list(s, s.name, depth + 1))
        return '\n'.join(out) + '\n'

    def table(self, t):
        rows = []
        for tr in t.find_all('tr'):
            cells = [self.inline(td).strip().replace('|', '\\|')
                     for td in tr.find_all(['th', 'td'])]
            rows.append('| ' + ' | '.join(cells) + ' |')
        if not rows:
            return ''
        if len(rows) == 1:
            rows.append('| ' + ' | '.join(['---'] * rows[0].count('|')) + ' |')
        else:
            ncols = rows[0].count('|') - 1
            rows.insert(1, '|' + '|'.join([' --- '] * ncols) + '|')
        return '\n'.join(rows) + '\n\n'


# ---------------------------------------------------------------- ana akış
def main():
    if not SRC.exists():
        raise SystemExit(f'Kaynak bulunamadı: {SRC}\n'
                         'DOCS_ESKI ortam değişkeniyle yol verebilirsiniz.')
    # SADECE üretilen dizinler temizlenir — OUT kökü asla silinmez.
    for d in (CONTENT, PUBLIC / 'img'):
        if d.exists():
            shutil.rmtree(d)
    CONTENT.mkdir(parents=True)
    (PUBLIC / 'img').mkdir(parents=True)

    all_pages = discover_pages()

    def archived_target(newp):
        """Arşiv bölümündeki bir yolun yayınlanan karşılığını döndürür."""
        for old_pref, new_pref in ARCHIVED_SECTIONS.items():
            if newp == old_pref or newp.startswith(old_pref + '/'):
                return new_pref + newp[len(old_pref):]
        return None

    # Arşiv bölümlerinin sayfaları üretilmez; URL'leri sonra yönlendirilir.
    pages, archived = [], []
    for u in all_pages:
        (archived if archived_target(new_path_for(u)) else pages).append(u)
    report['archived_pages'] = len(archived)

    # eski url (norm) -> yeni yol haritası (link yeniden yazımı için)
    link_map = {norm_key(u): new_path_for(u) for u in pages}

    # aynı ada sahip sayfa+klasör çakışmaları: sayfa klasörün index'i olur
    all_new = set(link_map.values())
    parent_dirs = set()
    for p in all_new:
        parts = p.split('/')
        for i in range(1, len(parts)):
            parent_dirs.add('/'.join(parts[:i]))
    page_is_folder = all_new & parent_dirs

    # sıralama ve klasör başlığı toplayıcıları
    folder_entries = defaultdict(dict)   # yeni klasör -> {(tür, ad): sıra}
    folder_titles = {}                   # yeni klasör -> görünen başlık
    page_titles = {}

    # ---- kategori index sayfaları: klasör sıralamasının birincil kaynağı ----
    # Docusaurus her kategori için çocuklarını SIRALI kart listesi olarak
    # içeren bir /category/ sayfası üretir; sıra buradan birebir alınır.
    sm = (SRC / 'sitemap.xml').read_text()
    cat_urls = [unquote(u.replace('https://docs.servicecore.app', '')).rstrip('/')
                for u in re.findall(r'<loc>(.*?)</loc>', sm) if '/category/' in u]
    cat_children, cat_titles = {}, {}
    for cu in cat_urls:
        cf = page_file(cu)
        if not cf:
            continue
        csoup = BeautifulSoup(cf.read_text(), 'lxml')
        cards = csoup.select('main a.card[href], article a.card[href]')
        cat_children[norm_key(cu)] = [unquote(a['href']).rstrip('/')
                                      for a in cards]
        h1 = csoup.select_one('main h1')
        if h1:
            cat_titles[norm_key(cu)] = clean_chars(h1.get_text(' ', strip=True))

    def resolve_folder(cu_key, seen=None):
        """Kategori url'sini yeni klasör yoluna çözer (çocuklarından)."""
        seen = seen or set()
        if cu_key in seen:
            return None
        seen.add(cu_key)
        for h in cat_children.get(cu_key, []):
            if '/category/' in h:
                sub = resolve_folder(norm_key(h), seen)
                if sub and '/' in sub:
                    return sub.rsplit('/', 1)[0]
            else:
                k = norm_key(h)
                if k in link_map:
                    np = link_map[k]
                    if np in page_is_folder:
                        # klasör-index'i olmuş sayfa: konumu belirsiz, atla
                        continue
                    return np.rsplit('/', 1)[0] if '/' in np else ''
        return None

    catorder = defaultdict(dict)  # yeni klasör -> {çocuk_adı: konum}
    for cu_key, hrefs in cat_children.items():
        folder = resolve_folder(cu_key)
        if folder is None:
            continue
        if cu_key in cat_titles:
            folder_titles[folder] = cat_titles[cu_key]
        d = catorder[folder]
        for pos, h in enumerate(hrefs):
            if '/category/' in h:
                sub = resolve_folder(norm_key(h))
                if sub:
                    d.setdefault(sub.split('/')[-1], pos)
            else:
                k = norm_key(h)
                if k in link_map:
                    d.setdefault(link_map[k].split('/')[-1], pos)

    # pagination (Önceki/Sonraki) zinciri — yedek sıralama kaynağı
    pag_prev, pag_next = {}, {}

    for url in pages:
        f = page_file(url)
        if not f:
            warn(f'dosya yok: {url}')
            continue
        soup = BeautifulSoup(f.read_text(), 'lxml')
        md = soup.select_one('div.theme-doc-markdown')
        if md is None:
            warn(f'markdown div yok: {url}')
            continue

        newp = new_path_for(url)
        parts = newp.split('/')
        section_new = parts[0] if newp != 'index' else 'genel'
        page_slug = parts[-1]

        # pagination linkleri (sıralama için)
        pa = soup.select_one('a.pagination-nav__link--prev')
        na = soup.select_one('a.pagination-nav__link--next')
        if pa and pa.get('href'):
            pag_prev[norm_key(url)] = norm_key(unquote(pa['href']).rstrip('/'))
        if na and na.get('href'):
            pag_next[norm_key(url)] = norm_key(unquote(na['href']).rstrip('/'))

        # başlık
        h1 = md.find('h1')
        title = h1.get_text(' ', strip=True) if h1 else \
            soup.title.get_text().strip().rstrip('| Servicecore Docs').strip()
        if not title:
            title = page_slug
        page_titles[newp] = title

        # breadcrumb'dan klasör başlıkları
        bc = [b.get_text(strip=True) for b in
              soup.select('nav.theme-doc-breadcrumbs .breadcrumbs__item')]
        bc = [b for b in bc if b]
        old_parts = [p for p in url.split('/') if p][1:]
        # bc: [SEKSIYON, alt kategori..., (sayfa)] — klasör derinliğiyle hizala
        folders_old = old_parts[:-1]
        folders_new = parts[:-1]
        for i in range(len(folders_new)):
            key = '/'.join(folders_new[:i + 1])
            if i < len(bc):
                folder_titles.setdefault(key, bc[i])

        # sidebar: genişletilmiş kategorilerden sıralama
        for ul in soup.select('nav.menu ul.menu__list'):
            links = []
            for li in ul.find_all('li', recursive=False):
                a = li.find('a', class_='menu__link')
                if not a:
                    continue
                href = unquote(a.get('href', '')).rstrip('/')
                label = a.get_text(strip=True)
                links.append((label, href))
            # leaf linklerin ortak dizininden klasörü bul
            leafs = [h for _, h in links
                     if h.startswith('/docs/') and '/category/' not in h]
            if not leafs:
                continue
            keys = [norm_key(h) for h in leafs]
            newps = [link_map[k] for k in keys if k in link_map]
            if not newps:
                continue
            parent = newps[0].rsplit('/', 1)[0] if '/' in newps[0] else ''
            order = folder_entries[parent]
            pos = 0
            for label, href in links:
                if '/category/' in href:
                    sub = resolve_folder(norm_key(href))
                    if sub:
                        order.setdefault(('cat', sub.split('/')[-1]), pos)
                        folder_titles.setdefault(sub, label)
                else:
                    k = norm_key(href)
                    if k in link_map:
                        child = link_map[k]
                        if child.rsplit('/', 1)[0] == parent or '/' not in child:
                            order.setdefault(('page', child.split('/')[-1]), pos)
                pos += 1

        # --- içerik dönüşümü ---
        conv = Converter(section_new, page_slug, url, link_map)
        body = conv.block(md).strip()
        body = re.sub(r'\n{3,}', '\n\n', body)

        is_stub = len(body) < 40
        uses_callout = '<Callout' in body

        if is_stub and url.startswith('/docs/CSSMAAdmin'):
            vid = slugify(page_slug)
            body = (f'<Callout type="warn" title="Video hazırlanıyor">\n'
                    f'Bu eğitim videosu yeni dokümantasyon sitesine henüz '
                    f'taşınmadı. (Kaynak: `{vid}.mp4`)\n</Callout>')
            uses_callout = True
            report['video_stubs'].append(newp)
        elif is_stub:
            warn(f'kısa/boş sayfa: {url} ({len(body)} kr)')

        # description: ilk anlamlı düz paragraftan üret (arama + SEO + kartlar)
        desc = ''
        for line in body.split('\n'):
            s = line.strip()
            if (not s or s.startswith(('#', '!', '<', '-', '>', '|', '```'))
                    or re.match(r'^\d+\.\s', s)):
                continue
            s = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', s)          # görsel
            s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)      # link
            s = re.sub(r'[*`\\]', '', s).strip()                 # biçim işaretleri
            s = re.sub(r'\s+', ' ', s)
            if len(s) >= 25:
                desc = s if len(s) <= 155 else s[:152].rsplit(' ', 1)[0] + '…'
                break
        if not desc:
            # Metni çok az olan sayfalar (çoğu video dersi): başlıktan üret
            sec_title = SECTION_MAP.get(url.split('/')[2], ('', ''))[1]
            if '<iframe' in body:
                desc = f'{title} — {sec_title} eğitim videosu'
            elif sec_title:
                desc = f'{title} · {sec_title}'

        fm = ['---', f'title: "{title}"']
        if desc:
            fm.append(f'description: "{desc.replace(chr(34), chr(39))}"')
        fm.append('---\n')
        header = '\n'.join(fm)
        imports = ''
        # Callout fumadocs-ui'da global MDX bileşeni olarak tanımlanacak;
        # import gerekmez (mdx-components.tsx ile sağlanır).
        mdx = header + '\n' + imports + body + '\n'

        fp = newp + '/index' if newp in page_is_folder else newp
        target = CONTENT / (fp + '.mdx')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(mdx)
        report['pages'] += 1

    # ---------------------------------------------------------- meta.json
    # klasör ağacını tara, her klasöre meta.json yaz
    def write_meta(folder: Path):
        rel = str(folder.relative_to(CONTENT)) if folder != CONTENT else ''
        children_pages = sorted(p.stem for p in folder.glob('*.mdx')
                                if p.stem != 'index')
        children_dirs = sorted(d.name for d in folder.iterdir() if d.is_dir())
        order = folder_entries.get(rel, {})
        cat = catorder.get(rel, {})

        def sort_key(name, kind):
            # 1. öncelik: kategori index sayfası sırası; 2: sidebar;
            # 3: başlangıç/index başa; 4: alfabetik
            if name in cat:
                return (0, cat[name], name)
            if (kind, name) in order:
                return (1, order[(kind, name)], name)
            if name in ('baslangic', 'index'):
                return (2, -1, name)
            return (2, 999, name)

        items = ([(n, 'page') for n in children_pages] +
                 [(n, 'cat') for n in children_dirs])
        items.sort(key=lambda x: sort_key(x[0], x[1]))
        pages_list = [n for n, _ in items]
        # NOT: klasörün index.mdx'i meta.json'da LİSTELENMEZ. Fumadocs bu
        # durumda klasör başlığını doğrudan giriş sayfasına bağlar; listelenirse
        # kenar çubuğunda bölüm adı iki kez görünür.

        meta = {}
        title = folder_titles.get(rel)
        if rel == '':
            pages_list = ['index'] + [s for s in SECTION_ORDER
                                      if s in pages_list]
            meta = {'pages': pages_list}
        else:
            top = rel.split('/')[0]
            for old, (new, t) in SECTION_MAP.items():
                if rel == new:
                    title = t
            meta = {'title': title or folder.name, 'pages': pages_list}
        (folder / 'meta.json').write_text(
            json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
        for d in folder.iterdir():
            if d.is_dir():
                write_meta(d)

    write_meta(CONTENT)

    # ------------------------------------------------ klasör giriş sayfaları
    # Eski sitede her kategori için kart listeli bir /category/ sayfası vardı.
    # index.mdx'i olmayan her klasöre aynı işlevi gören bir giriş sayfası üret.
    def read_fm(mdx: Path):
        t = mdx.read_text()
        m = re.match(r'---\n(.*?)\n---', t, re.S)
        fm = m.group(1) if m else ''
        def field(k):
            mm = re.search(rf'^{k}:\s*"(.*)"\s*$', fm, re.M)
            return mm.group(1) if mm else ''
        return field('title') or mdx.stem, field('description')

    def write_index(folder: Path):
        for d in folder.iterdir():
            if d.is_dir():
                write_index(d)
        if folder == CONTENT or (folder / 'index.mdx').exists():
            return
        rel = str(folder.relative_to(CONTENT))
        meta = json.loads((folder / 'meta.json').read_text())
        title = meta.get('title', folder.name)
        cards = []
        for name in meta.get('pages', []):
            child = folder / f'{name}.mdx'
            if child.exists():
                ct, cd = read_fm(child)
                href = f'/docs/{rel}/{name}'
            elif (folder / name).is_dir():
                sub = json.loads((folder / name / 'meta.json').read_text())
                ct = sub.get('title', name)
                # klasör kartı: içindeki ilk birkaç sayfanın adını göster
                names = []
                for c in sub.get('pages', []):
                    if c == 'index':
                        continue
                    cp = folder / name / f'{c}.mdx'
                    if cp.exists():
                        names.append(read_fm(cp)[0])
                    elif (folder / name / c).is_dir():
                        cm = folder / name / c / 'meta.json'
                        if cm.exists():
                            names.append(json.loads(cm.read_text())
                                         .get('title', c))
                total = len(names)
                shown = names[:3]
                cd = ', '.join(shown)
                if total > len(shown):
                    cd += f' ve {total - len(shown)} sayfa daha'
                href = f'/docs/{rel}/{name}'
            else:
                continue
            body = re.sub(r'\s+', ' ', cd).strip()
            body = (body[:110].rsplit(' ', 1)[0] + '…') if len(body) > 110 else body
            cards.append(f'  <Card title="{ct}" href="{href}">\n'
                         f'    {body}\n  </Card>' if body else
                         f'  <Card title="{ct}" href="{href}" />')
        if not cards:
            return
        page = (f'---\ntitle: "{title}"\ndescription: "{title} bölümündeki '
                f'sayfalar"\n---\n\n<Cards>\n' + '\n'.join(cards) +
                '\n</Cards>\n')
        (folder / 'index.mdx').write_text(page)
        report['generated_index_pages'] = report.get('generated_index_pages', 0) + 1

    write_index(CONTENT)

    # -------------------------------------------------- ana giriş sayfası
    # Kök index.mdx (eski /docs/intro) bölüm kartlarıyla zenginleştirilir.
    root_idx = CONTENT / 'index.mdx'
    if root_idx.exists():
        old = root_idx.read_text()
        img = ''
        m = re.search(r'^!\[.*?\]\(.*?\)$', old, re.M)
        if m:
            img = m.group(0)
        cards = []
        for sec in SECTION_ORDER:
            mj = CONTENT / sec / 'meta.json'
            if not mj.exists():
                continue
            meta = json.loads(mj.read_text())
            st = meta.get('title', sec)
            n = sum(1 for p in (CONTENT / sec).rglob('*.mdx')
                    if p.name != 'index.mdx')
            cards.append(f'  <Card title="{st}" href="/docs/{sec}">\n'
                         f'    {n} sayfa\n  </Card>')
        root_idx.write_text(
            '---\ntitle: "Servicecore Dokümantasyonu"\n'
            'description: "Servicecore hizmet yönetimi platformunun '
            'kılavuzları, eğitim videoları ve kurulum dokümanları"\n---\n\n'
            'Servicecore hizmet yönetimi platformunun tüm kılavuzları, eğitim '
            'videoları ve kurulum dokümanları burada. Aradığınız konuyu sol '
            'menüden bulabilir veya üstteki arama kutusunu kullanabilirsiniz.\n\n'
            '<Cards>\n' + '\n'.join(cards) + '\n</Cards>\n\n'
            '## Yazılımın Yapısı\n\n' + (img + '\n' if img else ''))

    # ------------------------------------------------ eski URL yönlendirmeleri
    # Eski site (docs.servicecore.app) indekslenmiş durumda; tüm eski yollar
    # yeni karşılıklarına kalıcı (308) yönlendirilir. next.config'e beslenir.
    # Next.js yolları büyük/küçük harf duyarsız eşleştirir: kaynağı yeni bir
    # sayfa adresiyle çakışan kural ya sonsuz döngü yaratır ya da gerçek
    # sayfayı gölgeler. Bu yüzden çakışanlar atlanır (o adresler zaten
    # doğru sayfaya düşer).
    live_urls = set()
    for p in link_map.values():
        u = '/docs' if p == 'index' else f'/docs/{p}'
        live_urls.add(u.lower())
        # klasör giriş sayfaları da canlı adrestir (write_index üretir)
        parts = u.split('/')
        for i in range(3, len(parts)):
            live_urls.add('/'.join(parts[:i]).lower())

    redirects = []
    seen_src = set()

    def add_redirect(src, dest):
        low = src.lower()
        if src in seen_src or low == dest.lower() or low in live_urls:
            report.setdefault('redirects_skipped', []).append(src)
            return
        seen_src.add(src)
        redirects.append({'source': src, 'destination': dest,
                          'permanent': True})
        # Tarayıcılar Türkçe karakterleri yüzde-kodlu gönderir; Next.js
        # eşleştirmesi kodlanmış yol üzerinden yapılır. Ayrıca eski site
        # macOS'ta üretildiği için yollar ayrık (NFD) biçimde; tarayıcılar
        # ise birleşik (NFC) gönderir. Her iki kodlanmış biçim de eklenir.
        for form in ('NFC', 'NFD'):
            enc = quote(unicodedata.normalize(form, src), safe='/')
            if enc != src and not any(r['source'] == enc for r in redirects):
                redirects.append({'source': enc, 'destination': dest,
                                  'permanent': True})

    for k, newp in sorted(link_map.items()):
        dest = '/docs' if newp == 'index' else f'/docs/{newp}'
        for src_url in pages:
            if norm_key(src_url) == k:
                add_redirect(src_url, dest)
    # unicode-varyant kopya klasörler de yönlendirilsin
    for var in report['skipped_variants']:
        k = norm_key(var)
        if k in link_map:
            newp = link_map[k]
            add_redirect(var, '/docs' if newp == 'index' else f'/docs/{newp}')

    # arşiv bölümlerinin URL'leri yayınlanan karşılıklarına
    published = {p for p in link_map.values()}
    for u in archived:
        tgt = archived_target(new_path_for(u))
        if tgt not in published:
            # karşılığı yoksa bölüm giriş sayfasına düşür
            tgt = tgt.split('/')[0]
        add_redirect(u, f'/docs/{tgt}')
    (OUT / 'redirects.json').write_text(
        json.dumps(redirects, ensure_ascii=False, indent=2) + '\n')
    report['redirects'] = len(redirects)

    report['total_images'] = len(img_hashes)
    (OUT / 'report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Sayfa: {report['pages']}, görsel: {report['total_images']} "
          f"(base64: {report['base64_extracted']}), "
          f"link rewrite: {report['internal_links_rewritten']}, "
          f"uyarı: {len(report['warnings'])}, "
          f"çözülmeyen link: {len(report['unresolved_links'])}, "
          f"video stub: {len(report['video_stubs'])}")


if __name__ == '__main__':
    main()
