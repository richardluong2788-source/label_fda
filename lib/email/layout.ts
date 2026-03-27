import { APP_URL } from './client'

export function emailLayout({
  title,
  previewText,
  body,
  lang = 'en',
}: {
  title: string
  previewText: string
  body: string
  lang?: 'vi' | 'en'
}) {
  return /* html */ `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f4f5;">${previewText}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <a href="${APP_URL}" style="text-decoration:none;">
                      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">FDA Label Checker</span>
                    </a>
                  </td>
                  <td align="right">
                    <span style="color:#94a3b8;font-size:12px;">AI-Powered FDA Compliance</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;">
                FDA Label Checker &mdash; AI-Powered Compliance Analysis<br/>
                <a href="${APP_URL}" style="color:#94a3b8;text-decoration:underline;">${APP_URL}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

// Reusable HTML building blocks
export function button(text: string, url: string, variant: 'primary' | 'secondary' = 'primary') {
  const styles = variant === 'primary' 
    ? 'background-color:#0f172a;color:#ffffff;'
    : 'background-color:#f1f5f9;color:#0f172a;border:1px solid #e2e8f0;'
  
  return /* html */ `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;display:inline-block;">
  <tr>
    <td style="${styles}border-radius:8px;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;color:${variant === 'primary' ? '#ffffff' : '#0f172a'};font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">${text}</a>
    </td>
  </tr>
</table>`
}

export function badge(text: string, color: 'blue' | 'green' | 'orange' | 'red' | 'yellow' = 'blue') {
  const colors = {
    blue:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    green:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    orange: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    red:    { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    yellow: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  }
  const c = colors[color]
  return `<span style="display:inline-block;padding:4px 12px;background-color:${c.bg};color:${c.text};border:1px solid ${c.border};border-radius:100px;font-size:12px;font-weight:600;">${text}</span>`
}

export function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`
}

export function infoRow(label: string, value: string) {
  return /* html */ `
<tr>
  <td style="padding:8px 0;color:#64748b;font-size:13px;width:40%;vertical-align:top;">${label}</td>
  <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:500;vertical-align:top;">${value}</td>
</tr>`
}
