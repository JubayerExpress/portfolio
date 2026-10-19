/* Tiny, safe Markdown renderer shared by the site and the admin preview.
   Supports: # headings, **bold**, *italic*, `code`, ``` code blocks, > quotes,
   - lists, 1. lists, links, ![images](url), --- rules. HTML is always escaped. */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Allow http(s), mailto and relative URLs only (blocks javascript:, data:, etc.)
  function safe(u) {
    u = String(u || "").trim();
    if (/^(https?:|mailto:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return "#";
    return u;
  }

  function inline(text) {
    var codes = [];
    text = text.replace(/`([^`]+)`/g, function (m, c) {
      codes.push("<code>" + esc(c) + "</code>");
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    text = esc(text);
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
      return '<img src="' + esc(safe(url.replace(/&amp;/g, "&"))) + '" alt="' + alt + '" loading="lazy">';
    });
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, url) {
      return '<a href="' + esc(safe(url.replace(/&amp;/g, "&"))) + '" target="_blank" rel="noopener noreferrer">' + t + "</a>";
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    return text.replace(/\u0000(\d+)\u0000/g, function (m, i) { return codes[+i]; });
  }

  function render(src) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    var out = [], i = 0, para = [];

    function flush() {
      if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; }
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^```/.test(line)) {
        flush();
        var lang = line.replace(/^```/, "").trim(), buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><code' + (lang ? ' class="lang-' + esc(lang) + '"' : "") + ">" + esc(buf.join("\n")) + "</code></pre>");
        continue;
      }
      if (/^\s*$/.test(line)) { flush(); i++; continue; }

      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flush(); var n = Math.min(h[1].length + 1, 5); out.push("<h" + n + ">" + inline(h[2]) + "</h" + n + ">"); i++; continue; }

      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { flush(); out.push("<hr>"); i++; continue; }

      if (/^>\s?/.test(line)) {
        flush();
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>");
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        flush();
        var ul = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>"); i++; }
        out.push("<ul>" + ul.join("") + "</ul>");
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        flush();
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { ol.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>"); i++; }
        out.push("<ol>" + ol.join("") + "</ol>");
        continue;
      }

      var img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
      if (img) {
        flush();
        out.push('<figure><img src="' + esc(safe(img[2])) + '" alt="' + esc(img[1]) + '" loading="lazy">' + (img[1] ? "<figcaption>" + esc(img[1]) + "</figcaption>" : "") + "</figure>");
        i++;
        continue;
      }

      para.push(line.trim());
      i++;
    }
    flush();
    return out.join("\n");
  }

  window.MD = { render: render, esc: esc, safe: safe };
})();
