import {compile} from '@mdx-js/mdx';
const out = String(await compile("metin bir\n\n\\\n\nmetin iki"));
console.log(out.slice(out.indexOf('children: [')));
