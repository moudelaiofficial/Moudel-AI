
import { useEffect } from 'react'

const SITE_NAME = 'Moudel AI'
const SITE_URL = 'https://www.moudelai.com'

export default function SEO({
  title,
  description,
  path = '/',
  noindex = false,
  image = '/moudel-favicon.png',
}) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | ${SITE_NAME}`
      : 'Moudel AI – Research Workspace for Papers and Ideas'

    const pageDescription =
      description ||
      'Discover Moudel AI, a research workspace designed to help you explore academic papers, organize sources, save research notes, and develop ideas.'

    const canonicalUrl = new URL(path, SITE_URL).href
    const imageUrl = new URL(image, SITE_URL).href

    document.title = fullTitle

    function setMeta(attribute, key, content) {
      let element = document.head.querySelector(
        `meta[${attribute}="${key}"]`,
      )

      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
      }

      element.setAttribute('content', content)
    }

    function setLink(rel, href) {
      let element = document.head.querySelector(`link[rel="${rel}"]`)

      if (!element) {
        element = document.createElement('link')
        element.setAttribute('rel', rel)
        document.head.appendChild(element)
      }

      element.setAttribute('href', href)
    }

    setMeta(
      'name',
      'description',
      pageDescription,
    )

    setMeta(
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow',
    )

    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', pageDescription)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', imageUrl)

    setMeta('name', 'twitter:card', 'summary')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', pageDescription)
    setMeta('name', 'twitter:image', imageUrl)

    setLink('canonical', canonicalUrl)
  }, [title, description, path, noindex, image])

  return null
}
