$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$quizStatus = 'C:\Users\jongp\Documents\Codex\2026-06-05\files-mentioned-by-the-user-oracle\outputs\external_access.txt'
$gameStatus = 'C:\Users\jongp\Documents\Codex\2026-06-06\nice-gui-1-1-7\outputs\game_external_access.txt'

$titleLinks = '&#51004;&#46272;&#45768; &#47553;&#53356;'
$intro = '&#50500;&#47000; &#48260;&#53948;&#51004;&#47196; &#49884;&#54744;&#44284; &#44172;&#51076;&#50640; &#51217;&#49549;&#54616;&#49464;&#50836;.'
$dbLabel = 'DB &#49884;&#54744;'
$hanjaLabel = '&#54620;&#51088; &#49884;&#54744;'
$tetrisLabel = '&#51004;&#46272;&#45768; &#53580;&#53944;&#47532;&#49828;'
$bubbleLabel = '&#51004;&#46272;&#45768; &#48260;&#48660;&#54045;'
$startLabel = '&#49884;&#51089;'
$notePrefix = '&#51217;&#49549; &#53076;&#46300;&#45716; &#44032;&#51313;&#45180;&#47532; &#46384;&#47196; &#50508;&#44256; &#51080;&#45716; &#44050;&#51012; &#49324;&#50857;&#54633;&#45768;&#45796;. &#47560;&#51648;&#47561; &#44081;&#49888;:'
$dbMove = 'DB &#49884;&#54744;&#51004;&#47196; &#51060;&#46041;'
$hanjaMove = '&#54620;&#51088; &#49884;&#54744;&#51004;&#47196; &#51060;&#46041;'
$tetrisMove = '&#51004;&#46272;&#45768; &#53580;&#53944;&#47532;&#49828;&#47196; &#51060;&#46041;'
$bubbleMove = '&#51004;&#46272;&#45768; &#48260;&#48660;&#54045;&#51004;&#47196; &#51060;&#46041;'

function Read-Url($path, $label) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing status file: $path"
    }
    $content = Get-Content -LiteralPath $path -Raw
    $match = [regex]::Match($content, 'https://[a-z0-9-]+\.trycloudflare\.com')
    if (-not $match.Success) {
        throw "No external URL found for $label in $path"
    }
    return $match.Value
}

function Write-RedirectPage($dir, $title, $url) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $html = @"
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=$url">
  <title>$title</title>
  <script>location.replace('$url');</script>
</head>
<body>
  <p><a href="$url">$title</a></p>
</body>
</html>
"@
    Set-Content -LiteralPath (Join-Path $dir 'index.html') -Value $html -Encoding UTF8
}

$quizUrl = Read-Url $quizStatus 'quiz'
$gameUrl = Read-Url $gameStatus 'game'
$updatedAt = Get-Date -Format 'yyyy-MM-dd HH:mm'

$index = @"
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>$titleLinks</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f4f7fb;
      color: #172033;
      font-family: "Segoe UI", "Malgun Gothic", sans-serif;
    }
    main {
      width: min(520px, calc(100% - 32px));
      display: grid;
      gap: 16px;
    }
    h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
    p { margin: 0; color: #64748b; font-weight: 700; }
    .links { display: grid; gap: 10px; }
    a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 58px;
      padding: 0 18px;
      border: 2px solid #d6dee9;
      border-radius: 8px;
      background: #ffffff;
      color: #172033;
      text-decoration: none;
      font-size: 19px;
      font-weight: 900;
    }
    a span { color: #2563eb; font-size: 18px; }
    .note { font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <div>
      <h1>$titleLinks</h1>
      <p>$intro</p>
    </div>
    <section class="links" aria-label="links">
      <a href="./db/">$dbLabel <span>$startLabel</span></a>
      <a href="./hanja/">$hanjaLabel <span>$startLabel</span></a>
      <a href="./tetris/">$tetrisLabel <span>$startLabel</span></a>
      <a href="./bubble/">$bubbleLabel <span>$startLabel</span></a>
    </section>
    <p class="note">$notePrefix $updatedAt</p>
  </main>
</body>
</html>
"@

Set-Content -LiteralPath (Join-Path $root 'index.html') -Value $index -Encoding UTF8
Write-RedirectPage (Join-Path $root 'db') $dbMove $quizUrl
Write-RedirectPage (Join-Path $root 'hanja') $hanjaMove "$quizUrl/hanja"
Write-RedirectPage (Join-Path $root 'tetris') $tetrisMove $gameUrl
Write-RedirectPage (Join-Path $root 'bubble') $bubbleMove "$gameUrl/bubble"

Write-Output "Updated pages:"
Write-Output "DB: $quizUrl"
Write-Output "Hanja: $quizUrl/hanja"
Write-Output "Tetris: $gameUrl"
Write-Output "Bubble: $gameUrl/bubble"

if (Test-Path -LiteralPath (Join-Path $root '.git')) {
    Push-Location $root
    try {
        $safeRoot = $root -replace '\\', '/'
        git -c "safe.directory=$safeRoot" -c core.autocrlf=false add index.html db/index.html hanja/index.html tetris/index.html bubble/index.html update_links.ps1
        $status = git -c "safe.directory=$safeRoot" -c core.autocrlf=false status --porcelain
        if ($status) {
            git -c "safe.directory=$safeRoot" -c core.autocrlf=false commit -m "Update public links"
            git -c "safe.directory=$safeRoot" -c core.autocrlf=false push
            Write-Output "Pushed updated pages to GitHub."
        }
        else {
            Write-Output "No Git changes to push."
        }
    }
    finally {
        Pop-Location
    }
}
