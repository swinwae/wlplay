import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('strips <script> tags', () => {
    expect(sanitizeHtml('<p>ok</p><script>alert(1)</script>')).toBe('<p>ok</p>')
  })
  it('strips event handlers', () => {
    expect(sanitizeHtml('<a href="x" onclick="evil()">x</a>')).not.toContain('onclick')
  })
  it('keeps standard formatting', () => {
    const html = '<h1>标题</h1><p><strong>粗</strong></p><ul><li>a</li></ul>'
    expect(sanitizeHtml(html)).toBe(html)
  })
  it('keeps img and pre/code', () => {
    const html = '<p><img src="https://x/y.jpg" alt=""></p><pre><code class="language-ts">x</code></pre>'
    expect(sanitizeHtml(html)).toContain('<img')
    expect(sanitizeHtml(html)).toContain('<code')
  })
})
