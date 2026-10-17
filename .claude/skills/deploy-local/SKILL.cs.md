# Lokální nasazení

Sestaví to, co je v pracovním stromu, a nainstaluje to na tento počítač, takže další
spuštěný OpenCAD je přesně ten kód, na který se uživatel dívá.

> Tento soubor je pouze český překlad pro lidské čtenáře. Zdrojem pravdy je `SKILL.md`.

## Kontext

- S uživatelem komunikuj česky; vše, co se zapisuje do souborů, je **anglicky**
- Neexistuje žádný server. „Lokální nasazení“ znamená jednu instalaci do profilu
  uživatele: AppImage, ikonu a položku spouštěče, nic jiného
- Neinstaluj `.deb` z `release/` - vyžaduje root a instaluje se pro celý systém
- Nikdy neměň `submodule/opencad`; sestavení použije commit, který je právě checkoutnutý

| Artefakt | Instaluje se do |
| -------- | --------------- |
| `release/OpenCAD-<version>*.AppImage` | `~/Applications/OpenCAD.AppImage`, s položkou spouštěče |

## KROK 1: Podívej se, co se nasazuje

```bash
git status --short
git log --oneline -1
git submodule status
node -p "require('./package.json').version"
```

Řekni uživateli větev, poslední commit, commit submodulu OpenCAD, verzi a zda je pracovní
strom špinavý. Špinavý strom je povolený - zkoušení necommitnuté práce je smyslem - ale
řekni to, protože číslo nainstalované verze pak neidentifikuje, co bylo nainstalováno.
`+` před commitem submodulu znamená, že se liší od commitu zaznamenaného v tomto
repozitáři; řekni i to.

Pokud `~/Applications/OpenCAD.AppImage` už existuje, řekni, že ji instalace nahradí.

## KROK 2: Kontroly - zastav se při prvním selhání

```bash
make typecheck
make test
```

To je `make check`. Spouštěj je jednu po druhé, aby bylo jasné, která selhala. Pokud
některá selže, **zastav se**: ukaž výstup, nic neinstaluj a nenabízej přeskočení kontrol,
pokud o to uživatel sám nepožádá.

## KROK 3: Sestavení

Pouze Linux. Na Windows nebo macOS se zastav a odkaž uživatele na instalátor, který
`make dist` vytvoří v `release/`.

```bash
make dist
ls release/OpenCAD-*.AppImage
```

`make dist` sestaví webovou aplikaci OpenCAD, zkompiluje zdrojáky Electronu a zabalí
`release/` (AppImage a deb). Pokud chybí závislosti, spusť nejdřív `make install` a řekni
to uživateli. Pokud je v `release/` víc AppImage, vyber tu s verzí z `package.json`.

## KROK 4: Instalace

Nejdřív ověř, že starý soubor nedrží běžící instance - proces se jmenuje
`opencad-electron`, název spustitelného souboru, který electron-builder odvodí z `name`
v `package.json`; hledání podle názvu souboru přes `pgrep -f` by našlo shell, který
kontrolu spouští:

```bash
pgrep -x opencad-electron
```

Pokud běží, požádej uživatele, ať ji před instalací zavře. Potom:

```bash
mkdir -p ~/Applications ~/.local/share/applications ~/.local/share/icons/hicolor/512x512/apps
install -m 755 release/OpenCAD-<version>*.AppImage ~/Applications/OpenCAD.AppImage
install -m 644 submodule/opencad/packages/desktop/src-tauri/icons/icon.png \
  ~/.local/share/icons/hicolor/512x512/apps/opencad.png
```

Nainstalovaný soubor má **pevný název** bez verze, takže položka spouštěče i cokoliv, co
si uživatel připnul, funguje i po dalším nasazení.

Položku spouštěče zapiš jen tehdy, když chybí nebo ukazuje jinam:

```ini
# ~/.local/share/applications/opencad.desktop
[Desktop Entry]
Type=Application
Name=OpenCAD
Comment=OpenCAD desktop application
Exec=<home>/Applications/OpenCAD.AppImage %f
Icon=<home>/.local/share/icons/hicolor/512x512/apps/opencad.png
Terminal=false
Categories=Graphics;
StartupWMClass=OpenCAD
```

V `Exec` a `Icon` použij absolutní cestu k domovskému adresáři; položka spouštěče
neexpanduje `~`. `Icon` je záměrně cesta, a ne jméno z tématu `opencad`: běžící Plasma si
drží cache ikon z doby před instalací a pro jméno, které nezná, kreslí prázdný dokument,
v menu i na liště. Cesta se čte přímo ze souboru.

`StartupWMClass` je `OpenCAD`, protože `package.json` nemá `desktopName` a aplikace volá
`app.setName('OpenCAD')`. Pokud lišta ukazuje pro běžící okno samostatnou obecnou ikonu,
zjisti skutečnou třídu přes `xprop WM_CLASS` a položku oprav.

Pak obnov cache menu - `update-desktop-database` pro GNOME a ostatní, `kbuildsycoca6`
pro KDE, které tu první nečte:

```bash
update-desktop-database ~/.local/share/applications 2>/dev/null || true
command -v kbuildsycoca6 >/dev/null && kbuildsycoca6 >/dev/null 2>&1 || true
```

AppImage potřebuje ke spuštění FUSE. Pokud první spuštění selže s chybou FUSE, řekni
uživateli o `libfuse2`, místo rozbalování image.

## KROK 5: Shrnutí

Nahlas, co se skutečně stalo:

- Nasazená verze, commit a commit submodulu OpenCAD, a zda byl strom špinavý
- Kontroly: každá prošla, nebo která selhala
- Nainstalovaná cesta a zda byla položka spouštěče zapsána, ponechána, nebo přeskočena
  a proč
- Co musí uživatel udělat: znovu spustit OpenCAD

Přeskočený krok se hlásí jako přeskočený, nikdy jako nasazený.

## Návrat zpět

- Starší `release/OpenCAD-<version>*.AppImage`, pokud tam ještě je, nainstalovaná přes
  `~/Applications/OpenCAD.AppImage`
- Odebrání aplikace:
  `rm ~/Applications/OpenCAD.AppImage ~/.local/share/applications/opencad.desktop`
