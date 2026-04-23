# build.ps1
# Script portable para generar la documentación con diagramas PlantUML.
# Busca el JAR de PlantUML en varias ubicaciones posibles automáticamente.

$possibleJars = @(
    "C:\ProgramData\chocolatey\lib\plantuml\tools\plantuml.jar",  # Chocolatey (Windows)
    "/usr/share/plantuml/plantuml.jar",                            # Linux apt
    "/usr/local/lib/plantuml.jar",                                 # Linux manual
    "/opt/homebrew/opt/plantuml/libexec/plantuml.jar",             # macOS Homebrew
    "$PSScriptRoot\plantuml.jar"                                   # JAR local junto al script
)

$jarPath = $null

# 1. Buscar JAR en las rutas conocidas
foreach ($path in $possibleJars) {
    if (Test-Path $path) {
        $jarPath = $path
        Write-Host "PlantUML JAR encontrado en: $jarPath"
        break
    }
}

# 2. Si no hay JAR, intentar con el binario plantuml-native en el PATH
if (-not $jarPath) {
    $binary = Get-Command "plantuml-native" -ErrorAction SilentlyContinue
    if ($binary) {
        Write-Host "Usando binario plantuml-native: $($binary.Source)"
        # asciidoctor-diagram lo detecta automáticamente, no hace falta variable
    } else {
        Write-Error "No se encontró PlantUML. Instálalo con: choco install plantuml"
        exit 1
    }
}

# 3. Ejecutar el build
if ($jarPath) {
    $env:DIAGRAM_PLANTUML_CLASSPATH = $jarPath
}

npm run build