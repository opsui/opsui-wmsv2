/**
 * SEO Utilities
 *
 * Comprehensive SEO management utilities for the OpsUI application.
 * Handles meta tags, Open Graph, Twitter Cards, and structured data.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  noFollow?: boolean;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TITLE = 'OpsUI - Enterprise Resource Planning System';
const DEFAULT_DESCRIPTION =
  'Comprehensive warehouse management and ERP solution featuring inventory control, order fulfillment, picking, packing, shipping, and real-time analytics for modern businesses.';
const DEFAULT_KEYWORDS = [
  'ERP',
  'Warehouse Management',
  'Inventory Control',
  'Order Fulfillment',
  'Picking',
  'Packing',
  'Shipping',
  'Supply Chain',
  'Logistics',
  'Business Management',
  'Stock Control',
  'WMS',
  'Enterprise Software',
];
const DEFAULT_OG_IMAGE = '/og-image.png';
const BASE_URL: string = import.meta.env.VITE_APP_URL ?? 'https://opsui.app';

// Page-specific SEO configurations
export const PAGE_SEO_CONFIGS: Record<string, SEOConfig> = {
  '/': {
    title: 'OpsUI - Enterprise Resource Planning System',
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    ogType: 'website',
  },
  '/login': {
    title: 'Login - OpsUI',
    description:
      'Secure login to your OpsUI warehouse management dashboard. Access your inventory, orders, and fulfillment tools.',
    keywords: ['login', 'secure access', 'warehouse management login'],
    noIndex: true, // Don't index login pages
  },
  '/dashboard': {
    title: 'Dashboard - OpsUI',
    description:
      'Real-time overview of your warehouse operations. Monitor orders, inventory levels, picking progress, and key performance indicators.',
    keywords: ['dashboard', 'analytics', 'warehouse overview', 'KPI', 'metrics'],
    ogType: 'website',
  },
  '/orders': {
    title: 'Order Queue - OpsUI',
    description:
      'Manage and process customer orders efficiently. View order queue, claim orders for picking, and track fulfillment status.',
    keywords: ['order queue', 'order management', 'fulfillment', 'picking queue'],
    ogType: 'website',
  },
  '/packing': {
    title: 'Packing Queue - OpsUI',
    description:
      'Streamline your packing operations. View orders ready for packing, print shipping labels, and manage package workflows.',
    keywords: ['packing', 'shipping', 'fulfillment', 'package management'],
    ogType: 'website',
  },
  '/stock-control': {
    title: 'Stock Control - OpsUI',
    description:
      'Complete inventory management solution. Track stock levels, manage locations, perform cycle counts, and optimize warehouse storage.',
    keywords: ['stock control', 'inventory management', 'cycle counting', 'warehouse storage'],
    ogType: 'website',
  },
  '/inwards': {
    title: 'Inwards Goods - OpsUI',
    description:
      'Manage incoming inventory and receiving operations. Process ASNs, handle putaway, and track inbound shipments.',
    keywords: ['inwards goods', 'receiving', 'ASN', 'putaway', 'inbound logistics'],
    ogType: 'website',
  },
  '/production': {
    title: 'Production - OpsUI',
    description:
      'Manufacturing and production management. Schedule production runs, track work orders, and monitor manufacturing KPIs.',
    keywords: ['production', 'manufacturing', 'work orders', 'production scheduling'],
    ogType: 'website',
  },
  '/maintenance': {
    title: 'Maintenance - OpsUI',
    description:
      'Equipment and facility maintenance management. Schedule preventive maintenance, track work requests, and manage equipment lifecycle.',
    keywords: [
      'maintenance',
      'equipment management',
      'preventive maintenance',
      'facility management',
    ],
    ogType: 'website',
  },
  '/sales': {
    title: 'Sales - OpsUI',
    description:
      'Sales and customer relationship management. Track leads, manage opportunities, create quotes, and monitor sales performance.',
    keywords: ['sales', 'CRM', 'leads', 'opportunities', 'quotes', 'customer management'],
    ogType: 'website',
  },
  '/rma': {
    title: 'Returns Management (RMA) - OpsUI',
    description:
      'Handle product returns and RMA processes efficiently. Track return authorizations, process refunds, and manage reverse logistics.',
    keywords: ['RMA', 'returns', 'reverse logistics', 'refund management'],
    ogType: 'website',
  },
  '/cycle-counting': {
    title: 'Cycle Counting - OpsUI',
    description:
      'Perform accurate inventory cycle counts. Create count schedules, assign counters, and reconcile inventory discrepancies.',
    keywords: ['cycle counting', 'inventory audit', 'stock counting', 'inventory accuracy'],
    ogType: 'website',
  },
  '/quality-control': {
    title: 'Quality Control - OpsUI',
    description:
      'Maintain product quality standards. Perform inspections, manage quality holds, and track quality metrics.',
    keywords: ['quality control', 'inspections', 'quality assurance', 'QA'],
    ogType: 'website',
  },
  '/reports': {
    title: 'Reports & Analytics - OpsUI',
    description:
      'Comprehensive reporting and analytics dashboard. Generate custom reports, analyze trends, and export data for business intelligence.',
    keywords: ['reports', 'analytics', 'business intelligence', 'data export'],
    ogType: 'website',
  },
  '/integrations': {
    title: 'Integrations - OpsUI',
    description:
      'Connect OpsUI with your business systems. Configure e-commerce platforms, shipping carriers, and third-party integrations.',
    keywords: ['integrations', 'API', 'e-commerce', 'shipping carriers', 'connectors'],
    ogType: 'website',
  },
  '/admin': {
    title: 'Admin Settings - OpsUI',
    description:
      'System administration and configuration. Manage users, roles, permissions, and system settings.',
    keywords: ['admin', 'settings', 'user management', 'configuration'],
    noIndex: true, // Don't index admin pages
  },
  '/users': {
    title: 'User Management - OpsUI',
    description:
      'Manage system users and roles. Create user accounts, assign permissions, and track user activity.',
    keywords: ['users', 'roles', 'permissions', 'user management'],
    noIndex: true,
  },
  '/accounting': {
    title: 'Accounting - OpsUI',
    description:
      'Financial management and accounting tools. Manage chart of accounts, journal entries, and financial reporting.',
    keywords: [
      'accounting',
      'finance',
      'chart of accounts',
      'journal entries',
      'financial reports',
    ],
    ogType: 'website',
  },
  '/hr': {
    title: 'HR & Payroll - OpsUI',
    description:
      'Human resources and payroll management. Manage employees, process payroll, and track leave requests.',
    keywords: ['HR', 'payroll', 'employees', 'leave management', 'human resources'],
    ogType: 'website',
  },
  '/exceptions': {
    title: 'Exceptions - OpsUI',
    description:
      'Monitor and resolve operational exceptions. Track errors, investigate issues, and maintain smooth operations.',
    keywords: ['exceptions', 'error tracking', 'issue resolution', 'operations'],
    ogType: 'website',
  },
  '/bin-locations': {
    title: 'Bin Locations - OpsUI',
    description:
      'Manage warehouse bin locations and storage zones. Configure location hierarchy and optimize space utilization.',
    keywords: ['bin locations', 'warehouse zones', 'storage', 'location management'],
    ogType: 'website',
  },
  '/wave-picking': {
    title: 'Wave Picking - OpsUI',
    description:
      'Optimize picking operations with wave management. Create waves, assign pickers, and track wave progress.',
    keywords: ['wave picking', 'batch picking', 'picking optimization', 'warehouse efficiency'],
    ogType: 'website',
  },
  '/zone-picking': {
    title: 'Zone Picking - OpsUI',
    description:
      'Zone-based picking management. Assign pickers to zones, track zone performance, and optimize picker routes.',
    keywords: ['zone picking', 'picker zones', 'warehouse zones', 'picking efficiency'],
    ogType: 'website',
  },
  '/slotting': {
    title: 'Slotting Optimization - OpsUI',
    description:
      'Optimize product placement for efficient picking. Analyze velocity, manage slot assignments, and improve warehouse layout.',
    keywords: ['slotting', 'warehouse optimization', 'product placement', 'velocity analysis'],
    ogType: 'website',
  },
  '/route-optimization': {
    title: 'Route Optimization - OpsUI',
    description:
      'Optimize picker routes for maximum efficiency. Reduce travel time, improve productivity, and streamline operations.',
    keywords: ['route optimization', 'picker routes', 'warehouse efficiency', 'travel time'],
    ogType: 'website',
  },
};

// ============================================================================
// META TAG MANAGEMENT
// ============================================================================

/**
 * Update the page title
 */
