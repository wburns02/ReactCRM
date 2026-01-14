/**
 * Embeddable Widgets Module
 * White-label ready widgets for external website embedding
 *
 * Usage:
 * - BookingWidget: Embed on company websites for service scheduling
 * - PaymentWidget: Secure payment form for invoice payment
 * - StatusWidget: Real-time work order tracking
 *
 * All widgets support:
 * - Custom branding (colors, logos)
 * - Responsive design
 * - Accessibility (WCAG 2.1 AA)
 * - i18n-ready
 */

export { BookingWidget, type BookingWidgetConfig } from "./BookingWidget";
export { PaymentWidget, type PaymentWidgetConfig } from "./PaymentWidget";
export { StatusWidget, type StatusWidgetConfig } from "./StatusWidget";

/**
 * Widget embed script generator
 * Use this to generate embed codes for customers
 */
export function generateEmbedCode(
  widgetType: "booking" | "payment" | "status",
  config: Record<string, string | number | boolean>,
): string {
  const baseUrl = window.location.origin;
  const configStr = encodeURIComponent(JSON.stringify(config));

  return `<!-- ${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)} Widget -->
<div id="crm-${widgetType}-widget"></div>
<script src="${baseUrl}/widgets/${widgetType}.js" data-config="${configStr}"></script>`;
}

/**
 * Widget iframe embed code generator
 * Alternative to script embed for better isolation
 */
export function generateIframeCode(
  widgetType: "booking" | "payment" | "status",
  config: Record<string, string | number | boolean>,
): string {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams();

  Object.entries(config).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  const heights = {
    booking: 800,
    payment: 600,
    status: 500,
  };

  return `<iframe
  src="${baseUrl}/embed/${widgetType}?${params.toString()}"
  width="100%"
  height="${heights[widgetType]}"
  frameborder="0"
  style="max-width: 500px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
></iframe>`;
}
