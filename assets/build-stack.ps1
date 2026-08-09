# =====================================================================
# Monta assets/stack.svg com os logos OFICIAIS de cada ferramenta.
# ---------------------------------------------------------------------
# Os caminhos vetoriais vem do Simple Icons (CC0), baixados uma vez e
# embutidos no arquivo final - o perfil nao depende de CDN para renderizar.
#
# Power BI e Excel sao desenhados aqui: a Microsoft pediu a remocao das
# marcas de produto do Simple Icons e do Devicon, entao nao existe fonte
# aberta. Os dois seguem a forma e a cor oficiais.
# =====================================================================

$ErrorActionPreference = 'Stop'
$out = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'stack.svg'

# slug do Simple Icons + cor oficial da marca + rotulo
$icons = @(
  @{ slug='powerbi';     color='#F2C811'; label='Power BI'     },
  @{ slug='excel';       color='#217346'; label='Excel'        },
  @{ slug='postgresql';  color='#4169E1'; label='PostgreSQL'   },
  @{ slug='sqlite';      color='#4FC3F7'; label='SQLite'       },
  @{ slug='python';      color='#3776AB'; label='Python'       },
  @{ slug='pandas';      color='#E4E7EC'; label='pandas'       },
  @{ slug='scikitlearn'; color='#F7931E'; label='scikit-learn' },
  @{ slug='git';         color='#F05032'; label='Git'          },
  @{ slug='jira';        color='#2684FF'; label='Jira'         }
)

# Desenhados a mao, seguindo a marca oficial (viewBox 0 0 24 24)
$custom = @{
  'powerbi' = '<rect x="2.6" y="13.4" width="5.2" height="8.4" rx="1.3"/>' +
              '<rect x="9.4" y="8.2"  width="5.2" height="13.6" rx="1.3"/>' +
              '<rect x="16.2" y="2.4" width="5.2" height="19.4" rx="1.3"/>'
  'excel'   = '<path d="M4.6 2.8h14.8a1.8 1.8 0 0 1 1.8 1.8v14.8a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8z"/>' +
              '<path d="M8.3 7.6l3.7 4.4 3.7-4.4h2.6l-5 6 5 6h-2.6L12 15.2l-3.7 4.4H5.7l5-6-5-6z" fill="#ffffff"/>'
}

function Get-IconPath ($slug) {
  if ($custom.ContainsKey($slug)) { return $custom[$slug] }
  $svg = (Invoke-WebRequest -Uri "https://cdn.simpleicons.org/$slug" -UseBasicParsing -TimeoutSec 20).Content
  $m = [regex]::Match("$svg", '<path[^>]*\sd="([^"]+)"')
  if (-not $m.Success) { throw "sem <path d> em $slug" }
  return ('<path d="' + $m.Groups[1].Value + '"/>')
}

$W = 1200; $H = 148
$n = $icons.Count
$cell = $W / $n
$iconSize = 34.0
$scale = $iconSize / 24.0

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + $W + ' ' + $H + '" width="' + $W + '" height="' + $H + '" role="img" aria-label="Stack: ' + (($icons | ForEach-Object { $_.label }) -join ', ') + '">')
[void]$sb.AppendLine('  <title>Stack</title>')
[void]$sb.AppendLine('  <defs><clipPath id="c"><rect width="' + $W + '" height="' + $H + '" rx="14"/></clipPath></defs>')
[void]$sb.AppendLine('  <g clip-path="url(#c)"><rect width="' + $W + '" height="' + $H + '" fill="#070C17"/>')

for ($i = 0; $i -lt $n; $i++) {
  $ic = $icons[$i]
  $cx = ($i * $cell) + ($cell / 2)
  $tx = [Math]::Round($cx - ($iconSize / 2), 2)
  $inner = Get-IconPath $ic.slug
  Write-Output ("  {0,-14} ok" -f $ic.slug)
  [void]$sb.AppendLine('    <g transform="translate(' + $tx + ',44) scale(' + [Math]::Round($scale,4) + ')" fill="' + $ic.color + '">' + $inner + '</g>')
  [void]$sb.AppendLine('    <text x="' + [Math]::Round($cx,2) + '" y="112" text-anchor="middle" font-family="' + "'IBM Plex Mono','Cascadia Mono',Consolas,monospace" + '" font-size="12.5" fill="#8A97AD">' + $ic.label + '</text>')
}

[void]$sb.AppendLine('  </g>')
[void]$sb.AppendLine('  <rect x=".5" y=".5" width="' + ($W-1) + '" height="' + ($H-1) + '" rx="14" fill="none" stroke="#8CACF0" stroke-opacity=".14"/>')
[void]$sb.AppendLine('</svg>')

[System.IO.File]::WriteAllText($out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Output ''
Write-Output ("gerado: " + $out)