export function updateTitle(title: string): void {
  document.title = title;
}

/**
 * Update or create a meta tag
 */
export function updateMetaTag(name: string, content: string, isProperty = false): void {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let meta = document.querySelector(selector) as HTMLMetaElement | null;

  if (meta) {
    meta.content = content;
  } else {
    meta = document.createElement('meta');
    if (isProperty) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    meta.content = content;
    document.head.appendChild(meta);
  }
}

/**
 * Remove a meta tag
 */
export function removeMetaTag(name: string, isProperty = false): void {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  const meta = document.querySelector(selector);
  if (meta) {
    meta.remove();
  }
}

/**
 * Update or create a link tag
 */
export function updateLinkTag(
  rel: string,
  href: string,
  extraAttrs?: Record<string, string>
): void {
  const selector = `link[rel="${rel}"]`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;

  if (link) {
    link.href = href;
  } else {
    link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  }

  if (link && extraAttrs) {
    Object.entries(extraAttrs).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });
  }
}

/**
 * Remove a link tag
 */
export function removeLinkTag(rel: string): void {
  const link = document.querySelector(`link[rel="${rel}"]`);
  if (link) {
    link.remove();
  }
}

// ============================================================================
// SEO CONFIGURATION APPLICATION
// ============================================================================

/**
 * Apply comprehensive SEO configuration to the page
 */
