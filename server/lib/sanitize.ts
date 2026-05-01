// server/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'p','br','hr','strong','em','del','code','pre','blockquote',
  'ul','ol','li','h1','h2','h3','h4','h5','h6',
  'a','img','span','div','table','thead','tbody','tr','th','td'
]
const ALLOWED_ATTR = ['href','src','alt','title','class','id','target','rel','colspan','rowspan']

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
