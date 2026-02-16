# SEO Implementation Guide

This document outlines the comprehensive SEO implementation for the OpsUI application, following industry standards and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Implementation Components](#implementation-components)
3. [Usage Guide](#usage-guide)
4. [Best Practices](#best-practices)
5. [SEO Checklist](#seo-checklist)
6. [Monitoring & Validation](#monitoring--validation)

## Overview

OpsUI implements a comprehensive SEO strategy that includes:

- **Meta Tags**: Primary meta tags, Open Graph, and Twitter Cards
- **Structured Data**: JSON-LD schema markup for Organization, WebApplication, and SoftwareApplication
- **Dynamic SEO**: Route-based SEO configuration with automatic updates
- **Semantic HTML**: Proper HTML5 semantic structure
- **Performance Optimizations**: Preconnect, DNS prefetch, and resource hints
- **PWA Support**: Web app manifest for progressive web app capabilities

## Implementation Components

### 1. Core SEO Utilities (`src/utils/seo.ts`)

The SEO utilities module provides:

- **Meta tag management**: Functions to update, create, and remove meta tags dynamically
- **SEO configuration**: Pre-defined SEO configurations for all routes
- **Structured data generation**: Helper functions for JSON-LD schema generation

```typescript
import { applySEOForRoute, applySEOConfig, SEOConfig } from '@/utils/seo';

// Apply SEO for a specific route
applySEOForRoute('/dashboard');

// Apply custom SEO configuration
applySEOConfig({
  title: 'Custom Page Title',
  description: 'Custom page description',
  keywords: ['custom', 'page'],
});
```

### 2. useSEO Hook (`src/hooks/useSEO.ts`)

React hook for managing SEO in components:

```typescript
import { useSEO, usePageSEO } from '@/hooks/useSEO';

function MyPage() {
  // Automatic route-based SEO
  useSEO();

  // Or custom page SEO
  usePageSEO(
    'Page Title',
    'Page description',
    ['keyword1', 'keyword2']
  );

  return <div>Page content</div>;
}
```

### 3. SEO Component (`src/components/shared/SEO.tsx`)

Declarative SEO component for React:

```typescript
import { SEO, PageSEO, NoIndexSEO } from '@/components/shared';

function MyPage() {
  return (
    <>
      <SEO
        title="Custom Title"
        description="Custom description"
        keywords={['keyword']}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Page', url: '/page' }
        ]}
      />
      <PageContent />
    </>
  );
}

// For pages that shouldn't be indexed
function AdminPage() {
  return (
    <>
      <NoIndexSEO />
      <AdminContent />
    </>
  );
}
```

### 4. Semantic HTML Components (`src/components/shared/Semantic.tsx`)

Semantic HTML5 components for better structure:

```typescript
import {
  MainContent,
  Article,
  Section,
  Navigation,
  PageHeader,
  PageFooter,
  Figure,
  Time,
} from '@/components/shared';

function MyPage() {
  return (
    <MainContent>
      <PageHeader>
        <h1>Page Title</h1>
      </PageHeader>
      <Section>
        <h2>Section Title</h2>
        <Article>
          <h3>Article Title</h3>
          <Time dateTime="2024-01-15">January 15, 2024</Time>
        </Article>
      </Section>
    </MainContent>
  );
}
```

### 5. PageHead Component (`src/components/shared/PageHead.tsx`)

Proper heading hierarchy components:

```typescript
import { PageHead, SectionHead, SubSectionHead } from '@/components/shared';

function MyPage() {
  return (
    <div>
      <PageHead
        title="Dashboard"
        description="Real-time overview"
        breadcrumbs={[{ label: 'Home', href: '/' }]}
        actions={<Button>Refresh</Button>}
      />
      <Section>
        <SectionHead title="Statistics" />
        {/* Content */}
      </Section>
    </div>
  );
}
```

## Usage Guide

### Adding SEO to a New Page

1. **Automatic SEO** (recommended for most pages):

```typescript
import { useSEO } from '@/hooks/useSEO';

function NewPage() {
  // SEO is automatically applied based on route
  useSEO();

  return <div>Page content</div>;
}
```

2. **Custom SEO**:

```typescript
import { useSEO } from '@/hooks/useSEO';

function CustomPage() {
  useSEO({
    title: 'Custom Page - OpsUI',
    description: 'Custom page description for SEO',
    keywords: ['custom', 'page', 'keywords'],
    ogImage: '/custom-og-image.png',
  });

  return <div>Page content</div>;
}
```

3. **Declarative SEO**:

```typescript
import { SEO } from '@/components/shared';

function DeclarativePage() {
  return (
    <>
      <SEO
        title="Declarative Page"
        description="Using declarative SEO component"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Declarative Page',
        }}
      />
      <div>Page content</div>
    </>
  );
}
```

### Adding Page to Sitemap

Update `packages/frontend/public/sitemap.xml`:

```xml
<url>
  <loc>https://opsui.app/new-page</loc>
  <lastmod>2026-02-16</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

### Adding SEO Configuration for New Route

Update `packages/frontend/src/utils/seo.ts`:

```typescript
export const PAGE_SEO_CONFIGS: Record<string, SEOConfig> = {
  // ... existing configs
  '/new-page': {
    title: 'New Page - OpsUI',
    description: 'Description for the new page',
    keywords: ['new', 'page', 'keywords'],
    ogType: 'website',
  },
};
```

## Best Practices

### 1. Title Tags

- Keep titles under 60 characters
- Include brand name at the end
- Make each page title unique
- Use format: `Page Name - OpsUI`

### 2. Meta Descriptions

- Keep descriptions under 160 characters
- Include relevant keywords naturally
- Make each description unique
- Include a call-to-action when appropriate

### 3. Heading Hierarchy

- Use only one H1 per page (via PageHead)
- Follow proper hierarchy: H1 > H2 > H3
- Don't skip heading levels
- Use PageHead, SectionHead, SubSectionHead components

### 4. Images

- Use descriptive alt text
- Include width and height attributes
- Use modern image formats (WebP)
- Implement lazy loading for below-fold images

### 5. URLs

- Use lowercase, hyphen-separated URLs
- Keep URLs short and descriptive
- Avoid URL parameters when possible
- Implement canonical URLs

### 6. Structured Data

- Use JSON-LD format
- Include all required properties
- Validate using Google's Rich Results Test
- Keep structured data up-to-date

## SEO Checklist

### Technical SEO

- [x] Meta title and description on all pages
- [x] Open Graph tags for social sharing
- [x] Twitter Card tags
- [x] Canonical URLs
- [x] Robots.txt file
- [x] XML Sitemap
- [x] Structured data (JSON-LD)
- [x] Mobile-responsive design
- [x] HTTPS (production)
- [x] Fast page load times
- [x] No broken links

### On-Page SEO

- [x] Single H1 per page
- [x] Proper heading hierarchy
- [x] Descriptive alt text for images
- [x] Internal linking
- [x] Breadcrumb navigation
- [x] Semantic HTML structure

### Content SEO

- [x] Unique content on each page
- [x] Relevant keywords in content
- [x] Clear page purpose
- [x] User-friendly URLs

## Monitoring & Validation

### Tools

1. **Google Search Console**
   - Monitor indexing status
   - Check for crawl errors
   - View search performance

2. **Google Rich Results Test**
   - Validate structured data
   - Preview rich snippets
   - https://search.google.com/test/rich-results

3. **Lighthouse**
   - Run SEO audit in Chrome DevTools
   - Check for SEO issues
   - Score: 90+ target

4. **Schema Markup Validator**
   - https://validator.schema.org/
   - Validate JSON-LD structure

### Testing SEO Locally

```bash
# Run Lighthouse SEO audit
npx lighthouse http://localhost:5173 --only-categories=seo

# Validate structured data
# Open Chrome DevTools > Application > Structured Data
```

### SEO Validation Commands

```typescript
// Check meta tags in console
document.querySelectorAll('meta').forEach(m => console.log(m.outerHTML));

// Check structured data
document
  .querySelectorAll('script[type="application/ld+json"]')
  .forEach(s => console.log(JSON.parse(s.textContent)));
```

## Files Reference

| File                                                   | Purpose                                      |
| ------------------------------------------------------ | -------------------------------------------- |
| `packages/frontend/index.html`                         | Base HTML with meta tags and structured data |
| `packages/frontend/public/robots.txt`                  | Search engine crawling rules                 |
| `packages/frontend/public/sitemap.xml`                 | XML sitemap for search engines               |
| `packages/frontend/public/manifest.json`               | PWA manifest                                 |
| `packages/frontend/src/utils/seo.ts`                   | SEO utility functions                        |
| `packages/frontend/src/hooks/useSEO.ts`                | React SEO hook                               |
| `packages/frontend/src/components/shared/SEO.tsx`      | SEO React component                          |
| `packages/frontend/src/components/shared/Semantic.tsx` | Semantic HTML components                     |
| `packages/frontend/src/components/shared/PageHead.tsx` | Heading hierarchy components                 |

## Conclusion

This SEO implementation follows industry standards and provides:

1. **Comprehensive meta tag management** for all pages
2. **Dynamic SEO** that updates based on routes
3. **Structured data** for rich search results
4. **Semantic HTML** for better accessibility and SEO
5. **Performance optimizations** for faster loading
6. **PWA support** for mobile experience

Regular monitoring and updates are recommended to maintain optimal SEO performance.
