# =====================================================================
# Gera hero.svg e skills.svg do perfil.
# ---------------------------------------------------------------------
#  - A Space Grotesk vai EMBUTIDA em base64 dentro do hero. SVG servido
#    pelo GitHub nao carrega fonte externa, mas @font-face com data: URI
#    funciona, porque nao e requisicao externa. Testado: o texto mede
#    280px com a fonte contra 300.73px sem ela.
#  - Os logos das ferramentas sao os caminhos OFICIAIS do Simple Icons
#    (CC0), embutidos. Power BI e Excel sao desenhados aqui: a Microsoft
#    pediu a remocao das marcas de produto do Simple Icons e do Devicon.
# =====================================================================

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ua  = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

function Get-FontB64 ($family, $weight) {
  $css = (Invoke-WebRequest -Uri "https://fonts.googleapis.com/css2?family=$family`:wght@$weight" `
            -Headers @{ 'User-Agent' = $ua } -UseBasicParsing -TimeoutSec 30).Content
  $url = ([regex]::Matches("$css", 'url\((https://[^)]+\.woff2)\)') |
          ForEach-Object { $_.Groups[1].Value } | Select-Object -Last 1)
  $wc = New-Object System.Net.WebClient; $wc.Headers.Add('User-Agent', $ua)
  [Convert]::ToBase64String($wc.DownloadData($url))
}

Write-Output 'baixando fontes...'
$sg700 = Get-FontB64 'Space+Grotesk' 700
$sg500 = Get-FontB64 'Space+Grotesk' 500
$mono  = Get-FontB64 'IBM+Plex+Mono' 400
Write-Output ("  Space Grotesk 700  {0,7:N0} chars" -f $sg700.Length)
Write-Output ("  Space Grotesk 500  {0,7:N0} chars" -f $sg500.Length)
Write-Output ("  IBM Plex Mono 400  {0,7:N0} chars" -f $mono.Length)

# ----------------------------------------------------------------- hero
$heroTpl = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360" width="1200" height="360" role="img" aria-label="Maria Domeni, Data Analyst. Turning data into strategic decisions. Sao Paulo, Brazil, open to Data Analyst roles.">
  <title>Maria Domeni — Data Analyst</title>
  <style>
    @font-face{font-family:'Space Grotesk';font-weight:700;font-style:normal;src:url(data:font/woff2;base64,{{SG700}}) format('woff2')}
    @font-face{font-family:'Space Grotesk';font-weight:500;font-style:normal;src:url(data:font/woff2;base64,{{SG500}}) format('woff2')}
    @font-face{font-family:'IBM Plex Mono';font-weight:400;font-style:normal;src:url(data:font/woff2;base64,{{MONO}}) format('woff2')}
    .d{font-family:'Space Grotesk','Segoe UI',system-ui,sans-serif}
    .m{font-family:'IBM Plex Mono','Cascadia Mono',Consolas,monospace}
  </style>
  <defs>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2F6BFF"/><stop offset="1" stop-color="#35D6E7"/>
    </linearGradient>
    <radialGradient id="glow" cx="76%" cy="4%" r="72%">
      <stop offset="0" stop-color="#2F6BFF" stop-opacity=".18"/><stop offset="1" stop-color="#2F6BFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fade" cx="40%" cy="34%" r="74%">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset=".62" stop-color="#fff" stop-opacity=".3"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="gm"><rect width="1200" height="360" fill="url(#fade)"/></mask>
    <clipPath id="cp"><rect width="1200" height="360" rx="16"/></clipPath>
  </defs>

  <g clip-path="url(#cp)">
    <rect width="1200" height="360" fill="#05080F"/>
    <rect width="1200" height="360" fill="url(#glow)"/>

    <g mask="url(#gm)" stroke="#8CACF0" stroke-opacity=".08" stroke-width="1">
      <path d="M60 0V360M120 0V360M180 0V360M240 0V360M300 0V360M360 0V360M420 0V360M480 0V360M540 0V360M600 0V360M660 0V360M720 0V360M780 0V360M840 0V360M900 0V360M960 0V360M1020 0V360M1080 0V360M1140 0V360"/>
      <path d="M0 60H1200M0 120H1200M0 180H1200M0 240H1200M0 300H1200"/>
    </g>

    <g stroke="#5D8CFF" stroke-opacity=".18" stroke-width=".9">
      <path d="M812 66 L906 128 M906 128 L1042 96 M906 128 L968 232 M1042 96 L1128 176 M968 232 L1086 268 M760 214 L868 286"/>
    </g>
    <g fill="#35D6E7">
      <circle cx="812"  cy="66"  r="2.4"><animate attributeName="opacity" values=".3;.85;.3" dur="7s"   repeatCount="indefinite"/></circle>
      <circle cx="906"  cy="128" r="3.2"><animate attributeName="opacity" values=".8;.28;.8" dur="9s"   repeatCount="indefinite"/></circle>
      <circle cx="1042" cy="96"  r="2.2"><animate attributeName="opacity" values=".35;.8;.35" dur="8s"  repeatCount="indefinite"/></circle>
      <circle cx="968"  cy="232" r="2.6"><animate attributeName="opacity" values=".7;.25;.7" dur="10s"  repeatCount="indefinite"/></circle>
      <circle cx="1128" cy="176" r="2"  ><animate attributeName="opacity" values=".3;.75;.3" dur="7.6s" repeatCount="indefinite"/></circle>
      <circle cx="1086" cy="268" r="2.4"><animate attributeName="opacity" values=".65;.2;.65" dur="8.8s" repeatCount="indefinite"/></circle>
      <circle cx="760"  cy="214" r="1.9"><animate attributeName="opacity" values=".25;.7;.25" dur="9.6s" repeatCount="indefinite"/></circle>
      <circle cx="868"  cy="286" r="2.1"><animate attributeName="opacity" values=".6;.2;.6"  dur="8.2s" repeatCount="indefinite"/></circle>
    </g>

    <text class="m" x="64" y="88" font-size="13" letter-spacing="5.5" fill="#35D6E7">DATA ANALYST</text>

    <text class="d" x="64" y="184" font-size="76" font-weight="700" letter-spacing="-2.6" fill="#E7ECF6">Maria Domeni</text>

    <rect x="64" y="212" width="196" height="3" rx="1.5" fill="url(#rule)">
      <animate attributeName="width" from="0" to="196" dur="1.4s" begin=".4s" fill="freeze"
               calcMode="spline" keySplines=".16 1 .3 1" keyTimes="0;1"/>
    </rect>

    <text class="d" x="64" y="266" font-size="27" font-weight="500" letter-spacing="-.5" fill="#A6B3CB">Turning data into <tspan fill="#35D6E7">strategic decisions</tspan>.</text>

    <text class="m" x="64" y="312" font-size="13.5" letter-spacing=".3" fill="#5A6880">São Paulo, BR   ·   open to Data Analyst roles</text>
  </g>
  <rect x=".5" y=".5" width="1199" height="359" rx="16" fill="none" stroke="#8CACF0" stroke-opacity=".16"/>
</svg>
'@

$hero = $heroTpl.Replace('{{SG700}}', $sg700).Replace('{{SG500}}', $sg500).Replace('{{MONO}}', $mono)
[System.IO.File]::WriteAllText("$dir\hero.svg", $hero, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("hero.svg   {0:N0} bytes" -f (Get-Item "$dir\hero.svg").Length)

# --------------------------------------------------------------- skills
$tools = @(
  @{ slug='powerbi';     color='#F2C811'; name='Power BI';     note='dashboards, DAX, filter context' },
  @{ slug='excel';       color='#217346'; name='Excel';        note='COUNTIFS, Power Query, validation' },
  @{ slug='postgresql';  color='#4169E1'; name='PostgreSQL';   note='CTEs, window functions, modeling' },
  @{ slug='sqlite';      color='#4FC3F7'; name='SQLite';       note='embedded warehouses' },
  @{ slug='python';      color='#3776AB'; name='Python';       note='cleaning, joins, automation' },
  @{ slug='pandas';      color='#E4E7EC'; name='pandas';       note='reshaping, cohort tables' },
  @{ slug='scikitlearn'; color='#F7931E'; name='scikit-learn'; note='logistic regression, scoring' },
  @{ slug='git';         color='#F05032'; name='Git';          note='reproducible analysis' },
  @{ slug='jira';        color='#2684FF'; name='Jira';         note='agile delivery' }
)
$custom = @{
  'powerbi' = '<rect x="2.6" y="13.4" width="5.2" height="8.4" rx="1.3"/><rect x="9.4" y="8.2" width="5.2" height="13.6" rx="1.3"/><rect x="16.2" y="2.4" width="5.2" height="19.4" rx="1.3"/>'
  'excel'   = '<path d="M4.6 2.8h14.8a1.8 1.8 0 0 1 1.8 1.8v14.8a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8z"/><path d="M8.3 7.6l3.7 4.4 3.7-4.4h2.6l-5 6 5 6h-2.6L12 15.2l-3.7 4.4H5.7l5-6-5-6z" fill="#ffffff"/>'
}
function Get-IconInner ($slug) {
  if ($custom.ContainsKey($slug)) { return $custom[$slug] }
  $svg = (Invoke-WebRequest -Uri "https://cdn.simpleicons.org/$slug" -UseBasicParsing -TimeoutSec 25).Content
  $m = [regex]::Match("$svg", '<path[^>]*\sd="([^"]+)"')
  if (-not $m.Success) { throw "sem path em $slug" }
  '<path d="' + $m.Groups[1].Value + '"/>'
}

$W = 1200; $cols = 3; $rows = 3
$padX = 40; $gap = 14
$cw = [Math]::Floor(($W - ($padX * 2) - ($gap * ($cols - 1))) / $cols)
$ch = 96
$top = 76
$H = $top + ($rows * $ch) + (($rows - 1) * $gap) + 34

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + $W + ' ' + $H + '" width="' + $W + '" height="' + $H + '" role="img" aria-label="Technical skills: ' + (($tools | ForEach-Object { $_.name + ' - ' + $_.note }) -join '; ') + '">')
[void]$sb.AppendLine('  <title>Technical skills</title>')
[void]$sb.AppendLine('  <defs><clipPath id="cp"><rect width="' + $W + '" height="' + $H + '" rx="16"/></clipPath></defs>')
[void]$sb.AppendLine('  <g clip-path="url(#cp)"><rect width="' + $W + '" height="' + $H + '" fill="#070C17"/>')
[void]$sb.AppendLine('    <text x="' + $padX + '" y="48" font-family="' + "'IBM Plex Mono','Cascadia Mono',Consolas,monospace" + '" font-size="13" letter-spacing="4.5" fill="#35D6E7">TECHNICAL SKILLS</text>')

for ($i = 0; $i -lt $tools.Count; $i++) {
  $t = $tools[$i]
  $c = $i % $cols; $r = [Math]::Floor($i / $cols)
  $x = $padX + ($c * ($cw + $gap))
  $y = $top + ($r * ($ch + $gap))
  $inner = Get-IconInner $t.slug
  Write-Output ("  {0,-13} ok" -f $t.name)
  [void]$sb.AppendLine('    <rect x="' + $x + '" y="' + $y + '" width="' + $cw + '" height="' + $ch + '" rx="12" fill="#0A1122" stroke="#8CACF0" stroke-opacity=".12"/>')
  [void]$sb.AppendLine('    <g transform="translate(' + ($x + 22) + ',' + ($y + 24) + ') scale(1.5)" fill="' + $t.color + '">' + $inner + '</g>')
  [void]$sb.AppendLine('    <text x="' + ($x + 74) + '" y="' + ($y + 42) + '" font-family="' + "'Segoe UI',system-ui,-apple-system,Helvetica,Arial,sans-serif" + '" font-size="17" font-weight="600" fill="#E7ECF6">' + $t.name + '</text>')
  [void]$sb.AppendLine('    <text x="' + ($x + 74) + '" y="' + ($y + 65) + '" font-family="' + "'IBM Plex Mono','Cascadia Mono',Consolas,monospace" + '" font-size="11.5" fill="#7C8AA3">' + $t.note + '</text>')
}
[void]$sb.AppendLine('  </g>')
[void]$sb.AppendLine('  <rect x=".5" y=".5" width="' + ($W - 1) + '" height="' + ($H - 1) + '" rx="16" fill="none" stroke="#8CACF0" stroke-opacity=".14"/>')
[void]$sb.AppendLine('</svg>')
[System.IO.File]::WriteAllText("$dir\skills.svg", $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("skills.svg {0:N0} bytes" -f (Get-Item "$dir\skills.svg").Length)