export function applySEOConfig(config: SEOConfig): void {
  const {
    title,
    description,
    keywords = [],
    canonicalUrl,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = 'website',
    twitterCard = 'summary_large_image',
    noIndex = false,
    noFollow = false,
    author,
    publishedTime,
    modifiedTime,
    section,
    tags = [],
  } = config;

  // Update title
  updateTitle(title);

  // Basic meta tags
  updateMetaTag('description', description);
  if (keywords.length > 0) {
    updateMetaTag('keywords', keywords.join(', '));
  }

  // Robots meta tag
  const robotsContent = [noIndex ? 'noindex' : 'index', noFollow ? 'nofollow' : 'follow'].join(
    ', '
  );
  updateMetaTag('robots', robotsContent);

  // Canonical URL
  if (canonicalUrl) {
    updateLinkTag('canonical', canonicalUrl);
  }

  // Open Graph tags
  updateMetaTag('og:title', title, true);
  updateMetaTag('og:description', description, true);
  updateMetaTag('og:type', ogType, true);
  updateMetaTag('og:image', ogImage, true);
  updateMetaTag('og:site_name', 'OpsUI', true);
  if (canonicalUrl) {
    updateMetaTag('og:url', canonicalUrl, true);
  }

  // Article-specific Open Graph tags
  if (ogType === 'article') {
    if (publishedTime) {
      updateMetaTag('article:published_time', publishedTime, true);
    }
    if (modifiedTime) {
      updateMetaTag('article:modified_time', modifiedTime, true);
    }
    if (section) {
      updateMetaTag('article:section', section, true);
    }
    for (const tag of tags) {
      updateMetaTag('article:tag', tag, true);
    }
  }

  // Twitter Card tags
  updateMetaTag('twitter:card', twitterCard);
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', ogImage);

  // Author tag
  if (author) {
    updateMetaTag('author', author);
  }
}

/**
 * Get SEO config for a specific route
 */
export function getSEOConfigForRoute(pathname: string): SEOConfig {
  // Try exact match first
  if (PAGE_SEO_CONFIGS[pathname]) {
    return PAGE_SEO_CONFIGS[pathname];
  }

  // Try matching with trailing slash
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (PAGE_SEO_CONFIGS[normalizedPath]) {
    return PAGE_SEO_CONFIGS[normalizedPath];
  }

  // Try matching without trailing slash
  const pathWithSlash = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (PAGE_SEO_CONFIGS[pathWithSlash]) {
    return PAGE_SEO_CONFIGS[pathWithSlash];
  }

  // Default fallback
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
  };
}

/**
 * Apply SEO for a specific route
 */
export function applySEOForRoute(pathname: string, customConfig?: Partial<SEOConfig>): void {
  const baseConfig = getSEOConfigForRoute(pathname);
  const fullUrl = `${BASE_URL}${pathname}`;

  const config: SEOConfig = {
    ...baseConfig,
    canonicalUrl: fullUrl,
    ...customConfig,
  };

  applySEOConfig(config);
}

// ============================================================================
// STRUCTURED DATA (JSON-LD)
// ============================================================================

/**
 * Add structured data to the page
 */
export function addStructuredData(data: StructuredData | StructuredData[]): void {
  const dataArray = Array.isArray(data) ? data : [data];

  for (const [index, item] of dataArray.entries()) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `structured-data-${index}`;
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  }
}

/**
 * Remove structured data from the page
 */
export function removeStructuredData(): void {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    script.remove();
  }
}

/**
 * Generate WebApplication structured data
 */
export function generateWebApplicationSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'OpsUI',
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
    author: {
      '@type': 'Organization',
      name: 'OpsUI',
      url: BASE_URL,
    },
  };
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OpsUI',
    url: BASE_URL,
    logo: `${BASE_URL}/OP_logo.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English'],
    },
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate SoftwareApplication structured data
 */
export function generateSoftwareApplicationSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'OpsUI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize default SEO for the application
 */
export function initializeSEO(): void {
  // Add default structured data
  addStructuredData([generateWebApplicationSchema(), generateOrganizationSchema()]);
}

/**
 * Cleanup SEO tags (useful for SPA navigation)
 */
export function cleanupSEO(): void {
  // Remove dynamic meta tags
  removeMetaTag('description');
  removeMetaTag('keywords');
  removeMetaTag('robots');
  removeMetaTag('author');

  // Remove Open Graph tags
  removeMetaTag('og:title', true);
  removeMetaTag('og:description', true);
  removeMetaTag('og:type', true);
  removeMetaTag('og:image', true);
  removeMetaTag('og:url', true);
  removeMetaTag('og:site_name', true);
  removeMetaTag('article:published_time', true);
  removeMetaTag('article:modified_time', true);
  removeMetaTag('article:section', true);
  removeMetaTag('article:tag', true);

  // Remove Twitter tags
  removeMetaTag('twitter:card');
  removeMetaTag('twitter:title');
  removeMetaTag('twitter:description');
  removeMetaTag('twitter:image');

  // Remove canonical link
  removeLinkTag('canonical');

  // Remove structured data
  removeStructuredData();
}
