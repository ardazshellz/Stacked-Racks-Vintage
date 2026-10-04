function escapeHtml(value: unknown) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function campaignHtml(body: string, previewText: string, unsubscribeUrl: string) {
  const productUrls: string[] = [];
  const content = escapeHtml(body)
    .replace(/https:\/\/stackedracksvintage\.co\.uk\/products\/[A-Za-z0-9/_-]+/g, (url) => {
      const index = productUrls.push(url) - 1;
      return `<sr-product-${index}>`;
    })
    .replaceAll("https://stackedracksvintage.co.uk/shop", "<sr-shop-link>")
    .replaceAll("https://www.vinted.co.uk/member/59714764-stackedracks", "<sr-vinted-link>")
    .replaceAll("https://stackedracksvintage.co.uk", '<a href="https://stackedracksvintage.co.uk" style="color:#F5C300">stackedracksvintage.co.uk</a>')
    .replaceAll("<sr-shop-link>", '<a href="https://stackedracksvintage.co.uk/shop" style="color:#F5C300">Shop the latest drop →</a>')
    .replaceAll("<sr-vinted-link>", '<a href="https://www.vinted.co.uk/member/59714764-stackedracks" style="color:#F5C300">Stacked Racks on Vinted</a>')
    .replace(/<sr-product-(\d+)>/g, (_, index: string) => `<a href="${productUrls[Number(index)]}" style="color:#F5C300">View item →</a>`)
    .replaceAll("\n", "<br>");
  return `<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(previewText)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0a" style="width:100%;background-color:#0a0a0a"><tr><td bgcolor="#0a0a0a" style="background-color:#0a0a0a"><div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#0a0a0a;color:#fff;padding:32px"><p style="color:#E8500A;font-size:12px;letter-spacing:2px;text-transform:uppercase">Stacked Racks Vintage</p><div style="font-size:16px;line-height:1.7;color:#ddd">${content}</div><p style="margin-top:32px;color:#666;font-size:12px">You are receiving this because you joined the Stacked Racks email list. <a href="${unsubscribeUrl}" style="color:#aaa">Unsubscribe</a>.</p></div></td></tr></table>`;
}
