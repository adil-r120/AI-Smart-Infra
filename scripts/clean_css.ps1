$file = 'c:\Users\mdadi\OneDrive\Desktop\Smart-Infra\frontend\src\App.css'
$lines = Get-Content $file -Encoding UTF8

$result = [System.Collections.Generic.List[string]]::new()
$prevBlank = $false

foreach ($line in $lines) {
    $trimmed = $line.Trim()

    # Skip full-line section separator comments that are mostly non-CSS characters
    # These look like: /* ====== TITLE ====== */ or /* -- Header -- */
    if ($trimmed -match '^\s*/\*\s*[-=*]{4,}' -and $trimmed -match '[-=*]{4,}\s*\*/$') { continue }

    # Skip lines that are comment-only with a label like /* -- Header ------------- */
    if ($trimmed -match '^\s*/\*\s*[^\*]{1,50}\s*\*/$' -and $trimmed.Length -lt 70) {
        # Only skip if it looks like a pure section divider comment (has dashes or equals)
        if ($trimmed -match '[=\-]{3,}') { continue }
    }

    # Collapse multiple blank lines into one
    $isBlank = ($trimmed -eq '')
    if ($isBlank -and $prevBlank) { continue }
    $prevBlank = $isBlank

    $result.Add($line)
}

# Remove trailing blank lines
while ($result.Count -gt 0 -and $result[$result.Count - 1].Trim() -eq '') {
    $result.RemoveAt($result.Count - 1)
}

[System.IO.File]::WriteAllLines($file, $result, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Lines reduced to: $($result.Count)"
